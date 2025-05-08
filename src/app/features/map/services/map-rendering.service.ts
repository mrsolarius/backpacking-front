import { Injectable } from '@angular/core';
import { LngLat, LngLatBounds, Map as MapboxMap } from 'mapbox-gl';
import { IMapProvider, MapboxInitOptions, FitBoundsOptions, EaseToOptions, FogOptions } from '../interfaces/map-provider.interface';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapRenderingService implements IMapProvider {
  private map?: MapboxMap;
  private isCurrentlyZooming = false;
  private isCurrentlyMoving = false;
  private originalStyle?: string;
  private lowPerformanceMode = false;

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

    // Sauvegarder le style original pour la restauration
    this.originalStyle = mapOptions.style || defaultOptions.style;

    this.map = new mapboxgl.Map({
      container: containerId,
      ...mapOptions,
      fadeDuration: 0, // Désactiver les fondus pour améliorer les performances
      renderWorldCopies: false // Désactiver le rendu des copies monde pour les perfs
    });

    // Configurer les écouteurs d'événements pour suivre l'état du zoom
    this.setupPerformanceTracking();

    return this.map;
  }

  /**
   * Configure les écouteurs d'événements pour suivre les performances
   */
  private setupPerformanceTracking(): void {
    if (!this.map) return;

    // Suivi du zoom pour optimiser les performances
    this.map.on('zoomstart', () => {
      this.isCurrentlyZooming = true;
      if (this.map) {
        this.map.getContainer().classList.add('map-zooming');
      }
    });

    this.map.on('zoomend', () => {
      this.isCurrentlyZooming = false;
      if (this.map) {
        // Petit délai pour éviter les flickers
        setTimeout(() => {
          this.map?.getContainer().classList.remove('map-zooming');
        }, 200);
      }
    });

    // Suivi du mouvement pour optimiser les performances
    this.map.on('movestart', () => {
      this.isCurrentlyMoving = true;
      if (this.map) {
        this.map.getContainer().classList.add('map-moving');
      }
    });

    this.map.on('moveend', () => {
      this.isCurrentlyMoving = false;
      if (this.map) {
        // Petit délai pour éviter les flickers
        setTimeout(() => {
          this.map?.getContainer().classList.remove('map-moving');
        }, 200);
      }
    });
  }

  /**
   * Indique si la carte est actuellement en train de zoomer
   */
  isZooming(): boolean {
    if (!this.map) return false;
    return this.isCurrentlyZooming || this.map.isZooming();
  }

  /**
   * Indique si la carte est actuellement en mouvement
   */
  isMoving(): boolean {
    if (!this.map) return false;
    return this.isCurrentlyMoving || this.map.isMoving();
  }

  /**
   * Optimise le rendu pour les systèmes à faible performance
   */
  optimizeForLowPerformance(): void {
    if (!this.map || this.lowPerformanceMode) return;

    this.lowPerformanceMode = true;

    // Utiliser un style plus léger
    const simplifiedStyle = 'mapbox://styles/mapbox/light-v11'; // Style plus léger
    this.map.setStyle(simplifiedStyle);

    // Désactiver les effets 3D et d'ombrage
    this.map.setTerrain(null);
    this.map.setFog({});

    // Réduire la qualité de rendu
    if (this.map.getCanvas()) {
      const canvas = this.map.getCanvas();
      canvas.style.imageRendering = 'optimizeSpeed';
    }

    // Désactiver les animations
    (this.map as any).transform.cameraEasing = (t: number) => 1; // Remplace l'animation par un déplacement immédiat
  }

  /**
   * Restaure les paramètres de performance normaux
   */
  restorePerformance(): void {
    if (!this.map || !this.lowPerformanceMode) return;

    this.lowPerformanceMode = false;

    // Restaurer le style original
    if (this.originalStyle) {
      this.map.setStyle(this.originalStyle);
    }

    // Réactiver le terrain 3D
    this.addTerrain();

    // Réactiver le ciel et le brouillard
    this.addSky();

    // Restaurer la qualité de rendu
    if (this.map.getCanvas()) {
      const canvas = this.map.getCanvas();
      canvas.style.imageRendering = 'auto';
    }

    // Restaurer les animations standard
    // Restauration de l'animation d'Easing par défaut
    delete (this.map as any).transform.cameraEasing;
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

    // Si on est en mode faible performance, réduire la durée de l'animation
    if (this.lowPerformanceMode && options.duration && options.duration > 500) {
      options.duration = 500;
    }

    this.map.easeTo(options);
  }

  /**
   * Ajoute un ciel à la carte
   */
  addSky(): void {
    if (!this.map || this.lowPerformanceMode) return;

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
    if (!this.map || this.lowPerformanceMode) return;

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
    if (!this.map || this.lowPerformanceMode) return;
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
