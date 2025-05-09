import { Injectable } from '@angular/core';
import { IMapMarkerPoolService } from '../interfaces/map-marker-pool.interface';

@Injectable({
  providedIn: 'root'
})
export class MapMarkerPoolService implements IMapMarkerPoolService {
  // Pool de marqueurs réutilisables pour les photos
  private markerPool: HTMLDivElement[] = [];
  private readonly PHOTO_POOL_SIZE = 100; // Taille maximale du pool de photos

  constructor() {
    this.initMarkerPool();
  }

  /**
   * Initialise le pool de marqueurs photos
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
   * Retourne un marqueur au pool
   */
  returnMarkerToPool(element: HTMLDivElement): void {
    if (!element) return;

    // Ne gérer que les marqueurs photo
    if (!element.classList.contains('photo-marker')) return;

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
      if (!this.markerPool.includes(newElement) && this.markerPool.length < this.PHOTO_POOL_SIZE) {
        this.markerPool.push(newElement);
      }
    }
  }
}
