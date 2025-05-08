import { InjectionToken } from '@angular/core';
import { IMapProvider } from '../interfaces/map-provider.interface';
import { IMapMarkerService } from '../interfaces/map-marker.interface';
import { IMapClusteringService } from '../interfaces/map-clustering.interface';
import { IMapAnimationService } from '../interfaces/map-animation.interface';

export const MAP_PROVIDER = new InjectionToken<IMapProvider>('MapProvider');
export const MARKER_SERVICE = new InjectionToken<IMapMarkerService>('MarkerService');
export const CLUSTERING_SERVICE = new InjectionToken<IMapClusteringService>('ClusteringService');
export const MAP_ANIMATION_SERVICE = new InjectionToken<IMapAnimationService>('MapAnimationService');
