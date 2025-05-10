import {Inject, Injectable, Optional} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, share, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TravelDTO, TravelInputDTO, mapToTravelDTO, mapToTravelDTOList } from '../models/dto/travel.dto';
import { CacheService } from './cache.service';
import {CacheConfig} from "../models/cache.model";
import {CACHE_SERVICE} from "../tokens/cache.token";
import {ICacheService} from "../interfaces/cache-service.interface";

@Injectable({
  providedIn: 'root'
})
export class TravelService {
  private readonly API_URL = environment.apiUrl + '/travels';
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: 10 * 60 * 1000, // 10 minutes en millisecondes
    storeName: 'travel_cache'
  };
  private readonly DETAILED_CACHE_CONFIG: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes en millisecondes (durée plus courte pour les données détaillées)
    storeName: 'travel_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService
  ) {
    // Nettoyer les entrées expirées au démarrage du service
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Récupère tous les voyages
   */
  getAllTravels(): Observable<TravelDTO[]> {
    const cacheKey = 'all_travels';

    return this.cacheService.get<TravelDTO[]>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO[]>(this.API_URL).pipe(
          map(data => mapToTravelDTOList(data)),
          switchMap(travels => this.cacheService.set(cacheKey, travels, this.CACHE_CONFIG)),
          share()
        );
      })
    );
  }

  /**
   * Récupère un voyage spécifique
   */
  getTravelById(id: number, includeDetails: boolean = false): Observable<TravelDTO> {
    const cacheKey = `travel_${id}_${includeDetails ? 'detailed' : 'basic'}`;
    const config = includeDetails ? this.DETAILED_CACHE_CONFIG : this.CACHE_CONFIG;

    return this.cacheService.get<TravelDTO>(cacheKey, config).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO>(`${this.API_URL}/${id}?includeDetails=${includeDetails}`).pipe(
          map(data => mapToTravelDTO(data)),
          switchMap(travel => this.cacheService.set(cacheKey, travel, config)),
          share()
        );
      })
    );
  }

  /**
   * Récupère les voyages de l'utilisateur connecté
   */
  getMyTravels(includeDetails: boolean = false): Observable<TravelDTO[]> {
    const cacheKey = `my_travels_${includeDetails ? 'detailed' : 'basic'}`;
    const config = includeDetails ? this.DETAILED_CACHE_CONFIG : this.CACHE_CONFIG;

    return this.cacheService.get<TravelDTO[]>(cacheKey, config).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO[]>(`${this.API_URL}/mine?includeDetails=${includeDetails}`).pipe(
          map(data => mapToTravelDTOList(data)),
          switchMap(travels => this.cacheService.set(cacheKey, travels, config)),
          share()
        );
      })
    );
  }

  /**
   * Crée un nouveau voyage
   */
  createTravel(travelData: any): Observable<TravelDTO> {
    return this.http.post<TravelInputDTO>(this.API_URL, travelData).pipe(
      map(data => mapToTravelDTO(data)),
      switchMap(newTravel => {
        // Invalider les caches de liste pour qu'ils soient rechargés
        this.invalidateListCaches();
        return of(newTravel);
      })
    );
  }

  /**
   * Met à jour un voyage existant
   */
  updateTravel(id: number, travelData: any): Observable<TravelDTO> {
    return this.http.put<TravelInputDTO>(`${this.API_URL}/${id}`, travelData).pipe(
      map(data => mapToTravelDTO(data)),
      switchMap(updatedTravel => {
        // Invalider les caches concernés
        this.invalidateTravelCache(id);
        this.invalidateListCaches();
        return of(updatedTravel);
      })
    );
  }

  /**
   * Supprime un voyage
   */
  deleteTravel(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`).pipe(
      switchMap(response => {
        // Invalider les caches concernés
        this.invalidateTravelCache(id);
        this.invalidateListCaches();
        return of(response);
      })
    );
  }

  /**
   * Invalide le cache pour un voyage spécifique
   */
  invalidateTravelCache(id: number): void {
    // Supprimer les versions basique et détaillée
    this.cacheService.remove(`travel_${id}_basic`, this.CACHE_CONFIG.storeName).subscribe();
    this.cacheService.remove(`travel_${id}_detailed`, this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Invalide les caches de listes de voyages
   */
  invalidateListCaches(): void {
    // Supprimer les caches de listes
    this.cacheService.remove('all_travels', this.CACHE_CONFIG.storeName).subscribe();
    this.cacheService.remove('my_travels_basic', this.CACHE_CONFIG.storeName).subscribe();
    this.cacheService.remove('my_travels_detailed', this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Invalide tout le cache
   */
  invalidateAllCache(): void {
    this.cacheService.clearStore(this.CACHE_CONFIG.storeName).subscribe();
  }
}
