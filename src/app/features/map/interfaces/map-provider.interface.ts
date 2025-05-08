import {LngLat, LngLatBounds, Map as MapboxMap, Projection} from 'mapbox-gl';

export interface IMapProvider {
  initialize(containerId: string, options?: MapboxInitOptions): Promise<MapboxMap>;
  getMap(): MapboxMap | undefined;
  fitBounds(bounds: LngLatBounds, options?: FitBoundsOptions): void;
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
  center?: [number, number] | LngLat;
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
