
import { Injectable } from '@angular/core';
import { LngLat, LngLatBounds, Map as MapboxMap } from 'mapbox-gl';
import { IMapProvider, MapboxInitOptions, FitBoundsOptions, EaseToOptions, FogOptions } from '../interfaces/map-provider.interface';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapRenderingService implements IMapProvider {
  private map?: MapboxMap;

  constructor() {}

  /**
   * Initialise la carte Mapbox dans le conteneur spécifié
   */
  async initialize(containerId: string, options?: MapboxInitOptions): Promise<MapboxMap> {
    // Dynamically import mapboxgl to ensure it's only loaded on the client side
    const mapboxgl = (await import('mapbox-gl')).default;
    mapboxgl.accessToken = environment.mapToken;

    const defaultOptions: MapboxInitOptions = {
      style: 'mapbox://styles/mrsolarius/clv7zpye900n101qzevxn3alm',
      projection: {
        name: 'globe',
      },
      zoom: 1,
      maxZoom: 20
    };

    const mapOptions = { ...defaultOptions, ...options } as MapboxInitOptions;

    this.map = new mapboxgl.Map({
      container: containerId,
      ...mapOptions
    });

    return this.map;
  }

  /**
   * Obtient l'instance de la carte Mapbox
   */
  getMap(): MapboxMap | undefined {
    return this.map;
  }

  /**
   * Ajuste la vue de la carte pour afficher les limites spécifiées
   */
  fitBounds(bounds: LngLatBounds, options?: FitBoundsOptions): void {
    if (!this.map) return;

    const defaultOptions: FitBoundsOptions = {
      padding: 50,
      duration: 10000,
      curve: 1.42,
    };

    this.map.fitBounds(bounds, { ...defaultOptions, ...options });
  }

  /**
   * Déplace la carte de manière fluide vers un nouvel emplacement
   */
  easeTo(options: EaseToOptions): void {
    if (!this.map) return;
    this.map.easeTo(options);
  }

  /**
   * Ajoute un ciel à la carte
   */
  addSky(): void {
    if (!this.map) return;

    this.map.setFog({
      color: 'rgb(186, 210, 235)', // Lower atmosphere
      'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
      'horizon-blend': 0.02, // Atmosphere thickness
      'space-color': 'rgb(11, 11, 25)', // Background color
      'star-intensity': 0.6 // Background star brightness
    });
  }

  /**
   * Ajoute un terrain 3D à la carte
   */
  addTerrain(): void {
    if (!this.map) return;

    this.map.addSource('mapbox-dem', {
      'type': 'raster-dem',
      'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
      'tileSize': 512,
      'maxzoom': 14
    });

    this.map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});
  }

  /**
   * Définit le brouillard sur la carte
   */
  setFog(options: FogOptions): void {
    if (!this.map) return;
    this.map.setFog(options);
  }

  /**
   * Enregistre un gestionnaire d'événements pour l'événement 'load'
   */
  onLoad(callback: () => void): void {
    if (!this.map) return;
    this.map.on('load', callback);
  }

  /**
   * Enregistre un gestionnaire d'événements pour l'événement 'zoomend'
   */
  onZoomEnd(callback: () => void): void {
    if (!this.map) return;
    this.map.on('zoomend', callback);
  }

  /**
   * Enregistre un gestionnaire d'événements pour l'événement 'moveend'
   */
  onMoveEnd(callback: () => void): void {
    if (!this.map) return;
    this.map.on('moveend', callback);
  }

  /**
   * Récupère une source depuis la carte
   */
  getSource(sourceId: string): any {
    if (!this.map) return null;
    return this.map.getSource(sourceId);
  }

  /**
   * Récupère les éléments rendus visibles à un point donné
   */
  queryRenderedFeatures(point: any, options?: any): any[] {
    if (!this.map) return [];
    return this.map.queryRenderedFeatures(point, options);
  }

  /**
   * Récupère les limites actuelles de la carte
   */
  getBounds(): LngLatBounds {
    if (!this.map) {
      return new LngLatBounds([-180, -90], [180, 90]); // Default world bounds
    }
    return this.map.getBounds();
  }

  /**
   * Récupère le niveau de zoom actuel
   */
  getZoom(): number {
    if (!this.map) return 1;
    return this.map.getZoom();
  }

  /**
   * Supprime la carte et libère les ressources
   */
  remove(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}
