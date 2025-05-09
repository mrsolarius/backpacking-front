// src/app/core/services/weather.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IWeatherService } from '../interfaces/weather-service.interface';
import { CurrentWeatherDTO, HistoricalWeatherResponse } from '../models/dto/weather.dto';
import { environment } from '../../../environments/environment';

interface WeatherCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService implements IWeatherService {
  private readonly API_KEY = environment.weatherApiKey;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
  private readonly CURRENT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes en millisecondes
  private weatherCache: WeatherCache = {};

  constructor(private http: HttpClient) {}

  /**
   * Récupère les données météo historiques pour une date spécifique
   */
  getHistoricalWeatherData(lat: number, lon: number, date: Date): Observable<HistoricalWeatherResponse> {
    // Arrondir les coordonnées pour améliorer l'efficacité du cache
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLon = Math.round(lon * 1000) / 1000;

    // Convertir la date en timestamp Unix (secondes depuis le 1er janvier 1970)
    const timestamp = Math.floor(date.getTime() / 1000);

    const cacheKey = `historical_${roundedLat},${roundedLon},${timestamp}`;
    const now = Date.now();

    // Vérifier si nous avons des données en cache valides
    if (this.weatherCache[cacheKey] &&
      (now - this.weatherCache[cacheKey].timestamp) < this.CACHE_DURATION) {
      return of(this.weatherCache[cacheKey].data);
    }

    // Construire l'URL pour l'API OpenWeatherMap historique
    const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${this.API_KEY}&units=metric`;

    return this.http.get<HistoricalWeatherResponse>(url).pipe(
      tap(data => {
        // Stocker les résultats dans le cache
        this.weatherCache[cacheKey] = {
          data,
          timestamp: now
        };
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des données météo historiques:', error);
        throw error;
      })
    );
  }

  /**
   * Récupère les données météo actuelles
   */
  getCurrentWeatherData(lat: number, lon: number): Observable<CurrentWeatherDTO> {
    // Arrondir les coordonnées pour améliorer l'efficacité du cache
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLon = Math.round(lon * 1000) / 1000;
    const cacheKey = `current_${roundedLat},${roundedLon}`;
    const now = Date.now();

    // Vérifier si nous avons des données en cache valides
    if (this.weatherCache[cacheKey] &&
      (now - this.weatherCache[cacheKey].timestamp) < this.CURRENT_CACHE_DURATION) {
      return of(this.weatherCache[cacheKey].data);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;

    return this.http.get<CurrentWeatherDTO>(url).pipe(
      tap(data => {
        // Stocker les résultats dans le cache
        this.weatherCache[cacheKey] = {
          data,
          timestamp: now
        };
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des données météo actuelles:', error);
        throw error;
      })
    );
  }
}
