import { InjectionToken } from '@angular/core';
import { ICacheService } from '../interfaces/cache-service.interface';

export const CACHE_SERVICE = new InjectionToken<ICacheService>('CacheService');
