// src/app/core/services/map-data.service.ts
import {Inject, Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CoordinateDto, CoordinateObjsDTO } from '../models/dto/coordinate.dto';
import { map, Observable, share, switchMap, of } from 'rxjs';
import {CacheConfig} from "../models/cache.model";
import {CACHE_SERVICE} from "../tokens/cache.token";
import {ICacheService} from "../interfaces/cache-service.interface";

@Injectable({
  providedIn: 'root',
})
export class MapDataService {
  private readonly API_URL = `${environment.apiUrl}/travels/`;
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: 15 * 60 * 1000, // 15 minutes en millisecondes
    storeName: 'map_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService
  ) {
    // Nettoyer les entrées expirées au démarrage du service
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Récupère les coordonnées d'un voyage spécifique
   */
  public getCoordinatesByTravelId(travelId: number): Observable<CoordinateDto[]> {
    const cacheKey = `travel_coordinates_${travelId}`;

    return this.cacheService.get<CoordinateDto[]>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<CoordinateObjsDTO[]>(`${this.API_URL}${travelId}/coordinates`).pipe(
          map(data => data.map((c) => ({
            ...c,
            latitude: parseFloat(c.latitude),
            longitude: parseFloat(c.longitude),
            date: new Date(c.date)
          } as CoordinateDto))),
          map(data => data.sort((a, b) => a.date.getTime() - b.date.getTime())),
          switchMap(coordinates => this.cacheService.set(cacheKey, coordinates, this.CACHE_CONFIG)),
          share()
        );
      })
    );
  }

  /**
   * Ajoute une nouvelle coordonnée à un voyage
   * @param travelId ID du voyage
   * @param coordinate Données de la coordonnée à ajouter
   */
  public addCoordinate(travelId: number, coordinate: Partial<CoordinateDto>): Observable<CoordinateDto> {
    return this.http.post<CoordinateObjsDTO>(`${this.API_URL}${travelId}/coordinates`, coordinate).pipe(
      map(c => ({
        ...c,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        date: new Date(c.date)
      } as CoordinateDto)),
      switchMap(newCoordinate => {
        // Mettre à jour le cache
        this.updateCacheWithNewCoordinate(travelId, newCoordinate);
        return of(newCoordinate);
      })
    );
  }

  /**
   * Supprime une coordonnée d'un voyage
   * @param travelId ID du voyage
   * @param coordinateId ID de la coordonnée à supprimer
   */
  public deleteCoordinate(travelId: number, coordinateId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}${travelId}/coordinates/${coordinateId}`).pipe(
      switchMap(response => {
        // Mettre à jour le cache
        this.removeCoordinateFromCache(travelId, coordinateId);
        return of(response);
      })
    );
  }

  /**
   * Invalide le cache pour un voyage spécifique
   */
  public invalidateCache(travelId: number): void {
    this.cacheService.remove(`travel_coordinates_${travelId}`, this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Invalide tout le cache
   */
  public invalidateAllCache(): void {
    this.cacheService.clearStore(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Met à jour le cache avec une nouvelle coordonnée
   */
  private updateCacheWithNewCoordinate(travelId: number, newCoordinate: CoordinateDto): void {
    const cacheKey = `travel_coordinates_${travelId}`;

    this.cacheService.get<CoordinateDto[]>(cacheKey, this.CACHE_CONFIG).subscribe(cachedData => {
      if (cachedData) {
        // Ajouter la nouvelle coordonnée et trier à nouveau
        const updatedData = [...cachedData, newCoordinate].sort(
          (a, b) => a.date.getTime() - b.date.getTime()
        );

        this.cacheService.set(cacheKey, updatedData, this.CACHE_CONFIG).subscribe();
      }
    });
  }

  /**
   * Supprime une coordonnée du cache
   */
  private removeCoordinateFromCache(travelId: number, coordinateId: number): void {
    const cacheKey = `travel_coordinates_${travelId}`;

    this.cacheService.get<CoordinateDto[]>(cacheKey, this.CACHE_CONFIG).subscribe(cachedData => {
      if (cachedData) {
        const updatedData = cachedData.filter(c => c.id !== coordinateId);
        this.cacheService.set(cacheKey, updatedData, this.CACHE_CONFIG).subscribe();
      }
    });
  }
}
