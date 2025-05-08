import { InjectionToken } from '@angular/core';
import { IWeatherService } from '../interfaces/weather-service.interface';

export const WEATHER_SERVICE = new InjectionToken<IWeatherService>('WeatherService');
