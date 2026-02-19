// src/app/core/services/map/map-animation.service.ts
import { Injectable } from '@angular/core';
import type { LngLatBoundsLike, LngLatLike, Map as MapboxMap, Marker } from 'mapbox-gl';
import { IMapAnimationService } from '../interfaces/map-animation.interface';
import {CoordinateDto} from "../../../core/models/dto/coordinate.dto";

@Injectable({
  providedIn: 'root'
})
export class MapAnimationService implements IMapAnimationService {

  constructor() {}

  /**
   * Centre la carte et ajuste le zoom pour afficher les limites sp�cifi�es
   */
  centerMapAndZoom(
    map: MapboxMap,
    bounds: LngLatBoundsLike,
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
  turnAround(map: MapboxMap, bounds: LngLatBoundsLike): void {
    const center = this.getBoundsCenter(bounds);
    map.easeTo({
      center: [center.lng, center.lat],
      pitch: 60,
      bearing: 180,
      duration: 10000,
    });
  }

  /**
   * Anime le d�placement d'un marqueur vers une nouvelle position
   */
  animateMarkerMovement(marker: Marker, target: LngLatLike, duration: number): void {
    const start = performance.now();
    const startPosition = marker.getLngLat();
    const targetPosition = this.normalizeLngLat(target);
    const deltaPosition = {
      lng: targetPosition.lng - startPosition.lng,
      lat: targetPosition.lat - startPosition.lat
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
   * Ajoute un chemin anim� � la carte � partir des coordonn�es du voyage
   */
  addPath(map: MapboxMap, coordinates: CoordinateDto[]): void {
    // Trier les coordonn�es par date
    const sortedCoordinates = [...coordinates].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // V�rifier si la source existe d�j� et la supprimer si c'est le cas
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
        'line-opacity': 1,
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, 'rgba(23, 127, 253, 0.4)', // Depart plus transparent
          1, 'rgba(23, 127, 253, 1)'    // Arrivee opaque
        ]
      }
    });
  }

  /**
   * Fonction d'att�nuation cubique pour les animations
   */
  easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  private normalizeLngLat(value: LngLatLike): { lng: number; lat: number } {
    if (Array.isArray(value)) {
      return { lng: value[0], lat: value[1] };
    }

    const candidate = value as { lng?: number; lat?: number; lon?: number };
    if (typeof candidate.lng === 'number' && typeof candidate.lat === 'number') {
      return { lng: candidate.lng, lat: candidate.lat };
    }
    if (typeof candidate.lon === 'number' && typeof candidate.lat === 'number') {
      return { lng: candidate.lon, lat: candidate.lat };
    }

    throw new Error('Invalid LngLatLike value.');
  }

  private getBoundsCenter(bounds: LngLatBoundsLike): { lng: number; lat: number } {
    const candidate = bounds as { getCenter?: () => { lng: number; lat: number } };
    if (candidate && typeof candidate.getCenter === 'function') {
      const center = candidate.getCenter();
      return { lng: center.lng, lat: center.lat };
    }

    if (Array.isArray(bounds)) {
      if (
        bounds.length === 2 &&
        Array.isArray(bounds[0]) &&
        Array.isArray(bounds[1])
      ) {
        const sw = bounds[0] as [number, number];
        const ne = bounds[1] as [number, number];
        return {
          lng: (sw[0] + ne[0]) / 2,
          lat: (sw[1] + ne[1]) / 2
        };
      }

      if (bounds.length === 4 && bounds.every((v) => typeof v === 'number')) {
        const [west, south, east, north] = bounds as [number, number, number, number];
        return {
          lng: (west + east) / 2,
          lat: (south + north) / 2
        };
      }
    }

    throw new Error('Unsupported bounds format.');
  }
}


