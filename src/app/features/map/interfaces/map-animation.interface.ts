import { LngLatBounds, Map as MapboxMap, Marker, LngLat } from 'mapbox-gl';
import { CoordinateDto } from '../../../core/models/dto/coordinate.dto';

export interface IMapAnimationService {
  centerMapAndZoom(map: MapboxMap, bounds: LngLatBounds, duration?: number, padding?: number): void;
  turnAround(map: MapboxMap, bounds: LngLatBounds): void;
  animateMarkerMovement(marker: Marker, target: LngLat, duration: number): void;
  addPath(map: MapboxMap, coordinates: CoordinateDto[]): void;
  easeInOutCubic(x: number): number;
}
