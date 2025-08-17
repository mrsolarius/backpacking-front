import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, share, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TravelDTO, TravelInputDTO, mapToTravelDTO, mapToTravelDTOList } from '../models/dto/travel.dto';
import { CacheConfig } from "../models/cache.model";
import { CACHE_SERVICE } from "../tokens/cache.token";
import { ICacheService } from "../interfaces/cache-service.interface";
import { TransferState, makeStateKey } from '@angular/core';
import { Inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TravelService {
  private readonly API_URL = environment.apiUrl + '/travels';
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: 10 * 60 * 1000, // 10 minutes
    storeName: 'travel_cache'
  };
  private readonly DETAILED_CACHE_CONFIG: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    storeName: 'travel_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService
  ) {
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  // Méthodes pour générer les clés de cache
  private getCacheKey(id: number, includeDetails: boolean): string {
    return `travel_${id}_${includeDetails ? 'detailed' : 'basic'}`;
  }

  // Méthodes pour générer les clés de transfer state
  private getTransferKey(id: number, includeDetails: boolean): any {
    return makeStateKey<TravelDTO>(`travel-${id}-${includeDetails}`);
  }

  /**
   * Récupère un voyage spécifique avec gestion SSR
   */
  getTravelById(id: number, includeDetails: boolean = false): Observable<TravelDTO> {
    const cacheKey = this.getCacheKey(id, includeDetails);
    const transferKey = this.getTransferKey(id, includeDetails);
    const config = includeDetails ? this.DETAILED_CACHE_CONFIG : this.CACHE_CONFIG;

    // Utiliser le cache service qui gère automatiquement le transfer state
    return this.cacheService.get<TravelDTO>(cacheKey, config, transferKey).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // Faire l'appel HTTP
        return this.http.get<TravelInputDTO>(`${this.API_URL}/${id}?includeDetails=${includeDetails}`).pipe(
          map(data => mapToTravelDTO(data)),
          switchMap(travel => this.cacheService.set(cacheKey, travel, config, transferKey)),
          share()
        );
      })
    );
  }

  /**
   * Récupère tous les voyages avec gestion SSR
   */
  getAllTravels(): Observable<TravelDTO[]> {
    const cacheKey = 'all_travels';
    const transferKey = makeStateKey<TravelDTO[]>('all-travels');

    // Utiliser le cache service qui gère automatiquement le transfer state
    return this.cacheService.get<TravelDTO[]>(cacheKey, this.CACHE_CONFIG, transferKey).pipe(
      switchMap(cachedData => {

        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO[]>(this.API_URL).pipe(
          map(data => mapToTravelDTOList(data)),
          switchMap(travels => this.cacheService.set(cacheKey, travels, this.CACHE_CONFIG, transferKey)),
          share()
        );
      })
    );
  }

  /**
   * Récupère les voyages de l'utilisateur avec gestion SSR
   */
  getMyTravels(includeDetails: boolean = false): Observable<TravelDTO[]> {
    const cacheKey = `my_travels_${includeDetails ? 'detailed' : 'basic'}`;
    const transferKey = makeStateKey<TravelDTO[]>(`my-travels-${includeDetails}`);
    const config = includeDetails ? this.DETAILED_CACHE_CONFIG : this.CACHE_CONFIG;

    // Utiliser le cache service qui gère automatiquement le transfer state
    return this.cacheService.get<TravelDTO[]>(cacheKey, config, transferKey).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO[]>(`${this.API_URL}/mine?includeDetails=${includeDetails}`).pipe(
          map(data => mapToTravelDTOList(data)),
          switchMap(travels => this.cacheService.set(cacheKey, travels, config, transferKey)),
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
    // Supprimer les versions basique et détaillée avec transfer state
    const basicTransferKey = this.getTransferKey(id, false);
    const detailedTransferKey = this.getTransferKey(id, true);

    this.cacheService.removeWithTransferState(
      this.getCacheKey(id, false),
      this.CACHE_CONFIG.storeName,
      basicTransferKey
    ).subscribe();

    this.cacheService.removeWithTransferState(
      this.getCacheKey(id, true),
      this.CACHE_CONFIG.storeName,
      detailedTransferKey
    ).subscribe();
  }

  /**
   * Invalide les caches de listes de voyages
   */
  invalidateListCaches(): void {
    // Définir les clés de cache et transfer state pour les listes
    const cacheKeys = [
      { key: 'all_travels', transferKey: makeStateKey('all-travels') },
      { key: 'my_travels_basic', transferKey: makeStateKey('my-travels-false') },
      { key: 'my_travels_detailed', transferKey: makeStateKey('my-travels-true') }
    ];

    // Supprimer chaque cache avec son transfer state
    cacheKeys.forEach(({ key, transferKey }) => {
      this.cacheService.removeWithTransferState(
        key,
        this.CACHE_CONFIG.storeName,
        transferKey
      ).subscribe();
    });
  }
}
