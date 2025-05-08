import {ApplicationConfig, isDevMode} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration} from '@angular/platform-browser';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideHttpClient} from "@angular/common/http";
import {provideServiceWorker} from '@angular/service-worker';
import {WEATHER_PROVIDERS} from "./core/providers/weather.providers";
import {GEOCODING_PROVIDERS} from "./core/providers/geocoding.providers";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(), provideHttpClient(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })],
    ...WEATHER_PROVIDERS,
    ...GEOCODING_PROVIDERS,
};
