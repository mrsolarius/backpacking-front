import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IGeocodingService } from '../interfaces/geocoding-service.interface';
import { ReverseGeocodingResponse, ReverseGeocodingParams } from '../models/dto/geocoding.dto';
import { environment } from '../../../environments/environment';

interface GeocodingCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService implements IGeocodingService {
  private readonly API_KEY = environment.weatherApiKey || '102011f938be0f23a8dd32e9073a96ca';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes (les données géographiques changent rarement)
  private geocodingCache: GeocodingCache = {};

  constructor(private http: HttpClient) {}

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
    const now = Date.now();

    // Vérifier si nous avons des données en cache valides
    if (this.geocodingCache[cacheKey] &&
      (now - this.geocodingCache[cacheKey].timestamp) < this.CACHE_DURATION) {
      return of(this.geocodingCache[cacheKey].data);
    }

    // Construire l'URL pour l'API OpenWeatherMap de géocodage inverse
    const url = `http://api.openweathermap.org/geo/1.0/reverse?lat=${params.lat}&lon=${params.lon}&limit=${limit}&appid=${this.API_KEY}`;

    return this.http.get<ReverseGeocodingResponse[]>(url).pipe(
      tap(data => {
        // Stocker les résultats dans le cache
        this.geocodingCache[cacheKey] = {
          data,
          timestamp: now
        };
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des données de géocodage inverse:', error);
        throw error;
      })
    );
  }
}
