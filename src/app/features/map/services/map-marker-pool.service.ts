import { Injectable } from '@angular/core';
import { IMapMarkerPoolService } from '../interfaces/map-marker-pool.interface';
import {MarkerElement} from "../models/marker-element.model";


@Injectable({
  providedIn: 'root'
})
export class MapMarkerPoolService implements IMapMarkerPoolService {
  // Pool de marqueurs réutilisables pour les photos
  private markerPool: MarkerElement[] = [];
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
      const el = document.createElement('div') as MarkerElement;
      el.className = 'photo-marker';
      el.style.display = 'none';
      el._eventListeners = []; // Initialiser le tableau pour suivre les écouteurs
      document.body.appendChild(el);
      this.markerPool.push(el);
    }
  }

  /**
   * Récupère un marqueur photo du pool ou en crée un nouveau
   */
  getMarkerFromPool(): MarkerElement {
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

      // Réinitialiser le tableau des écouteurs
      poolElement._eventListeners = [];

      return poolElement;
    }

    // Créer un nouvel élément si le pool est épuisé
    console.log('Pool de marqueurs épuisé, création d\'un nouveau marqueur');
    const el = document.createElement('div') as MarkerElement;
    el.className = 'photo-marker';
    el._eventListeners = [];
    return el;
  }

  /**
   * Retourne un marqueur au pool
   */
  returnMarkerToPool(element: MarkerElement): void {
    if (!element) return;

    // Ne gérer que les marqueurs photo
    if (!element.classList.contains('photo-marker')) return;

    // Supprimer tous les écouteurs d'événements
    if (element._eventListeners && element._eventListeners.length > 0) {
      element._eventListeners.forEach(entry => {
        element.removeEventListener(entry.type, entry.listener, entry.options);
      });
      element._eventListeners = [];
    }

    // Réinitialiser l'élément
    element.style.backgroundImage = '';
    element.style.display = 'none';
    element.style.width = '30px';
    element.style.height = '30px';

    // Ajouter au pool si pas déjà présent
    if (!this.markerPool.includes(element) && this.markerPool.length < this.PHOTO_POOL_SIZE) {
      this.markerPool.push(element);
    }
  }
}
