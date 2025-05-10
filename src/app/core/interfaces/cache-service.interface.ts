import { Observable } from 'rxjs';
import { CacheConfig } from '../models/cache.model';

/**
 * Interface pour les services de cache
 */
export interface ICacheService {
  /**
   * Récupère une entrée du cache
   * @param key La clé de l'entrée
   * @param config Configuration du cache
   */
  get<T>(key: string, config: CacheConfig): Observable<T | null>;

  /**
   * Stocke une entrée dans le cache
   * @param key La clé de l'entrée
   * @param data Les données à stocker
   * @param config Configuration du cache
   */
  set<T>(key: string, data: T, config: CacheConfig): Observable<T>;

  /**
   * Supprime une entrée du cache
   * @param key La clé de l'entrée à supprimer
   * @param storeName Le nom du store
   */
  remove(key: string, storeName: string): Observable<boolean>;

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
