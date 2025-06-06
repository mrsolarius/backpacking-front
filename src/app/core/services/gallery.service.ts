import {Inject, Injectable} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, retry, share, throwError, switchMap, of } from 'rxjs';
import {
  PictureCoordinateDTO,
  PictureCoordinateInputDTO,
  mapToPictureCoordinateDTO
} from '../models/dto/images.dto';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';
import {CacheConfig} from "../models/cache.model";
import {ICacheService} from "../interfaces/cache-service.interface";
import {CACHE_SERVICE} from "../tokens/cache.token";

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private readonly API_URL = `${environment.apiUrl}/travels/`;
  private readonly CACHE_CONFIG: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes en millisecondes
    storeName: 'gallery_cache'
  };

  constructor(
    private http: HttpClient,
    @Inject(CACHE_SERVICE) private cacheService: ICacheService
  ) {
    // Nettoyer les entrées expirées au démarrage du service
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Récupère les photos d'un voyage spécifique
   * Implémente la mise en cache et la gestion d'erreurs
   */
  getPicturesByTravelId(travelId: number): Observable<PictureCoordinateDTO[]> {
    const cacheKey = `travel_pictures_${travelId}`;

    return this.cacheService.get<PictureCoordinateDTO[]>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        return this.http.get<PictureCoordinateInputDTO[]>(`${this.API_URL}${travelId}/pictures`).pipe(
          retry(1), // Réessayer une fois en cas d'échec
          map(data => {
            const pictures = mapToPictureCoordinateDTO(data);
            // Trier par date (du plus récent au plus ancien)
            return pictures.sort((a, b) => b.date.getTime() - a.date.getTime());
          }),
          switchMap(pictures => this.cacheService.set(cacheKey, pictures, this.CACHE_CONFIG)),
          catchError(this.handleError),
          share() // Partager la réponse entre plusieurs abonnés
        );
      })
    );
  }

  /**
   * Récupère une photo spécifique d'un voyage
   */
  getPictureById(travelId: number, pictureId: number): Observable<PictureCoordinateDTO> {
    const cacheKey = `travel_picture_${travelId}_${pictureId}`;

    return this.cacheService.get<PictureCoordinateDTO>(cacheKey, this.CACHE_CONFIG).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(cachedData);
        }

        // D'abord, essayer de trouver dans le cache des photos du voyage
        return this.cacheService.get<PictureCoordinateDTO[]>(`travel_pictures_${travelId}`, this.CACHE_CONFIG).pipe(
          switchMap(cachedPictures => {
            if (cachedPictures) {
              const picture = cachedPictures.find(p => p.id === pictureId);
              if (picture) {
                // Mettre en cache cette photo individuelle
                return this.cacheService.set(cacheKey, picture, this.CACHE_CONFIG);
              }
            }

            // Si non trouvé dans le cache, faire l'appel API
            return this.http.get<PictureCoordinateInputDTO>(`${this.API_URL}${travelId}/pictures/${pictureId}`).pipe(
              map(data => mapToPictureCoordinateDTO([data])[0]),
              switchMap(picture => this.cacheService.set(cacheKey, picture, this.CACHE_CONFIG)),
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
        // Mettre en cache la nouvelle photo individuelle
        const pictureKey = `travel_picture_${travelId}_${newPicture.id}`;
        this.cacheService.set(pictureKey, newPicture, this.CACHE_CONFIG).subscribe();

        // Mettre à jour le cache des photos du voyage
        this.updateCacheWithNewPicture(travelId, newPicture);

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
        // Supprimer la photo du cache
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
      catchError(this.handleError)
    );
  }

  /**
   * Invalide le cache pour un voyage spécifique
   */
  invalidateCache(travelId: number): void {
    // Supprimer le cache des photos du voyage
    this.cacheService.remove(`travel_pictures_${travelId}`, this.CACHE_CONFIG.storeName).subscribe();

    // Supprimer également toutes les entrées qui commencent par travel_picture_{travelId}_
    // Cela nécessite une implémentation plus avancée, pour l'instant, on se contente de nettoyer tout le cache
    this.cacheService.cleanExpiredEntries(this.CACHE_CONFIG.storeName).subscribe();
  }

  /**
   * Invalide tout le cache
   */
  invalidateAllCache(): void {
    this.cacheService.clearStore(this.CACHE_CONFIG.storeName).subscribe();
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
    const cacheKey = `travel_pictures_${travelId}`;

    this.cacheService.get<PictureCoordinateDTO[]>(cacheKey, this.CACHE_CONFIG).subscribe(cachedData => {
      if (cachedData) {
        // Ajouter la nouvelle photo et trier à nouveau
        const updatedData = [newPicture, ...cachedData].sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );

        this.cacheService.set(cacheKey, updatedData, this.CACHE_CONFIG).subscribe();
      }
    });
  }

  /**
   * Supprime une photo du cache
   */
  private removePictureFromCache(travelId: number, pictureId: number): void {
    // Supprimer la photo individuelle du cache
    this.cacheService.remove(`travel_picture_${travelId}_${pictureId}`, this.CACHE_CONFIG.storeName).subscribe();

    // Mettre à jour le cache des photos du voyage
    const cacheKey = `travel_pictures_${travelId}`;

    this.cacheService.get<PictureCoordinateDTO[]>(cacheKey, this.CACHE_CONFIG).subscribe(cachedData => {
      if (cachedData) {
        const updatedData = cachedData.filter(p => p.id !== pictureId);
        this.cacheService.set(cacheKey, updatedData, this.CACHE_CONFIG).subscribe();
      }
    });
  }
}
