import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { environment } from '../../../environments/environment';

const normalizeApiBaseUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const resolveApiBaseUrl = (): string => {
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) {
    return normalizeApiBaseUrl(environment.ssrApiUrl ?? environment.baseApi);
  }

  if (isPlatformBrowser(platformId)) {
    return normalizeApiBaseUrl(environment.baseApi);
  }

  return normalizeApiBaseUrl(environment.baseApi);
};

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: resolveApiBaseUrl,
});
