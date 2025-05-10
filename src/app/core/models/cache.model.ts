export interface CacheConfig {
  /** Durée de vie en millisecondes */
  ttl: number;
  /** Nom de la store dans IndexedDB */
  storeName: string;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}
