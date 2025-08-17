import { Observable } from 'rxjs';
import { CacheConfig } from '../models/cache.model';

/**
 * Interface pour les services de cache avec support du TransferState
 */
export interface ICacheService {
  /**
   * Récupère une entrée du cache ou du transfer state (SSR)
   * @param key La clé de l'entrée
   * @param config Configuration du cache
   * @param transferKey Clé optionnelle pour le transfer state (SSR)
   */
  get<T>(key: string, config: CacheConfig, transferKey?: any): Observable<T | null>;

  /**
   * Stocke une entrée dans le cache et le transfer state (SSR)
   * @param key La clé de l'entrée
   * @param data Les données à stocker
   * @param config Configuration du cache
   * @param transferKey Clé optionnelle pour le transfer state (SSR)
   */
  set<T>(key: string, data: T, config: CacheConfig, transferKey?: any): Observable<T>;

  /**
   * Supprime une entrée du cache
   * @param key La clé de l'entrée à supprimer
   * @param storeName Le nom du store
   */
  remove(key: string, storeName: string): Observable<boolean>;

  /**
   * Supprime une entrée du cache et du transfer state
   * @param key La clé de l'entrée à supprimer
   * @param storeName Le nom du store
   * @param transferKey Clé optionnelle pour le transfer state
   */
  removeWithTransferState(key: string, storeName: string, transferKey?: any): Observable<boolean>;

  /**
   * Efface toutes les entrées d'un store
   * @param storeName Le nom du store à vider
   */
  clearStore(storeName: string): Observable<boolean>;

  /**
   * Efface toutes les entrées expirées d'un store
   * @param storeName Le nom du store à nettoyer
   */
  cleanExpiredEntries(storeName: string): Observable<number>;

  /**
   * Nettoie tous les stores en supprimant les entrées expirées
   */
  cleanAllExpiredEntries(): Observable<{ [storeName: string]: number }>;
}
