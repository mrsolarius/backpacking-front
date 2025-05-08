import { Provider } from '@angular/core';
import { WeatherService } from '../services/weather.service';
import { WEATHER_SERVICE } from '../tokens/weather.token';

export const WEATHER_PROVIDERS: Provider[] = [
  { provide: WEATHER_SERVICE, useClass: WeatherService }
];
