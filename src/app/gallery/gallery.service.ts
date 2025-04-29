// gallery.service.ts amélioré
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, retry, share, throwError } from 'rxjs';
import {
  PictureCoordinateDTO,
  PictureCoordinateInputDTO,
  mapToPictureCoordinateDTO
} from './images.dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private readonly API_URL = `${environment.apiUrl}/travels/`;
  private readonly CACHE_TIME = 5 * 60 * 1000; // 5 minutes en millisecondes
  private pictureCache: Map<string, {
    data: PictureCoordinateDTO[],
    timestamp: number
  }> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Récupère les photos d'un voyage spécifique
   * Implémente la mise en cache et la gestion d'erreurs
   */
  getPicturesByTravelId(travelId: number): Observable<PictureCoordinateDTO[]> {
    const cacheKey = `travel_${travelId}`;
    const cachedData = this.pictureCache.get(cacheKey);
    const now = Date.now();

    // Utiliser le cache si disponible et valide
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TIME)) {
      return new Observable(observer => {
        observer.next(cachedData.data);
        observer.complete();
      });
    }

    // Sinon faire l'appel API
    return this.http.get<PictureCoordinateInputDTO[]>(`${this.API_URL}${travelId}/pictures`).pipe(
      retry(1), // Réessayer une fois en cas d'échec
      map(data => {
        const pictures = mapToPictureCoordinateDTO(data);
        // Trier par date (du plus récent au plus ancien)
        const sortedPictures = pictures.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Mettre en cache
        this.pictureCache.set(cacheKey, {
          data: sortedPictures,
          timestamp: now
        });

        return sortedPictures;
      }),
      catchError(this.handleError),
      share() // Partager la réponse entre plusieurs abonnés
    );
  }

  /**
   * Récupère une photo spécifique d'un voyage
   */
  getPictureById(travelId: number, pictureId: number): Observable<PictureCoordinateDTO> {
    // Vérifier si la photo est déjà en cache
    const cacheKey = `travel_${travelId}`;
    const cachedData = this.pictureCache.get(cacheKey);

    if (cachedData) {
      const cachedPicture = cachedData.data.find(p => p.id === pictureId);
      if (cachedPicture) {
        return new Observable(observer => {
          observer.next(cachedPicture);
          observer.complete();
        });
      }
    }

    // Sinon faire l'appel API
    return this.http.get<PictureCoordinateInputDTO>(`${this.API_URL}${travelId}/pictures/${pictureId}`).pipe(
      map(data => mapToPictureCoordinateDTO([data])[0]),
      catchError(this.handleError)
    );
  }

  /**
   * Ajoute une photo à un voyage
   */
  addPictureToTravel(travelId: number, formData: FormData): Observable<PictureCoordinateDTO> {
    return this.http.post<PictureCoordinateInputDTO>(`${this.API_URL}${travelId}/pictures`, formData).pipe(
      map(data => {
        const newPicture = mapToPictureCoordinateDTO([data])[0];

        // Mettre à jour le cache si disponible
        this.updateCacheWithNewPicture(travelId, newPicture);

        return newPicture;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Supprime une photo d'un voyage
   */
  deletePicture(travelId: number, pictureId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}${travelId}/pictures/${pictureId}`).pipe(
      map(response => {
        // Mettre à jour le cache en supprimant la photo
        this.removePictureFromCache(travelId, pictureId);
        return response;
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
    const cacheKey = `travel_${travelId}`;
    this.pictureCache.delete(cacheKey);
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
    const cacheKey = `travel_${travelId}`;
    const cachedData = this.pictureCache.get(cacheKey);

    if (cachedData) {
      // Ajouter la nouvelle photo et trier à nouveau
      const updatedData = [newPicture, ...cachedData.data].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );

      this.pictureCache.set(cacheKey, {
        data: updatedData,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Supprime une photo du cache
   */
  private removePictureFromCache(travelId: number, pictureId: number): void {
    const cacheKey = `travel_${travelId}`;
    const cachedData = this.pictureCache.get(cacheKey);

    if (cachedData) {
      const updatedData = cachedData.data.filter(p => p.id !== pictureId);

      this.pictureCache.set(cacheKey, {
        data: updatedData,
        timestamp: Date.now()
      });
    }
  }
}
