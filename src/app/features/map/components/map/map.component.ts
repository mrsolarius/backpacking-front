// src/app/features/map/map.component.ts - version refactorisée avec SOLID
import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {isPlatformBrowser} from "@angular/common";
import {LngLat, Map as MapboxMap, Marker, LngLatBounds} from "mapbox-gl";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {Subscription} from "rxjs";
import {PictureCoordinateDTO} from "../../../../core/models/dto/images.dto";
import {CoordinateDto} from "../../../../core/models/dto/coordinate.dto";
import {MapDataService} from "../../../../core/services/map-data.service";
import {GalleryService} from "../../../../core/services/gallery.service";
import {CLUSTERING_SERVICE, MAP_ANIMATION_SERVICE, MAP_PROVIDER, MARKER_SERVICE} from "../../tokens/map.token";
import {IMapProvider} from "../../interfaces/map-provider.interface";
import {IMapMarkerService} from "../../interfaces/map-marker.interface";
import {IMapClusteringService} from "../../interfaces/map-clustering.interface";
import {IMapAnimationService} from "../../interfaces/map-animation.interface";
import {MAP_PROVIDERS} from "../../providers/map.providers";
import {CameraFollow} from "../../models/camera-follow.enum";

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    MatProgressSpinner
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: MAP_PROVIDERS
})
export class MapComponent implements OnInit, OnDestroy {
  private readonly isServer: boolean;
  private map?: MapboxMap;
  private meMarker?: Marker;
  isLoading = true;

  // Gestion des ressources
  private subscriptions: Subscription[] = [];
  private _updateTimeout?: any;
  private _lastUpdate: number = 0;

  // Stockage des données photos
  private allPhotos: PictureCoordinateDTO[] = [];
  private visibleMarkers: { [id: number]: { marker: Marker, element: HTMLDivElement } } = {};

  @Input() travelId: number = 0;

  @Output()
  photosClick = new EventEmitter<PictureCoordinateDTO>();

  @Input()
  set photoHovered(value: PictureCoordinateDTO | undefined) {
    if (value) {
      this.markerService.highlightMarker(value.id, this.visibleMarkers);
      this.centerOnPhoto(value);
    } else {
      this.markerService.resetMarkerSizes(this.visibleMarkers);
    }
  }

  @Input()
  set selectedCoordinate(value: CoordinateDto | undefined) {
    if (value && this.map) {
      if (this.cameraFollow === CameraFollow.ON) {
        this.mapProvider.easeTo({
          center: [value.longitude, value.latitude],
          zoom: 14,
          duration: 1000,
          pitch: 20,
        });
      }

      if (this.meMarker) {
        this.animationService.animateMarkerMovement(
          this.meMarker,
          new LngLat(value.longitude, value.latitude),
          500
        );
      }
    }
  }

