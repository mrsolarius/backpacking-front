import {ApplicationConfig, isDevMode} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration} from '@angular/platform-browser';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideHttpClient, withFetch} from "@angular/common/http";
import {provideServiceWorker} from '@angular/service-worker';
import {WEATHER_PROVIDERS} from "./core/providers/weather.providers";
import {GEOCODING_PROVIDERS} from "./core/providers/geocoding.providers";
import {CACHE_PROVIDERS} from "./core/providers/cache.providers";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(), provideHttpClient(withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    ...CACHE_PROVIDERS,
    ...WEATHER_PROVIDERS,
    ...GEOCODING_PROVIDERS,
  ],
};
