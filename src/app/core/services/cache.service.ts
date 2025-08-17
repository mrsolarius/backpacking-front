import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { CacheConfig, CacheEntry } from "../models/cache.model";
import { ICacheService } from '../interfaces/cache-service.interface';
import { TransferState } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {DateReviverHelper} from "../utils/date-reviver.helper";

@Injectable()
export class CacheService implements ICacheService {
  private readonly DB_NAME = 'app_cache';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor(
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.dbReady = this.initDatabase();
  }

  /**
   * Initialise la base de données IndexedDB
   */
  private initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Création des objectStores par défaut
        this.createDefaultStores(db);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Erreur lors de l\'ouverture de la base de données IndexedDB:', event);
        reject('Impossible d\'ouvrir la base de données IndexedDB');
      };
    });
  }

  /**
   * Crée les objectStores par défaut dans la base de données
   */
  private createDefaultStores(db: IDBDatabase): void {
    // Stores par défaut pour les différents types de données
    const defaultStores = [
      'weather_cache',
      'geocoding_cache',
      'gallery_cache',
      'travel_cache',
      'map_cache'
    ];

    defaultStores.forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        // Crée un objectStore avec une clé primaire 'key'
        db.createObjectStore(storeName, { keyPath: 'key' });
      }
    });
  }

  /**
   * Vérifie si un objectStore existe et le crée si nécessaire
   */
  private ensureStoreExists(storeName: string): Observable<boolean> {
    return from(this.dbReady).pipe(
      switchMap(db => {
        if (!db.objectStoreNames.contains(storeName)) {
          // Ferme la connexion actuelle
          db.close();

          // Incrémente la version et rouvre la base de données
          const newVersion = db.version + 1;
          const request = indexedDB.open(this.DB_NAME, newVersion);

          return new Observable<boolean>(observer => {
            request.onupgradeneeded = (event) => {
              const upgradedDb = (event.target as IDBOpenDBRequest).result;
              upgradedDb.createObjectStore(storeName, { keyPath: 'key' });
            };

            request.onsuccess = (event) => {
              this.db = (event.target as IDBOpenDBRequest).result;
              observer.next(true);
              observer.complete();
            };

            request.onerror = (event) => {
              console.error(`Erreur lors de la création du store ${storeName}:`, event);
              observer.error(`Impossible de créer le store ${storeName}`);
            };
          });
        }

        return of(true);
      })
    );
  }

  /**
   * Récupère une entrée du cache ou du transfer state (SSR)
   * @param key La clé de l'entrée
   * @param config Configuration du cache
   * @param transferKey Clé optionnelle pour le transfer state (SSR)
   */
  get<T>(key: string, config: CacheConfig, transferKey?: any): Observable<T | null> {
    // 1. Vérifier le transfer state d'abord (côté client uniquement)
    if (transferKey && !isPlatformServer(this.platformId)) {
      const stateData = this.transferState.get(transferKey, null);
      if (stateData) {
        // Supprimer du transfer state après utilisation pour éviter la duplication
        this.transferState.remove(transferKey);
        const processedData = DateReviverHelper.reviveData(stateData);
        return of(processedData);
      }
    }

    // 2. Vérifier le cache IndexedDB
    return from(this.dbReady).pipe(
      switchMap(db => {
        return this.ensureStoreExists(config.storeName).pipe(
          switchMap(() => {
            return new Observable<CacheEntry<T> | null>(observer => {
              const transaction = db.transaction(config.storeName, 'readonly');
              const store = transaction.objectStore(config.storeName);
              const request = store.get(key);

              request.onsuccess = () => {
                const entry = request.result as CacheEntry<T> | undefined;
                observer.next(entry || null);
                observer.complete();
              };

              request.onerror = (event) => {
                console.error(`Erreur lors de la récupération de la clé ${key}:`, event);
                observer.error(`Impossible de récupérer la clé ${key}`);
              };
            });
          })
        );
      }),
      map(entry => {
        if (!entry) return null;

        const now = Date.now();
        // Vérifier si l'entrée est expirée
        if (entry.expiresAt < now) {
          // Supprimer l'entrée expirée de manière asynchrone
          this.remove(key, config.storeName).subscribe();
          return null;
        }

        return entry.data;
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération depuis le cache:', error);
        return of(null);
      })
    );
  }

  /**
   * Stocke une entrée dans le cache et le transfer state (SSR)
   * @param key La clé de l'entrée
   * @param data Les données à stocker
   * @param config Configuration du cache
   * @param transferKey Clé optionnelle pour le transfer state (SSR)
   */
  set<T>(key: string, data: T, config: CacheConfig, transferKey?: any): Observable<T> {
    const now = Date.now();
    const expiresAt = now + config.ttl;

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      expiresAt
    };

    return from(this.dbReady).pipe(
      switchMap(db => {
        return this.ensureStoreExists(config.storeName).pipe(
          switchMap(() => {
            return new Observable<T>(observer => {
              const transaction = db.transaction(config.storeName, 'readwrite');
              const store = transaction.objectStore(config.storeName);
              const request = store.put(entry);

              request.onsuccess = () => {
                // Stocker dans le transfer state côté serveur
                if (transferKey && isPlatformServer(this.platformId)) {
                  this.transferState.set(transferKey, data);
                }

                observer.next(data);
                observer.complete();
              };

              request.onerror = (event) => {
                console.error(`Erreur lors du stockage de la clé ${key}:`, event);
                observer.error(`Impossible de stocker la clé ${key}`);
              };
            });
          })
        );
      }),
      catchError(error => {
        console.error('Erreur lors du stockage dans le cache:', error);
        return of(data); // En cas d'erreur, on retourne quand même les données
      })
    );
  }

  /**
   * Supprime une entrée du cache
   * @param key La clé de l'entrée à supprimer
   * @param storeName Le nom du store
   */
  remove(key: string, storeName: string): Observable<boolean> {
    return from(this.dbReady).pipe(
      switchMap(db => {
        if (!db.objectStoreNames.contains(storeName)) {
          return of(false);
        }

        return new Observable<boolean>(observer => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);

          request.onsuccess = () => {
            observer.next(true);
            observer.complete();
          };

          request.onerror = (event) => {
            console.error(`Erreur lors de la suppression de la clé ${key}:`, event);
            observer.error(`Impossible de supprimer la clé ${key}`);
          };
        });
      }),
      catchError(error => {
        console.error('Erreur lors de la suppression du cache:', error);
        return of(false);
      })
    );
  }

  /**
   * Supprime une entrée du cache et du transfer state
   * @param key La clé de l'entrée à supprimer
   * @param storeName Le nom du store
   * @param transferKey Clé optionnelle pour le transfer state
   */
  removeWithTransferState(key: string, storeName: string, transferKey?: any): Observable<boolean> {
    // Supprimer du transfer state si fourni
    if (transferKey) {
      this.transferState.remove(transferKey);
    }

    // Supprimer du cache
    return this.remove(key, storeName);
  }

  /**
   * Efface toutes les entrées d'un store
   * @param storeName Le nom du store à vider
   */
  clearStore(storeName: string): Observable<boolean> {
    return from(this.dbReady).pipe(
      switchMap(db => {
        if (!db.objectStoreNames.contains(storeName)) {
          return of(false);
        }

        return new Observable<boolean>(observer => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => {
            observer.next(true);
            observer.complete();
          };

          request.onerror = (event) => {
            console.error(`Erreur lors du vidage du store ${storeName}:`, event);
            observer.error(`Impossible de vider le store ${storeName}`);
          };
        });
      }),
      catchError(error => {
        console.error('Erreur lors du vidage du cache:', error);
        return of(false);
      })
    );
  }

  /**
   * Efface toutes les entrées expirées d'un store
   * @param storeName Le nom du store à nettoyer
   */
  cleanExpiredEntries(storeName: string): Observable<number> {
    return from(this.dbReady).pipe(
      switchMap(db => {
        if (!db.objectStoreNames.contains(storeName)) {
          return of(0);
        }

        return new Observable<number>(observer => {
          const now = Date.now();
          let deletedCount = 0;

          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.openCursor();

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

            if (cursor) {
              const entry = cursor.value as CacheEntry<any>;

              if (entry.expiresAt < now) {
                // Supprimer l'entrée expirée
                const deleteRequest = cursor.delete();
                deleteRequest.onsuccess = () => {
                  deletedCount++;
                };
              }

              cursor.continue();
            } else {
              // Toutes les entrées ont été parcourues
              observer.next(deletedCount);
              observer.complete();
            }
          };

          request.onerror = (event) => {
            console.error(`Erreur lors du nettoyage du store ${storeName}:`, event);
            observer.error(`Impossible de nettoyer le store ${storeName}`);
          };
        });
      }),
      catchError(error => {
        console.error('Erreur lors du nettoyage du cache:', error);
        return of(0);
      })
    );
  }

  /**
   * Nettoie tous les stores en supprimant les entrées expirées
   */
  cleanAllExpiredEntries(): Observable<{ [storeName: string]: number }> {
    return from(this.dbReady).pipe(
      switchMap(db => {
        const storeNames = Array.from(db.objectStoreNames);
        const results: { [storeName: string]: number } = {};

        // Fonction récursive pour traiter chaque store séquentiellement
        const processStore = (index: number): Observable<{ [storeName: string]: number }> => {
          if (index >= storeNames.length) {
            return of(results);
          }

          const storeName = storeNames[index];
          return this.cleanExpiredEntries(storeName).pipe(
            tap(count => {
              results[storeName] = count;
            }),
            switchMap(() => processStore(index + 1))
          );
        };

        return processStore(0);
      }),
      catchError(error => {
        console.error('Erreur lors du nettoyage de tous les caches:', error);
        return of({});
      })
    );
  }
}
