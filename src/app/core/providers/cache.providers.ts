import {Provider, TransferState} from '@angular/core';
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
    useFactory: (platformId: Object, transferState: TransferState) => {
      return isPlatformBrowser(platformId) ? new CacheService(transferState, platformId) : null;
    },
    deps: [PLATFORM_ID, TransferState]
  },
  // Service pour le serveur SEULEMENT
  {
    provide: SsrCacheService,
    useFactory: (platformId: Object, transferState: TransferState) => {
      return isPlatformServer(platformId) ? new SsrCacheService(transferState, platformId) : null;
    },
    deps: [PLATFORM_ID, TransferState]
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
