import { Injectable } from '@angular/core';
import {Observable, of, switchMap} from 'rxjs';
import { CacheConfig, CacheEntry } from "../models/cache.model";
import { ICacheService } from '../interfaces/cache-service.interface';

/**
 * Service de cache pour le Server-Side Rendering (SSR)
 * Implémente un cache en mémoire à l'aide de Map
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

  constructor() {
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
   * Récupère une entrée du cache
   * @param key La clé de l'entrée
   * @param config Configuration du cache
   */
  get<T>(key: string, config: CacheConfig): Observable<T | null> {
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

        return of(entry.data);
      })
    );
  }

  /**
   * Stocke une entrée dans le cache
   * @param key La clé de l'entrée
   * @param data Les données à stocker
   * @param config Configuration du cache
   */
  set<T>(key: string, data: T, config: CacheConfig): Observable<T> {
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
