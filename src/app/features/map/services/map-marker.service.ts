import { Inject, Injectable, Optional } from '@angular/core';
import { LngLat, Map as MapboxMap, Marker, Popup } from 'mapbox-gl';
import { IMapMarkerService, MarkerOptions } from '../interfaces/map-marker.interface';
import { environment } from '../../../../environments/environment';
import { PictureCoordinateDTO } from "../../../core/models/dto/images.dto";
import { IMapMarkerPoolService } from '../interfaces/map-marker-pool.interface';
import { MARKER_POOL_SERVICE } from '../tokens/map.token';

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService implements IMapMarkerService {
  private popups: Popup[] = [];           // Suivi des popups actifs
  private isZooming = false;              // Indicateur de zoom actif

  // Pool de marqueurs réutilisables (si le service n'est pas injecté)
  private markerPool: HTMLDivElement[] = [];
  private meMarkerPool: HTMLDivElement[] = [];
  private readonly PHOTO_POOL_SIZE = 100; // Taille maximale du pool de photos
  private readonly ME_POOL_SIZE = 5;      // Taille maximale du pool de marqueurs personnels

  constructor(
    @Optional() @Inject(MARKER_POOL_SERVICE) private markerPoolService?: IMapMarkerPoolService
  ) {
    // Si le service de pool n'a pas été injecté, initialiser les pools localement
    if (!this.markerPoolService) {
      this.initLocalMarkerPool();
    }
  }

  /**
   * Initialise les pools de marqueurs localement si le service de pool n'est pas disponible
   */
  private initLocalMarkerPool(): void {
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
  private getMarkerFromLocalPool(): HTMLDivElement {
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
  private getMeMarkerFromLocalPool(): HTMLDivElement {
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
   * Retourne un marqueur au pool local
   */
  private returnMarkerToLocalPool(element: HTMLDivElement): void {
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

  /**
   * Crée un marqueur Mapbox générique
   */
  createMarker(options: MarkerOptions): Marker {
    return new Marker(options.element)
      .setLngLat(options.coordinates);
  }

  /**
   * Crée un marqueur pour une photo avec utilisation du pool
   */
  createPhotoMarker(
    photo: PictureCoordinateDTO,
    map: MapboxMap,
    onClick: (photo: PictureCoordinateDTO) => void
  ): Marker {
    // Vérifier si les coordonnées sont valides
    if (isNaN(photo.longitude) || isNaN(photo.latitude) ||
      Math.abs(photo.longitude) > 180 || Math.abs(photo.latitude) > 90) {
      throw new Error('Coordonnées de photo invalides');
    }

    // Obtenir un élément du pool de marqueurs
    const el = this.markerPoolService
      ? this.markerPoolService.getMarkerFromPool()
      : this.getMarkerFromLocalPool();

    // Ajouter un attribut data-id pour l'identification
    el.setAttribute('data-photo-id', photo.id.toString());

    // Déterminer le style du marqueur en fonction du niveau de zoom
    const currentZoom = map.getZoom();

    // Stratégie de chargement d'image basée sur le zoom
    if (currentZoom > 12) {
      // Zoom élevé : charger l'image complète
      if (photo.versions?.icon && photo.versions.icon.length > 0) {
        el.style.backgroundImage = `url('${environment.baseApi}${photo.versions.icon[0].path}')`;
      } else if (photo.path) {
        el.style.backgroundImage = `url('${environment.baseApi}${photo.path}')`;
      } else {
        el.style.backgroundColor = '#3498db';
      }
    } else {
      // Zoom faible : utiliser seulement une couleur pour les performances
      el.style.backgroundColor = '#3498db';

      // Charger l'image en différé si zoom modéré
      if (currentZoom > 10 && (photo.versions?.icon || photo.path)) {
        const imagePath = photo.versions?.icon && photo.versions.icon.length > 0
          ? `${environment.baseApi}${photo.versions.icon[0].path}`
          : `${environment.baseApi}${photo.path}`;

        setTimeout(() => {
          const img = new Image();
          img.onload = () => {
            if (el.isConnected) { // Vérifier si l'élément est toujours dans le DOM
              el.style.backgroundImage = `url('${imagePath}')`;
            }
          };
          img.src = imagePath;
        }, 200); // Délai pour éviter de bloquer le rendu
      }
    }

    // Créer le marqueur
    const marker = this.createMarker({
      element: el,
      coordinates: [photo.longitude, photo.latitude]
    });

    marker.addTo(map);

    // Gestion des événements avec technique de debounce
    let popupTimeout: any;

    // Événement de clic
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick(photo);
    });

    // Événement de survol avec délai pour éviter création excessive de popups
    el.addEventListener('mouseenter', () => {
      if (this.isZooming) return; // Ne pas créer de popup pendant le zoom

      clearTimeout(popupTimeout);
      popupTimeout = setTimeout(() => {
        // Vérifier si la carte est en mouvement avant de créer le popup
        if (!map.isMoving() && !map.isZooming()) {
          this.createMarkerPopup(photo, marker, map);
        }
      }, 150);
    });

    // Événement de sortie pour nettoyer le timeout
    el.addEventListener('mouseleave', () => {
      clearTimeout(popupTimeout);
    });

    // Écouter les événements de zoom de la carte pour optimiser
    map.on('zoomstart', () => {
      this.isZooming = true;
      // Ajouter une classe au conteneur de la carte pour désactiver les animations CSS
      map.getContainer().classList.add('map-zooming');
    });

    map.on('zoomend', () => {
      this.isZooming = false;
      // Réactiver les animations après un court délai
      setTimeout(() => {
        map.getContainer().classList.remove('map-zooming');
      }, 300);
    });

    return marker;
  }

  /**
   * Crée un marqueur personnalisé pour la position actuelle avec le pool
   */
  createMeMarker(coordinates: LngLat, map: MapboxMap): Marker {
    const el = this.markerPoolService
      ? this.markerPoolService.getMeMarkerFromPool()
      : this.getMeMarkerFromLocalPool();

    // Ajouter le marqueur sur la carte
    const marker = this.createMarker({
      element: el,
      coordinates: coordinates
    });

    marker.addTo(map);
    return marker;
  }

  /**
   * Met en évidence un marqueur spécifique
   */
  highlightMarker(markerId: number, markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void {
    // Utiliser requestAnimationFrame pour optimiser les modifications DOM
    requestAnimationFrame(() => {
      // Réinitialiser tous les marqueurs
      Object.entries(markers).forEach(([currentId, {element}]) => {
        if (parseInt(currentId) === markerId) {
          // Agrandir le marqueur sélectionné
          element.style.width = '60px';
          element.style.height = '60px';
          element.style.borderRadius = '35%';
          element.style.zIndex = '1000';
          element.style.border = '3px solid white';
          element.style.boxShadow = '0 0 15px rgba(23, 127, 253, 0.8)';
        } else {
          // Rétablir la taille normale
          element.style.width = '30px';
          element.style.height = '30px';
          element.style.borderRadius = '50%';
          element.style.zIndex = '';
          element.style.border = '2px solid white';
          element.style.boxShadow = '';
        }
      });
    });
  }

  /**
   * Réinitialise l'apparence de tous les marqueurs
   */
  resetMarkerSizes(markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void {
    // Utiliser requestAnimationFrame pour les modifications DOM
    requestAnimationFrame(() => {
      Object.values(markers).forEach(({element}) => {
        element.style.width = '30px';
        element.style.height = '30px';
        element.style.borderRadius = '50%';
        element.style.zIndex = '';
        element.style.border = '2px solid white';
        element.style.boxShadow = '';
      });
    });
  }

  /**
   * Crée un popup pour un marqueur de photo avec gestion améliorée
   */
  createMarkerPopup(picture: PictureCoordinateDTO, marker: Marker, map: MapboxMap): void {
    // Fermer les popups existants pour éviter l'accumulation
    this.clearPopups();

    // Ne pas créer de popup pendant le zoom
    if (this.isZooming || map.isMoving() || map.isZooming()) return;

    // Récupérer l'élément DOM du marqueur
    const markerElement = marker.getElement();

    // Créer le contenu du popup avec lazy loading
    const popupContent = document.createElement('div');
    popupContent.className = 'map-popup';

    // Ajouter la date
    const dateEl = document.createElement('div');
    dateEl.className = 'popup-date';
    dateEl.textContent = new Date(picture.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    popupContent.appendChild(dateEl);

    // Créer et afficher le popup avec options optimisées
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '200px',
      offset: 15,
      className: 'map-popup-container'
    })
      .setDOMContent(popupContent)
      .setLngLat(marker.getLngLat());

    popup.addTo(map);
    this.popups.push(popup);

    // Fermer le popup quand la souris quitte le marqueur
    markerElement.addEventListener('mouseleave', () => {
      popup.remove();
      this.popups = this.popups.filter(p => p !== popup);
    });

    // Fermer également le popup en cas de zoom ou déplacement
    map.once('zoomstart', () => {
      popup.remove();
      this.popups = this.popups.filter(p => p !== popup);
    });

    map.once('movestart', () => {
      popup.remove();
      this.popups = this.popups.filter(p => p !== popup);
    });
  }

  /**
   * Ferme tous les popups actifs
   */
  private clearPopups(): void {
    this.popups.forEach(popup => popup.remove());
    this.popups = [];
  }

  /**
   * Supprime tous les marqueurs de la carte et les retourne au pool
   */
  removeMarkers(markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void {
    Object.values(markers).forEach(({marker, element}) => {
      marker.remove();

      if (this.markerPoolService) {
        this.markerPoolService.returnMarkerToPool(element);
      } else {
        this.returnMarkerToLocalPool(element);
      }
    });
  }

  /**
   * Optimise les marqueurs visibles en supprimant ceux qui sont hors écran
   */
  optimizeVisibleMarkers(
    visibleMarkers: Record<string, { marker: Marker, element: HTMLDivElement }>,
    visibleIds: Set<number>
  ): void {
    // Identifier les marqueurs à supprimer (hors de la vue)
    const idsToRemove: number[] = [];

    Object.keys(visibleMarkers).forEach(idStr => {
      const id = parseInt(idStr);
      if (!visibleIds.has(id)) {
        idsToRemove.push(id);
      }
    });

    // Traitement par lots pour éviter les blocages du thread principal
    if (idsToRemove.length > 0) {
      // Pour de petits lots, supprimer immédiatement
      if (idsToRemove.length < 10) {
        idsToRemove.forEach(id => {
          const {marker, element} = visibleMarkers[id];
          marker.remove();

          if (this.markerPoolService) {
            this.markerPoolService.returnMarkerToPool(element);
          } else {
            this.returnMarkerToLocalPool(element);
          }

          delete visibleMarkers[id];
        });
      } else {
        // Pour de grands lots, traiter par tranches
        const processInBatches = (startIdx: number) => {
          const endIdx = Math.min(startIdx + 10, idsToRemove.length);

          for (let i = startIdx; i < endIdx; i++) {
            const id = idsToRemove[i];
            if (visibleMarkers[id]) {
              const {marker, element} = visibleMarkers[id];
              marker.remove();

              if (this.markerPoolService) {
                this.markerPoolService.returnMarkerToPool(element);
              } else {
                this.returnMarkerToLocalPool(element);
              }

              delete visibleMarkers[id];
            }
          }

          // S'il reste des marqueurs à traiter, programmer la prochaine tranche
          if (endIdx < idsToRemove.length) {
            setTimeout(() => processInBatches(endIdx), 0);
          }
        };

        // Commencer le traitement par lots
        processInBatches(0);
      }
    }
  }
}
