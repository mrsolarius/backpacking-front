import { Provider } from '@angular/core';
import { WeatherService } from '../services/weather.service';
import { WEATHER_SERVICE } from '../tokens/weather.token';
import {GEOCODING_SERVICE} from "../tokens/geocoding.token";
import {GeocodingService} from "../services/geocoding.service";

export const GEOCODING_PROVIDERS: Provider[] = [
  { provide: GEOCODING_SERVICE, useClass: GeocodingService }
];
