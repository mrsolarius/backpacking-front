import { LngLat, Map as MapboxMap, Marker } from 'mapbox-gl';
import { PictureCoordinateDTO } from '../../../core/models/dto/images.dto';

export interface IMapMarkerService {
  createMarker(options: MarkerOptions): Marker;
  createPhotoMarker(photo: PictureCoordinateDTO, map: MapboxMap, onClick: (photo: PictureCoordinateDTO) => void): Marker;
  createMeMarker(coordinates: LngLat, map: MapboxMap): Marker;
  highlightMarker(markerId: number, markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void;
  resetMarkerSizes(markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void;
  createMarkerPopup(picture: PictureCoordinateDTO, marker: Marker, map: MapboxMap): void;
  removeMarkers(markers: Record<string, { marker: Marker, element: HTMLDivElement }>): void;

  // Nouvelles méthodes pour le pool de marqueurs
  initMarkerPool(): void;
  getMarkerFromPool(): HTMLDivElement;
  returnMarkerToPool(element: HTMLDivElement): void;
  optimizeVisibleMarkers(
    visibleMarkers: Record<string, { marker: Marker, element: HTMLDivElement }>,
    visibleIds: Set<number>
  ): void;
}

export interface MarkerOptions {
  element?: HTMLElement;
  coordinates: LngLat | [number, number];
  offset?: [number, number];
}
