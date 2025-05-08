import { InjectionToken } from '@angular/core';
import { IWeatherService } from '../interfaces/weather-service.interface';
import {IGeocodingService} from "../interfaces/geocoding-service.interface";

export const GEOCODING_SERVICE = new InjectionToken<IGeocodingService>('GeocodingService');
