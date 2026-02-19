import type { LngLatBounds, LngLatBoundsLike, LngLatLike, Map as MapboxMap, Projection } from 'mapbox-gl';

export interface IMapProvider {
  initialize(containerId: string, options?: MapboxInitOptions): Promise<MapboxMap>;
  getMap(): MapboxMap | undefined;
  fitBounds(bounds: LngLatBoundsLike, options?: FitBoundsOptions): void;
  easeTo(options: EaseToOptions): void;
  addSky(): void;
  addTerrain(): void;
  onLoad(callback: () => void): void;
  onZoomEnd(callback: () => void): void;
  onMoveEnd(callback: () => void): void;
  setFog(options: FogOptions): void;
  getSource(sourceId: string): any;
  queryRenderedFeatures(point: any, options?: any): any[];
  getBounds(): LngLatBounds;
  getZoom(): number;
  remove(): void;

  // Nouvelles méthodes utiles pour les optimisations de performance
  isZooming(): boolean;
  isMoving(): boolean;

  // Méthodes pour l'optimisation du rendu
  optimizeForLowPerformance(): void;
  restorePerformance(): void;
  onError(param: (error: any) => void): void;
}

export interface MapboxInitOptions {
  style?: string;
  projection?:Projection;
  zoom?: number;
  maxZoom?: number;
  center?: [number, number];
}

export interface FitBoundsOptions {
  padding?: number;
  duration?: number;
  curve?: number;
}

export interface EaseToOptions {
  center?: LngLatLike;
  zoom?: number;
  duration?: number;
  pitch?: number;
  bearing?: number;
}

export interface FogOptions {
  color?: string;
  'high-color'?: string;
  'horizon-blend'?: number;
  'space-color'?: string;
  'star-intensity'?: number;
}
