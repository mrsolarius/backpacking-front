import { Provider } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { CACHE_SERVICE } from '../tokens/cache.token';
import { CacheService } from '../services/cache.service';
import { SsrCacheService } from '../services/ssr-cache.service';

/**
 * Fournit les providers pour les services de cache en fonction de la plateforme (browser ou server)
 */
export const CACHE_PROVIDERS: Provider[] = [
  // Service pour le navigateur SEULEMENT
  {
    provide: CacheService,
    useFactory: (platformId: Object) => {
      return isPlatformBrowser(platformId) ? new CacheService() : null;
    },
    deps: [PLATFORM_ID]
  },
  // Service pour le serveur SEULEMENT
  {
    provide: SsrCacheService,
    useFactory: (platformId: Object) => {
      return isPlatformServer(platformId) ? new SsrCacheService() : null;
    },
    deps: [PLATFORM_ID]
  },
  // Factory pour le token CACHE_SERVICE
  {
    provide: CACHE_SERVICE,
    useFactory: (platformId: Object, browserService: CacheService, serverService: SsrCacheService) => {
      return isPlatformBrowser(platformId) ? browserService : serverService;
    },
    deps: [PLATFORM_ID, CacheService, SsrCacheService]
  }
];
