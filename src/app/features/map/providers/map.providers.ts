// src/app/core/providers/map.providers.ts
import { Provider } from '@angular/core';
import { MapRenderingService } from '../services/map-rendering.service';
import { MapMarkerService } from '../services/map-marker.service';
import { MapAnimationService } from '../services/map-animation.service';
import {MapClusteringService} from "../services/map-clustering.service";
import {CLUSTERING_SERVICE, MAP_ANIMATION_SERVICE, MAP_PROVIDER, MARKER_SERVICE} from "../tokens/map.token";

export const MAP_PROVIDERS: Provider[] = [
  { provide: MAP_PROVIDER, useClass: MapRenderingService },
  { provide: MARKER_SERVICE, useClass: MapMarkerService },
  { provide: CLUSTERING_SERVICE, useClass: MapClusteringService },
  { provide: MAP_ANIMATION_SERVICE, useClass: MapAnimationService },
];
