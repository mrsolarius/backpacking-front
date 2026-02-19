import type { LngLatBoundsLike, LngLatLike, Map as MapboxMap, Marker } from 'mapbox-gl';
import { CoordinateDto } from '../../../core/models/dto/coordinate.dto';

export interface IMapAnimationService {
  centerMapAndZoom(map: MapboxMap, bounds: LngLatBoundsLike, duration?: number, padding?: number): void;
  turnAround(map: MapboxMap, bounds: LngLatBoundsLike): void;
  animateMarkerMovement(marker: Marker, target: LngLatLike, duration: number): void;
  addPath(map: MapboxMap, coordinates: CoordinateDto[]): void;
  easeInOutCubic(x: number): number;
}
