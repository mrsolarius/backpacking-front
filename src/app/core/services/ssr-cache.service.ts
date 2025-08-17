import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { CacheConfig, CacheEntry } from "../models/cache.model";
import { ICacheService } from '../interfaces/cache-service.interface';
import { TransferState } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {DateReviverHelper} from "../utils/date-reviver.helper";

/**
 * Service de cache pour le Server-Side Rendering (SSR)
 * Implémente un cache en mémoire à l'aide de Map avec support du TransferState
 */
@Injectable()
export class SsrCacheService implements ICacheService {
  // Map de stores : Map<storeName, Map<key, CacheEntry>>
  private stores: Map<string, Map<string, CacheEntry<any>>> = new Map();

  // Liste des stores par défaut
  private readonly defaultStores = [
    'weather_cache',
    'geocoding_cache',
    'gallery_cache',
    'travel_cache',
    'map_cache'
  ];

  constructor(
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialiser les stores par défaut
    this.initDefaultStores();
  }

  /**
   * Initialise les stores par défaut
   */
  private initDefaultStores(): void {
    this.defaultStores.forEach(storeName => {
      if (!this.stores.has(storeName)) {
        this.stores.set(storeName, new Map());
      }
    });
  }

  /**
   * Vérifie si un store existe et le crée si nécessaire
   */
  private ensureStoreExists(storeName: string): Observable<boolean> {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }
    return of(true);
  }

  /**
   * Récupère une entrée du cache ou du transfer state (SSR)
   * @param key La clé de l'entrée
   * @param config Configuration du cache
   * @param transferKey Clé optionnelle pour le transfer state (SSR)
   */
  get<T>(key: string, config: CacheConfig, transferKey?: any): Observable<T | null> {
    return this.ensureStoreExists(config.storeName).pipe(
      switchMap(() => {
        const store = this.stores.get(config.storeName);
        if (!store) return of(null);

        const entry = store.get(key) as CacheEntry<T> | undefined;
        if (!entry) return of(null);

        const now = Date.now();
        // Vérifier si l'entrée est expirée
        if (entry.expiresAt < now) {
          // Supprimer l'entrée expirée
          store.delete(key);
          return of(null);
        }

        // Reconvertir les dates si demandé
        const processedData = DateReviverHelper.reviveData(entry.data);
        return of(processedData);
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
    return this.ensureStoreExists(config.storeName).pipe(
      switchMap(() => {
        const now = Date.now();
        const expiresAt = now + config.ttl;

        const entry: CacheEntry<T> = {
          key,
          data,
          timestamp: now,
          expiresAt
        };

        const store = this.stores.get(config.storeName);
        if (store) {
          store.set(key, entry);
        }

        // Stocker dans le transfer state côté serveur
        if (transferKey && isPlatformServer(this.platformId)) {
          this.transferState.set(transferKey, data);
        }

        return of(data);
      })
    );
  }

  /**
   * Supprime une entrée du cache
   * @param key La clé de l'entrée à supprimer
   * @param storeName Le nom du store
   */
  remove(key: string, storeName: string): Observable<boolean> {
    const store = this.stores.get(storeName);
    if (!store) return of(false);

    const result = store.delete(key);
    return of(result);
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
    const store = this.stores.get(storeName);
    if (!store) return of(false);

    store.clear();
    return of(true);
  }

  /**
   * Efface toutes les entrées expirées d'un store
   * @param storeName Le nom du store à nettoyer
   */
  cleanExpiredEntries(storeName: string): Observable<number> {
    const store = this.stores.get(storeName);
    if (!store) return of(0);

    const now = Date.now();
    let deletedCount = 0;

    // Parcourir toutes les entrées et supprimer celles qui sont expirées
    store.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        store.delete(key);
        deletedCount++;
      }
    });

    return of(deletedCount);
  }

  /**
   * Nettoie tous les stores en supprimant les entrées expirées
   */
  cleanAllExpiredEntries(): Observable<{ [storeName: string]: number }> {
    const results: { [storeName: string]: number } = {};

    // Parcourir tous les stores
    this.stores.forEach((store, storeName) => {
      const now = Date.now();
      let deletedCount = 0;

      // Parcourir toutes les entrées et supprimer celles qui sont expirées
      store.forEach((entry, key) => {
        if (entry.expiresAt < now) {
          store.delete(key);
          deletedCount++;
        }
      });

      results[storeName] = deletedCount;
    });

    return of(results);
  }
}
