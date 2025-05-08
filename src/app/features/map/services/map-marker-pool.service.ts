import { Injectable } from '@angular/core';
import { IMapMarkerPoolService } from '../interfaces/map-marker-pool.interface';

@Injectable({
  providedIn: 'root'
})
export class MapMarkerPoolService implements IMapMarkerPoolService {
  // Pool de marqueurs réutilisables
  private markerPool: HTMLDivElement[] = [];
  private meMarkerPool: HTMLDivElement[] = [];
  private readonly PHOTO_POOL_SIZE = 100; // Taille maximale du pool de photos
  private readonly ME_POOL_SIZE = 5;      // Taille maximale du pool de marqueurs personnels

  constructor() {
    this.initMarkerPool();
  }

  /**
   * Initialise les pools de marqueurs
   */
  initMarkerPool(): void {
    // Pré-création des éléments de marqueurs photo pour le pool
    for (let i = 0; i < this.PHOTO_POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'photo-marker';
      el.style.display = 'none';
      document.body.appendChild(el);
      this.markerPool.push(el);
    }

    // Pré-création des éléments de marqueurs personnels
    for (let i = 0; i < this.ME_POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'me-marker';
      el.style.display = 'none';
      document.body.appendChild(el);
      this.meMarkerPool.push(el);
    }
  }

  /**
   * Récupère un marqueur photo du pool ou en crée un nouveau
   */
  getMarkerFromPool(): HTMLDivElement {
    // Chercher un marqueur disponible dans le pool
    const poolElement = this.markerPool.find(el => el.style.display === 'none');

    if (poolElement) {
      // Réinitialiser les propriétés du marqueur pour sa réutilisation
      poolElement.style.display = 'block';
      poolElement.style.backgroundImage = '';
      poolElement.style.width = '30px';
      poolElement.style.height = '30px';
      poolElement.style.borderRadius = '50%';
      poolElement.style.zIndex = '';
      poolElement.style.border = '2px solid white';
      poolElement.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.2)';

      // Supprimer tous les écouteurs d'événements existants
      const newElement = poolElement.cloneNode() as HTMLDivElement;
      if (poolElement.parentNode) {
        poolElement.parentNode.replaceChild(newElement, poolElement);
        this.markerPool[this.markerPool.indexOf(poolElement)] = newElement;
        return newElement;
      }
      return poolElement;
    }

    // Créer un nouvel élément si le pool est épuisé
    console.log('Pool de marqueurs épuisé, création d\'un nouveau marqueur');
    const el = document.createElement('div');
    el.className = 'photo-marker';
    return el;
  }

  /**
   * Récupère un marqueur personnel du pool ou en crée un nouveau
   */
  getMeMarkerFromPool(): HTMLDivElement {
    const poolElement = this.meMarkerPool.find(el => el.style.display === 'none');

    if (poolElement) {
      poolElement.style.display = 'block';

      // Réinitialiser pour réutilisation
      const newElement = poolElement.cloneNode() as HTMLDivElement;
      if (poolElement.parentNode) {
        poolElement.parentNode.replaceChild(newElement, poolElement);
        this.meMarkerPool[this.meMarkerPool.indexOf(poolElement)] = newElement;
        return newElement;
      }
      return poolElement;
    }

    // Créer un nouvel élément si nécessaire
    const el = document.createElement('div');
    el.className = 'me-marker';
    return el;
  }

  /**
   * Retourne un marqueur au pool
   */
  returnMarkerToPool(element: HTMLDivElement): void {
    if (!element) return;

    // Réinitialiser l'élément
    element.style.backgroundImage = '';
    element.style.display = 'none';
    element.style.width = '30px';
    element.style.height = '30px';

    // Supprimer les écouteurs d'événements
    const newElement = element.cloneNode() as HTMLDivElement;
    if (element.parentNode) {
      element.parentNode.replaceChild(newElement, element);

      // Ajouter au pool si pas déjà présent
      if (element.classList.contains('photo-marker')) {
        if (!this.markerPool.includes(newElement) && this.markerPool.length < this.PHOTO_POOL_SIZE) {
          this.markerPool.push(newElement);
        }
      } else if (element.classList.contains('me-marker')) {
        if (!this.meMarkerPool.includes(newElement) && this.meMarkerPool.length < this.ME_POOL_SIZE) {
          this.meMarkerPool.push(newElement);
        }
      }
    }
  }
}