  @Input()
  cameraFollow: CameraFollow = CameraFollow.ON;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private mapDataService: MapDataService,
    private galleryService: GalleryService,
    @Inject(MAP_PROVIDER) private mapProvider: IMapProvider,
    @Inject(MARKER_SERVICE) private markerService: IMapMarkerService,
    @Inject(CLUSTERING_SERVICE) private clusteringService: IMapClusteringService,
    @Inject(MAP_ANIMATION_SERVICE) private animationService: IMapAnimationService
  ) {
    this.isServer = !isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isServer) {
      return;
    }
    this.initializeMap();
  }

  ngOnDestroy(): void {
    // Nettoyage des ressources
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Supprimer tous les marqueurs et libérer la mémoire
    this.markerService.removeMarkers(this.visibleMarkers);
    this.visibleMarkers = {};

    // Nettoyer les timeout en attente
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }

    if (this.map) {
      this.mapProvider.remove();
    }
  }

  private async initializeMap(): Promise<void> {
    try {
      this.map = await this.mapProvider.initialize('map');

      this.mapProvider.onLoad(() => {
        this.isLoading = false;
        this.clusteringService.setupClusterLayers(this.map!);
        this.loadTravelData();
        this.mapProvider.addSky();
        this.mapProvider.addTerrain();
      });

      this.mapProvider.onZoomEnd(this.handleZoomEnd.bind(this));
      this.mapProvider.onMoveEnd(this.handleMoveEnd.bind(this));
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.isLoading = false;
    }
  }

  private handleZoomEnd() {
    // Utiliser un throttling pour limiter les mises à jour
    this.throttledUpdateMarkers();
  }

  private handleMoveEnd() {
    // Utiliser un throttling pour limiter les mises à jour
    this.throttledUpdateMarkers();
  }

  // Méthode throttle pour limiter les mises à jour des marqueurs
  private throttledUpdateMarkers(): void {
    const now = Date.now();
    // Limiter à une mise à jour toutes les 200ms pendant les interactions
    if (!this._lastUpdate || (now - this._lastUpdate) > 200) {
      this._lastUpdate = now;
      this.updateVisibleMarkers();
    } else {
      // Reporter la mise à jour à plus tard
      clearTimeout(this._updateTimeout);
      this._updateTimeout = setTimeout(() => {
        this._lastUpdate = Date.now();
        this.updateVisibleMarkers();
      }, 200);
    }
  }

  // Méthode pour charger les données lorsque le travelId change
  private loadTravelData() {
    if (!this.travelId || !this.map) return;

    // Nettoyer les données existantes
    this.cleanMapData();

    // Charger les coordonnées
    const coordSub = this.mapDataService.getCoordinatesByTravelId(this.travelId).subscribe(data => {
      if (data.length > 0) {
        this.addIconAtLastCoordinate(data);
        this.animationService.addPath(this.map!, data);

        setTimeout(() => {
          const bounds = this.getBounds(data);
          this.animationService.centerMapAndZoom(this.map!, bounds);

          setTimeout(() => {
            this.animationService.turnAround(this.map!, bounds);
          }, 10000);
        }, 1500);
      }
    });

    this.subscriptions.push(coordSub);

    // Charger les photos
    const photoSub = this.galleryService.getPicturesByTravelId(this.travelId).subscribe(data => {
      this.allPhotos = data;

      // S'assurer que les données des photos sont valides
      this.allPhotos = this.allPhotos.filter(photo => {
        return !isNaN(photo.longitude) && !isNaN(photo.latitude) &&
          Math.abs(photo.longitude) <= 180 && Math.abs(photo.latitude) <= 90;
      });

      this.clusteringService.updatePhotoGeoJSON(this.allPhotos);

      // Forcer la mise à jour des marqueurs après un court délai
      // pour s'assurer que la source GeoJSON est bien chargée
      if (this.map) {
        setTimeout(() => {
          this.updateVisibleMarkers();
        }, 100);
      }
    });

    this.subscriptions.push(photoSub);
  }

  // Méthode pour mettre à jour les marqueurs visibles en fonction du zoom et de la position
  private updateVisibleMarkers() {
    if (!this.map || !this.allPhotos.length) return;

    // Ne pas mettre à jour pendant un zoom actif
    if (this.map.isZooming() || this.map.isMoving()) {
      // Programmer une mise à jour différée après la fin du zoom/mouvement
      clearTimeout(this._updateTimeout);
      this._updateTimeout = setTimeout(() => this.updateVisibleMarkers(), 200);
      return;
    }

    const currentZoom = this.mapProvider.getZoom();
    const currentBounds = this.mapProvider.getBounds();

    // Limiter le nombre de marqueurs en fonction du niveau de zoom
    // pour maintenir les performances
    const MAX_MARKERS = Math.min(100, Math.round(currentZoom * 5));

    // Déterminer le mode d'affichage en fonction du zoom
    const CLUSTER_THRESHOLD = 10;
    const HYBRID_THRESHOLD = 13;

    // Mode 1: Zoom très faible - seulement des clusters
    if (currentZoom < CLUSTER_THRESHOLD) {
      // Supprimer tous les marqueurs individuels
      const visibleIds = new Set<number>();
      this.markerService.optimizeVisibleMarkers(this.visibleMarkers, visibleIds);

      // Activer les couches de clustering si elles ne sont pas déjà activées
      if (!this.clusteringService.isClustered()) {
        this.clusteringService.setClustered(true);
      }
      return;
    }

    // Mode 2: Zoom intermédiaire - clusters + marqueurs isolés
    // On montre des clusters pour les groupes denses, et des marqueurs individuels pour les photos isolées
    if (currentZoom >= CLUSTER_THRESHOLD && currentZoom < HYBRID_THRESHOLD) {
      // Garder le clustering actif
      if (!this.clusteringService.isClustered()) {
        this.clusteringService.setClustered(true);
      }

      // On identifie les photos isolées qui ne sont pas dans des clusters
      const isolatedPhotos = this.allPhotos.filter(photo => {
        // Vérifier si dans les limites de la carte
        const isVisible = !isNaN(photo.longitude) && !isNaN(photo.latitude) &&
          currentBounds.contains([photo.longitude, photo.latitude]);

        if (!isVisible) return false;

        // Vérifier si isolée
        return this.clusteringService.isPhotoIsolated(photo, currentZoom, this.allPhotos);
      });

      // Limiter le nombre pour les performances
      const limitedIsolatedPhotos = isolatedPhotos.slice(0, MAX_MARKERS);

      // Construire ensemble des IDs visibles
      const visibleIds = new Set(limitedIsolatedPhotos.map(p => p.id));

      // Optimiser les marqueurs (supprimer ceux hors écran)
      this.markerService.optimizeVisibleMarkers(this.visibleMarkers, visibleIds);

      // Ajouter les nouveaux marqueurs isolés
      limitedIsolatedPhotos.forEach(photo => {
        if (!this.visibleMarkers[photo.id]) {
          this.addSingleMarker(photo);
        }
      });

      return;
    }

    // Mode 3: Zoom élevé - uniquement des marqueurs individuels
    if (this.clusteringService.isClustered()) {
      this.clusteringService.setClustered(false);
    }

    // Identifier les photos dans la zone visible
    let visiblePhotos = this.allPhotos.filter(photo => {
      // Vérifier si les coordonnées sont valides et dans les limites de la carte visible
      return !isNaN(photo.longitude) && !isNaN(photo.latitude) &&
        currentBounds.contains([photo.longitude, photo.latitude]);
    });

    // Limiter le nombre de marqueurs si nécessaire pour maintenir les performances
    if (visiblePhotos.length > MAX_MARKERS) {
      // Stratégie de sélection: prioriser les photos récentes ou les plus proches du centre
      const center = currentBounds.getCenter();

      // Trier par distance au centre (plus proches d'abord)
      visiblePhotos.sort((a, b) => {
        const distA = Math.pow(a.longitude - center.lng, 2) + Math.pow(a.latitude - center.lat, 2);
        const distB = Math.pow(b.longitude - center.lng, 2) + Math.pow(b.latitude - center.lat, 2);
        return distA - distB;
      });

      // Prendre seulement MAX_MARKERS photos
      visiblePhotos = visiblePhotos.slice(0, MAX_MARKERS);
    }

    // Construire ensemble des IDs visibles
    const visibleIds = new Set(visiblePhotos.map(p => p.id));

    // Optimiser les marqueurs (supprimer ceux hors écran)
    this.markerService.optimizeVisibleMarkers(this.visibleMarkers, visibleIds);

    // Ajouter les nouveaux marqueurs visibles
    visiblePhotos.forEach(photo => {
      if (!this.visibleMarkers[photo.id]) {
        this.addSingleMarker(photo);
      }
    });
  }

  private addSingleMarker(picture: PictureCoordinateDTO) {
    if (!this.map) return;

    // Vérifier si les coordonnées sont valides
    if (isNaN(picture.longitude) || isNaN(picture.latitude) ||
      Math.abs(picture.longitude) > 180 || Math.abs(picture.latitude) > 90) {
      return;
    }

    // Vérifier si un marqueur existe déjà pour cette photo
    if (this.visibleMarkers[picture.id]) {
      this.visibleMarkers[picture.id].marker.setLngLat([picture.longitude, picture.latitude]);
      return;
    }

    try {
      const marker = this.markerService.createPhotoMarker(
        picture,
        this.map,
        (photo) => {
          this.markerService.highlightMarker(photo.id, this.visibleMarkers);
          this.photosClick.emit(photo);
        }
      );

      // Stocker le marqueur avec son élément DOM
      this.visibleMarkers[picture.id] = {
        marker,
        element: marker.getElement() as HTMLDivElement
      };
    } catch (error) {
      console.error('Erreur lors de la création du marqueur:', error);
    }
  }

  // Méthode pour nettoyer les données de la carte avant de charger un nouveau voyage
  private cleanMapData() {
    // Supprimer les sources et couches existantes
    if (this.map && this.map.getSource('path')) {
      this.map.removeLayer('path');
      this.map.removeSource('path');
    }

    // Supprimer tous les marqueurs
    this.markerService.removeMarkers(this.visibleMarkers);
    this.visibleMarkers = {};

    // Supprimer le marqueur de position courante
    if (this.meMarker) {
      this.meMarker.remove();
    }

    // Réinitialiser la source de cluster
    const clusterSource = this.clusteringService.getSource();
    if (clusterSource) {
      clusterSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }

    // Vider les données des photos
    this.allPhotos = [];
  }

  private getBounds(coordinates: CoordinateDto[]): LngLatBounds {
    const bounds = new LngLatBounds();
    coordinates.forEach(coordinate => {
      bounds.extend([coordinate.longitude, coordinate.latitude]);
    });
    return bounds;
  }

  private addIconAtLastCoordinate(coordinates: CoordinateDto[]) {
    if (!this.map || coordinates.length === 0) return;

    const lastCoordinate = coordinates[coordinates.length - 1];
    try {
      this.meMarker = this.markerService.createMeMarker(
        new LngLat(lastCoordinate.longitude, lastCoordinate.latitude),
        this.map
      );
    } catch (error) {
      console.error('Erreur lors de la création du marqueur de position:', error);
    }
  }

  private centerOnPhoto(photo: PictureCoordinateDTO) {
    if (!this.map) return;

    this.mapProvider.easeTo({
      center: [photo.longitude, photo.latitude],
      zoom: 14,
      duration: 700,
    });
  }
}
