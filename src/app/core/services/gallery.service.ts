import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, retry, share, throwError, switchMap, of, tap } from 'rxjs';
import {
  PictureCoordinateDTO,
  PictureCoordinateInputDTO,
  mapToPictureCoordinateDTO
} from '../models/dto/images.dto';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';
import { CacheConfig } from "../models/cache.model";
import { ICacheService } from "../interfaces/cache-service.interface";
import { CACHE_SERVICE } from "../tokens/cache.token";
import { TransferState, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private readonly API_URL = `${environment.apiUrl}/travels/`;
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    storeName: 'gallery_cache'
  };
  private readonly INDIVIDUAL_CACHE_CONFIG: CacheConfig = {
    ttl: 10 * 60 * 1000, // 10 minutes pour les photos individuelles
    storeName: 'gallery_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Nettoyer les entrées expirées au démarrage du service
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  // Méthodes pour générer les clés de cache
  private getPicturesCacheKey(travelId: number): string {
    return `travel_pictures_${travelId}`;
  }

  private getPictureCacheKey(travelId: number, pictureId: number): string {
    return `travel_picture_${travelId}_${pictureId}`;
  }

  // Méthodes pour générer les clés de transfer state
  private getPicturesTransferKey(travelId: number): any {
    return makeStateKey<PictureCoordinateDTO[]>(`travel-pictures-${travelId}`);
  }

  private getPictureTransferKey(travelId: number, pictureId: number): any {
    return makeStateKey<PictureCoordinateDTO>(`travel-picture-${travelId}-${pictureId}`);
  }

  /**
   * Récupère les photos d'un voyage spécifique avec gestion SSR
   * Implémente la mise en cache et la gestion d'erreurs
   */
  getPicturesByTravelId(travelId: number): Observable<PictureCoordinateDTO[]> {
    const cacheKey = this.getPicturesCacheKey(travelId);
    const transferKey = this.getPicturesTransferKey(travelId);

    // 1. Vérifier le transfer state (SSR)
    const stateData = this.transferState.get(transferKey, null);
    if (stateData) {
      return of(mapToPictureCoordinateDTO(stateData as unknown as PictureCoordinateInputDTO[]));
    }

    // 2. Vérifier le cache
    return this.cacheService.get<PictureCoordinateDTO[]>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // 3. Faire l'appel HTTP
        return this.http.get<PictureCoordinateInputDTO[]>(`${this.API_URL}${travelId}/pictures`).pipe(
          retry(1), // Réessayer une fois en cas d'échec
          map(data => {
            const pictures = mapToPictureCoordinateDTO(data);
            // Trier par date (du plus récent au plus ancien)
            return pictures.sort((a, b) => b.date.getTime() - a.date.getTime());
          }),
          tap(pictures => {
            // Stocker dans le transfer state côté serveur
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(transferKey, pictures);
            }
          }),
          switchMap(pictures => this.cacheService.set(cacheKey, pictures, this.CACHE_CONFIG)),
          catchError(this.handleError),
          share() // Partager la réponse entre plusieurs abonnés
        );
      })
    );
  }

  /**
   * Récupère une photo spécifique d'un voyage avec gestion SSR
   */
  getPictureById(travelId: number, pictureId: number): Observable<PictureCoordinateDTO> {
    const cacheKey = this.getPictureCacheKey(travelId, pictureId);
    const transferKey = this.getPictureTransferKey(travelId, pictureId);

    // 1. Vérifier le transfer state (SSR)
    const stateData = this.transferState.get(transferKey, null);
    if (stateData) {
      return of(mapToPictureCoordinateDTO([stateData as unknown as PictureCoordinateInputDTO])[0]);
    }

    // 2. Vérifier le cache
    return this.cacheService.get<PictureCoordinateDTO>(cacheKey, this.INDIVIDUAL_CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // 3. D'abord, essayer de trouver dans le cache des photos du voyage
        return this.cacheService.get<PictureCoordinateDTO[]>(this.getPicturesCacheKey(travelId), this.CACHE_CONFIG).pipe(
          switchMap(cachedPictures => {
            if (cachedPictures) {
              const picture = cachedPictures.find(p => p.id === pictureId);
              if (picture) {
                // Stocker dans le transfer state côté serveur
                if (isPlatformServer(this.platformId)) {
                  this.transferState.set(transferKey, picture);
                }
                // Mettre en cache cette photo individuelle
                return this.cacheService.set(cacheKey, picture, this.INDIVIDUAL_CACHE_CONFIG);
              }
            }

            // 4. Si non trouvé dans le cache, faire l'appel API
            return this.http.get<PictureCoordinateInputDTO>(`${this.API_URL}${travelId}/pictures/${pictureId}`).pipe(
              map(data => mapToPictureCoordinateDTO([data])[0]),
              tap(picture => {
                // Stocker dans le transfer state côté serveur
                if (isPlatformServer(this.platformId)) {
                  this.transferState.set(transferKey, picture);
                }
              }),
              switchMap(picture => this.cacheService.set(cacheKey, picture, this.INDIVIDUAL_CACHE_CONFIG)),
              catchError(this.handleError)
            );
          })
        );
      })
    );
  }

  /**
   * Ajoute une photo à un voyage
   */
  addPictureToTravel(travelId: number, formData: FormData): Observable<PictureCoordinateDTO> {
    return this.http.post<PictureCoordinateInputDTO>(`${this.API_URL}${travelId}/pictures`, formData).pipe(
      map(data => mapToPictureCoordinateDTO([data])[0]),
      switchMap(newPicture => {
        // Invalider et mettre à jour les caches
        this.updateCacheWithNewPicture(travelId, newPicture);
        this.invalidatePicturesTransferState(travelId);

        return of(newPicture);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime une photo d'un voyage
   */
  deletePicture(travelId: number, pictureId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}${travelId}/pictures/${pictureId}`).pipe(
      switchMap(response => {
        // Supprimer la photo du cache et transfer state
        this.invalidatePictureCache(travelId, pictureId);
        this.removePictureFromCache(travelId, pictureId);

        return of(response);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Définit une photo comme couverture du voyage
   */
  setCoverPicture(travelId: number, pictureId: number): Observable<any> {
    return this.http.post(`${this.API_URL}${travelId}/pictures/${pictureId}/set-as-cover`, {}).pipe(
      switchMap(response => {
        // Invalider les caches car l'état "cover" a pu changer
        this.invalidateTravelPicturesCache(travelId);
        return of(response);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Invalide le cache pour un voyage spécifique
   */
  invalidateTravelPicturesCache(travelId: number): void {
    // Supprimer le cache des photos du voyage
    this.cacheService.remove(this.getPicturesCacheKey(travelId), this.CACHE_CONFIG.storeName).subscribe();

    // Invalider le transfer state
    this.invalidatePicturesTransferState(travelId);

    // Note: Pour une implémentation plus avancée, nous pourrions supprimer
    // toutes les photos individuelles du cache, mais cela nécessiterait
    // une méthode de cache qui supporte les patterns
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Invalide le cache d'une photo spécifique
   */
  invalidatePictureCache(travelId: number, pictureId: number): void {
    // Supprimer la photo individuelle du cache
    this.cacheService.remove(this.getPictureCacheKey(travelId, pictureId), this.CACHE_CONFIG.storeName).subscribe();

    // Invalider le transfer state
    this.transferState.remove(this.getPictureTransferKey(travelId, pictureId));
  }

  /**
   * Invalide tout le cache
   */
  invalidateAllCache(): void {
    this.cacheService.clearStore(this.CACHE_CONFIG.storeName).subscribe();
    // Note: Il faudrait aussi nettoyer le transfer state, mais cela nécessiterait
    // de connaître toutes les clés, ce qui n'est pas trivial
  }

  /**
   * Invalide le transfer state des photos d'un voyage
   */
  private invalidatePicturesTransferState(travelId: number): void {
    this.transferState.remove(this.getPicturesTransferKey(travelId));
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue lors de la communication avec le serveur.';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}, Message: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Met à jour le cache avec une nouvelle photo
   */
  private updateCacheWithNewPicture(travelId: number, newPicture: PictureCoordinateDTO): void {
    const picturesKey = this.getPicturesCacheKey(travelId);
    const pictureKey = this.getPictureCacheKey(travelId, newPicture.id);

    // Mettre en cache la nouvelle photo individuelle
    this.cacheService.set(pictureKey, newPicture, this.INDIVIDUAL_CACHE_CONFIG).subscribe();

    // Mettre à jour le cache des photos du voyage
    this.cacheService.get<PictureCoordinateDTO[]>(picturesKey, this.CACHE_CONFIG).subscribe(cachedData => {
      if (cachedData) {
        // Ajouter la nouvelle photo et trier à nouveau
        const updatedData = [newPicture, ...cachedData].sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );

        this.cacheService.set(picturesKey, updatedData, this.CACHE_CONFIG).subscribe();
      }
    });
  }

  /**
   * Supprime une photo du cache
   */
  private removePictureFromCache(travelId: number, pictureId: number): void {
    const picturesKey = this.getPicturesCacheKey(travelId);

    // Mettre à jour le cache des photos du voyage
    this.cacheService.get<PictureCoordinateDTO[]>(picturesKey, this.CACHE_CONFIG).subscribe(cachedData => {
      if (cachedData) {
        const updatedData = cachedData.filter(p => p.id !== pictureId);
        this.cacheService.set(picturesKey, updatedData, this.CACHE_CONFIG).subscribe();
      }
    });
  }
}
