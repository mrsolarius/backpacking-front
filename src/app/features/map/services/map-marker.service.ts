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

  constructor(
    @Optional() @Inject(MARKER_POOL_SERVICE) private markerPoolService?: IMapMarkerPoolService
  ) {}

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
    if (!this.markerPoolService) {
      throw new Error('Le service de pool de marqueurs n\'est pas disponible');
    }

    const el = this.markerPoolService.getMarkerFromPool();

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
   * Crée un marqueur personnalisé pour la position actuelle
   */
  createMeMarker(coordinates: LngLat, map: MapboxMap): Marker {
    // Simplement créer un nouvel élément directement pour le marqueur "me"
    const el = document.createElement('div');
    el.className = 'me-marker';

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
    if (!this.markerPoolService) {
      Object.values(markers).forEach(({marker}) => {
        marker.remove();
      });
      return;
    }

    Object.values(markers).forEach(({marker, element}) => {
      marker.remove();

      // Ne retourner au pool que les marqueurs photo (pas le marqueur "me")
      if (element.classList.contains('photo-marker')) {
        this.markerPoolService!.returnMarkerToPool(element);
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
    if (!this.markerPoolService) {
      return;
    }

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

          // Ne retourner au pool que les marqueurs photo
          if (element.classList.contains('photo-marker')) {
            this.markerPoolService!.returnMarkerToPool(element);
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

              // Ne retourner au pool que les marqueurs photo
              if (element.classList.contains('photo-marker')) {
                this.markerPoolService!.returnMarkerToPool(element);
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
