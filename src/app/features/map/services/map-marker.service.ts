import { Injectable } from '@angular/core';
import {LngLat, Map as MapboxMap, Marker, Popup} from 'mapbox-gl';
import { IMapMarkerService, MarkerOptions } from '../interfaces/map-marker.interface';
import { environment } from '../../../../environments/environment';
import {PictureCoordinateDTO} from "../../../core/models/dto/images.dto";

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService implements IMapMarkerService {

  constructor() {}

  /**
   * Crée un marqueur Mapbox générique
   */
  createMarker(options: MarkerOptions): Marker {
    // Dynamically import mapboxgl to ensure it's only loaded on the client side
    return new Marker(options.element)
      .setLngLat(options.coordinates);
  }

  /**
   * Crée un marqueur pour une photo géolocalisée
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

    const el = document.createElement('div');
    el.className = 'photo-marker';

    // Ajouter un attribut data-id pour faciliter le débogage
    el.setAttribute('data-photo-id', photo.id.toString());

    // Style du marqueur (image de fond ou couleur par défaut)
    if (photo.versions?.icon && photo.versions.icon.length > 0) {
      el.style.backgroundImage = `url('${environment.baseApi}${photo.versions.icon[0].path}')`;
    } else if (photo.path) {
      el.style.backgroundImage = `url('${environment.baseApi}${photo.path}')`;
    } else {
      el.style.backgroundColor = '#3498db'; // Couleur bleue par défaut
    }

    // Créer le marqueur avec les coordonnées
    const marker = this.createMarker({
      element: el,
      coordinates: [photo.longitude, photo.latitude]
    });

    marker.addTo(map);

    // Ajouter l'événement click
    el.addEventListener('click', () => {
      onClick(photo);
    });

    // Ajouter un événement de survol pour le popup
    el.addEventListener('mouseenter', () => {
      this.createMarkerPopup(photo, marker, map);
    });

    return marker;
  }

  /**
   * Crée un marqueur personnalisé pour la position actuelle
   */
  createMeMarker(coordinates: LngLat, map: MapboxMap): Marker {
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
    // Réinitialiser tous les marqueurs
    Object.entries(markers).forEach(([currentId, { element }]) => {
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
  }

  /**
   * Réinitialise l'apparence de tous les marqueurs
   */
  resetMarkerSizes(markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void {
    Object.values(markers).forEach(({ element }) => {
      element.style.width = '30px';
      element.style.height = '30px';
      element.style.borderRadius = '50%';
      element.style.zIndex = '';
      element.style.border = '2px solid white';
      element.style.boxShadow = '';
    });
  }

  /**
   * Crée un popup pour un marqueur de photo
   */
  createMarkerPopup(picture: PictureCoordinateDTO, marker: Marker, map: MapboxMap): void {
    // Récupérer l'élément DOM du marqueur
    const markerElement = marker.getElement();

    // Créer le contenu du popup
    const popupContent = document.createElement('div');
    popupContent.className = 'map-popup';

    // Utiliser des lazy loading pour les images
    if (picture.versions?.icon && picture.versions.icon.length > 0) {
      const iconPath = picture.versions.icon[0].path;
      const img = document.createElement('img');
      img.className = 'popup-image';
      img.loading = 'lazy';
      img.src = `${environment.baseApi}${iconPath}`;
      img.alt = `Photo du ${new Date(picture.date).toLocaleDateString()}`;
      popupContent.appendChild(img);
    }

    // Ajouter la date
    const dateEl = document.createElement('div');
    dateEl.className = 'popup-date';
    dateEl.textContent = new Date(picture.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    popupContent.appendChild(dateEl);

    // Créer et afficher le popup
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '200px',
      offset: 15
    })
      .setDOMContent(popupContent)
      .setLngLat(marker.getLngLat());

    popup.addTo(map);

    // Fermer le popup quand la souris quitte le marqueur
    markerElement.addEventListener('mouseleave', () => {
      popup.remove();
    });
  }

  /**
   * Supprime tous les marqueurs de la carte
   */
  removeMarkers(markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void {
    Object.values(markers).forEach(({ marker }) => marker.remove());
  }
}
