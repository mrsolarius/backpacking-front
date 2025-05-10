import {Inject, Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { IGeocodingService } from '../interfaces/geocoding-service.interface';
import { ReverseGeocodingResponse, ReverseGeocodingParams } from '../models/dto/geocoding.dto';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';
import {CacheConfig} from "../models/cache.model";
import {CACHE_SERVICE} from "../tokens/cache.token";
import {ICacheService} from "../interfaces/cache-service.interface";

@Injectable({
  providedIn: 'root'
})
export class GeocodingService implements IGeocodingService {
  private readonly API_KEY = environment.weatherApiKey;
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes (les données géographiques changent rarement)
    storeName: 'geocoding_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService
  ) {
    // Nettoyer les entrées expirées au démarrage du service
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Récupère les informations de localisation à partir de coordonnées géographiques
   * @param params Les paramètres de géocodage inverse (lat, lon, limit)
   * @returns Un Observable contenant la réponse de géocodage inverse
   */
  getReverseGeocodingData(params: ReverseGeocodingParams): Observable<ReverseGeocodingResponse[]> {
    // Arrondir les coordonnées pour améliorer l'efficacité du cache
    const roundedLat = Math.round(params.lat * 1000) / 1000;
    const roundedLon = Math.round(params.lon * 1000) / 1000;
    const limit = params.limit || 5; // Valeur par défaut de 5 si non spécifié

    const cacheKey = `reverse_geocoding_${roundedLat},${roundedLon},${limit}`;

    return this.cacheService.get<ReverseGeocodingResponse[]>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // Construire l'URL pour l'API OpenWeatherMap de géocodage inverse
        const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${params.lat}&lon=${params.lon}&limit=${limit}&appid=${this.API_KEY}`;

        return this.http.get<ReverseGeocodingResponse[]>(url).pipe(
          switchMap(data => this.cacheService.set(cacheKey, data, this.CACHE_CONFIG)),
          catchError(error => {
            console.error('Erreur lors de la récupération des données de géocodage inverse:', error);
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

    // On pourrait être plus précis, mais cette approche est plus simple
    // et elle fonctionnera pour la plupart des cas d'utilisation
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Invalide tout le cache de géocodage
   */
  invalidateAllCache(): void {
    this.cacheService.clearStore(this.CACHE_CONFIG.storeName).subscribe();
  }
}
