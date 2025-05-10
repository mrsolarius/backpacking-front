// src/app/core/services/weather.service.ts
import {Inject, Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { IWeatherService } from '../interfaces/weather-service.interface';
import { CurrentWeatherDTO, HistoricalWeatherResponse } from '../models/dto/weather.dto';
import { environment } from '../../../environments/environment';
import {CacheConfig} from "../models/cache.model";
import {CacheService} from "./cache.service";
import {CACHE_SERVICE} from "../tokens/cache.token";
import {ICacheService} from "../interfaces/cache-service.interface";

@Injectable({
  providedIn: 'root'
})
export class WeatherService implements IWeatherService {
  private readonly API_KEY = environment.weatherApiKey;
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: Infinity, // Les données météo historiques ne changent pas donc pas de TTL
    storeName: 'weather_cache'
  };
  private readonly CURRENT_CACHE_CONFIG: CacheConfig = {
    ttl: 30 * 60 * 1000, // 30 minutes en millisecondes
    storeName: 'weather_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService
  ) {
    // Nettoyer les entrées expirées au démarrage du service
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

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

    return this.cacheService.get<HistoricalWeatherResponse>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // Construire l'URL pour l'API OpenWeatherMap historique
        const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${this.API_KEY}&units=metric`;

        return this.http.get<HistoricalWeatherResponse>(url).pipe(
          switchMap(data => this.cacheService.set(cacheKey, data, this.CACHE_CONFIG)),
          catchError(error => {
            console.error('Erreur lors de la récupération des données météo historiques:', error);
            throw error;
          })
        );
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

    return this.cacheService.get<CurrentWeatherDTO>(cacheKey, this.CURRENT_CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;

        return this.http.get<CurrentWeatherDTO>(url).pipe(
          switchMap(data => this.cacheService.set(cacheKey, data, this.CURRENT_CACHE_CONFIG)),
          catchError(error => {
            console.error('Erreur lors de la récupération des données météo actuelles:', error);
            throw error;
          })
        );
      })
    );
  }

  /**
   * Invalide le cache pour une région spécifique
   * @param lat Latitude
   * @param lon Longitude
   */
  invalidateRegionCache(lat: number, lon: number): void {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLon = Math.round(lon * 1000) / 1000;

    // Supprimer l'entrée de la météo actuelle
    const currentCacheKey = `current_${roundedLat},${roundedLon}`;
    this.cacheService.remove(currentCacheKey, this.CACHE_CONFIG.storeName).subscribe();

    // Note: Les entrées historiques spécifiques ne sont pas invalidées car elles ne changent pas
  }

  /**
   * Invalide tout le cache météo
   */
  invalidateAllCache(): void {
    this.cacheService.clearStore(this.CACHE_CONFIG.storeName).subscribe();
  }
}
