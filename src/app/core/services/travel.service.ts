import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, share, switchMap, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TravelDTO, TravelInputDTO, mapToTravelDTO, mapToTravelDTOList } from '../models/dto/travel.dto';
import { CacheConfig } from "../models/cache.model";
import { CACHE_SERVICE } from "../tokens/cache.token";
import { ICacheService } from "../interfaces/cache-service.interface";
import { TransferState, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';

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
    @Inject(CACHE_SERVICE) private cacheService: ICacheService,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  // Nouvelle méthode pour générer les clés de cache
  private getCacheKey(id: number, includeDetails: boolean): string {
    return `travel_${id}_${includeDetails ? 'detailed' : 'basic'}`;
  }

  // Nouvelle méthode pour générer les clés de transfer state
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

    // 1. Vérifier le transfer state (SSR)
    const stateData = this.transferState.get(transferKey, null);
    if (stateData) {
      return of(mapToTravelDTO(stateData as unknown as TravelInputDTO));
    }

    // 2. Vérifier le cache
    return this.cacheService.get<TravelDTO>(cacheKey, config).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // 3. Faire l'appel HTTP
        return this.http.get<TravelInputDTO>(`${this.API_URL}/${id}?includeDetails=${includeDetails}`).pipe(
          map(data => mapToTravelDTO(data)),
          tap(travel => {
            // Stocker dans le transfer state côté serveur
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(transferKey, travel);
            }
          }),
          switchMap(travel => this.cacheService.set(cacheKey, travel, config)),
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

    // 1. Vérifier le transfer state (SSR)
    const stateData = this.transferState.get(transferKey, null);
    if (stateData) {
      return of(mapToTravelDTOList(stateData as unknown as TravelInputDTO[]));
    }

    return this.cacheService.get<TravelDTO[]>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO[]>(this.API_URL).pipe(
          map(data => mapToTravelDTOList(data)),
          tap(travels => {
            // Stocker dans le transfer state côté serveur
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(transferKey, travels);
            }
          }),
          switchMap(travels => this.cacheService.set(cacheKey, travels, this.CACHE_CONFIG)),
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

    // 1. Vérifier le transfer state (SSR)
    const stateData = this.transferState.get(transferKey, null);
    if (stateData) {
      return of(stateData);
    }

    return this.cacheService.get<TravelDTO[]>(cacheKey, config).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<TravelInputDTO[]>(`${this.API_URL}/mine?includeDetails=${includeDetails}`).pipe(
          map(data => mapToTravelDTOList(data)),
          tap(travels => {
            // Stocker dans le transfer state côté serveur
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(transferKey, travels);
            }
          }),
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
    this.cacheService.remove(this.getCacheKey(id, false), this.CACHE_CONFIG.storeName).subscribe();
    this.cacheService.remove(this.getCacheKey(id, true), this.CACHE_CONFIG.storeName).subscribe();

    // Invalider le transfer state
    this.transferState.remove(this.getTransferKey(id, false));
    this.transferState.remove(this.getTransferKey(id, true));
  }

  /**
   * Invalide les caches de listes de voyages
   */
  invalidateListCaches(): void {
    // Supprimer les caches de listes
    const keys = [
      'all_travels',
      'my_travels_basic',
      'my_travels_detailed'
    ];

    keys.forEach(key => {
      this.cacheService.remove(key, this.CACHE_CONFIG.storeName).subscribe();
    });

    // Invalider le transfer state pour les listes
    this.transferState.remove(makeStateKey('all-travels'));
    this.transferState.remove(makeStateKey('my-travels-false'));
    this.transferState.remove(makeStateKey('my-travels-true'));
  }
}
