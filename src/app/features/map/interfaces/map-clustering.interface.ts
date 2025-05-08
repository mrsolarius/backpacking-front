import { Map as MapboxMap, LngLatBounds } from 'mapbox-gl';
import { PictureCoordinateDTO } from '../../../core/models/dto/images.dto';

export interface IMapClusteringService {
  setupClusterLayers(map: MapboxMap): void;
  updatePhotoGeoJSON(photos: PictureCoordinateDTO[]): void;
  getSource(): any;
  showIsolatedMarkers(bounds: LngLatBounds, zoom: number, allPhotos: PictureCoordinateDTO[], visibleMarkers: any): void;
  isPhotoIsolated(photo: PictureCoordinateDTO, zoom: number, allPhotos: PictureCoordinateDTO[]): boolean;
  setClustered(value: boolean): void;
  isClustered(): boolean;
}
