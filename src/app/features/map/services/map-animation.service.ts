// src/app/core/services/map/map-animation.service.ts
import { Injectable } from '@angular/core';
import { LngLatBounds, Map as MapboxMap, Marker, LngLat } from 'mapbox-gl';
import { IMapAnimationService } from '../interfaces/map-animation.interface';
import {CoordinateDto} from "../../../core/models/dto/coordinate.dto";

@Injectable({
  providedIn: 'root'
})
export class MapAnimationService implements IMapAnimationService {

  constructor() {}

  /**
   * Centre la carte et ajuste le zoom pour afficher les limites spécifiées
   */
  centerMapAndZoom(
    map: MapboxMap,
    bounds: LngLatBounds,
    duration: number = 10000,
    padding: number = 50
  ): void {
    map.fitBounds(bounds, {
      padding,
      duration,
      curve: 1.42,
    });
  }

  /**
   * Anime la carte pour effectuer une rotation autour d'un point central
   */
  turnAround(map: MapboxMap, bounds: LngLatBounds): void {
    map.easeTo({
      center: bounds.getCenter(),
      pitch: 60,
      bearing: 180,
      duration: 10000,
    });
  }

  /**
   * Anime le déplacement d'un marqueur vers une nouvelle position
   */
  animateMarkerMovement(marker: Marker, target: LngLat, duration: number): void {
    const start = performance.now();
    const startPosition = marker.getLngLat();
    const deltaPosition = {
      lng: target.lng - startPosition.lng,
      lat: target.lat - startPosition.lat
    };

    const animateStep = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      // Fonction d'interpolation pour un mouvement plus fluide
      const easeValue = this.easeInOutCubic(progress);

      const currentLng = startPosition.lng + deltaPosition.lng * easeValue;
      const currentLat = startPosition.lat + deltaPosition.lat * easeValue;

      marker.setLngLat([currentLng, currentLat]);

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      }
    };

    requestAnimationFrame(animateStep);
  }

  /**
   * Ajoute un chemin animé à la carte à partir des coordonnées du voyage
   */
  addPath(map: MapboxMap, coordinates: CoordinateDto[]): void {
    // Trier les coordonnées par date
    const sortedCoordinates = [...coordinates].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Vérifier si la source existe déjà et la supprimer si c'est le cas
    if (map.getSource('path')) {
      map.removeLayer('path');
      map.removeSource('path');
    }

    map.addSource('path', {
      'type': 'geojson',
      'lineMetrics': true,
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': sortedCoordinates.map(c => [c.longitude, c.latitude])
        }
      }
    });

    map.addLayer({
      'id': 'path',
      'type': 'line',
      'source': 'path',
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': 'rgba(23, 127, 253, 1)',
        'line-width': 3,
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, 0.7,       // Point de départ avec opacité faible
          1, 1          // Point d'arrivée avec opacité maximale
        ],

      }
    });
  }

  /**
   * Fonction d'atténuation cubique pour les animations
   */
  easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}
