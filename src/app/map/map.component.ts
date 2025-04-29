// map.component.ts optimisé avec clustering et chargement progressif
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
import mapboxgl, { LngLat } from "mapbox-gl";
import { isPlatformBrowser } from "@angular/common";
import { environment } from "../../environments/environment";
import { CoordinateDto } from "./dto/Coordinate.dto";
import { MapDataService } from "./map-data.service";
import { GalleryService } from "../gallery/gallery.service";
import { PictureCoordinateDTO } from "../gallery/images.dto";
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { CameraFollow } from "../coordinate-folower/coordinate-follower.component";
import { Subscription } from "rxjs";

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    MatProgressSpinner
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class MapComponent implements OnInit, OnDestroy {
  private readonly isServer: boolean;
  private map?: mapboxgl.Map;
  private meMarker!: mapboxgl.Marker;
  isLoading = true;

  // Gestion des ressources
  private subscriptions: Subscription[] = [];

  // Stockage des données photos
  private allPhotos: PictureCoordinateDTO[] = [];
  private visibleMarkers: { [id: number]: { marker: mapboxgl.Marker, element: HTMLDivElement } } = {};

  // Clustering
  private clusterSource?: mapboxgl.GeoJSONSource;
  private isClustered = true;

  @Input() travelId: number = 0;

  @Output()
  photosClick = new EventEmitter<PictureCoordinateDTO>();

  @Input()
  set photoHovered(value: PictureCoordinateDTO | undefined) {
    if (value) {
      this.highlightMarker(value.id);
      this.centerOnPhoto(value);
    } else {
      this.resetMarkerSizes();
    }
  }

  @Input()
  set selectedCoordinate(value: CoordinateDto | undefined) {
    if (value && this.map) {
      if (this.cameraFollow === CameraFollow.ON) {
        this.map.easeTo({
          center: [value.longitude, value.latitude],
          zoom: 16,
          duration: 1000,
          pitch: 20,
        });
      }

      if (this.meMarker) {
        this.animateMarkerMovement(this.meMarker, new LngLat(value.longitude, value.latitude), 500);
      }
    }
  }

  @Input()
  cameraFollow: CameraFollow = CameraFollow.ON;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private mapService: MapDataService,
    private galleryService: GalleryService
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
    Object.values(this.visibleMarkers).forEach(({marker}) => marker.remove());
    this.visibleMarkers = {};

    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    mapboxgl.accessToken = environment.mapToken;

    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mrsolarius/clv7zpye900n101qzevxn3alm',
      projection: {
        name: 'globe',
      },
      zoom: 1,
      maxZoom: 20
    });

    this.map.on('load', () => {
      this.isLoading = false;
      this.setupClusterLayers();
      this.loadTravelData();
      this.addSky();
      this.addTerrain();
    });

    this.map.on('zoomend', this.handleZoomEnd.bind(this));
    this.map.on('moveend', this.handleMoveEnd.bind(this));
  }

  private handleZoomEnd() {
    this.updateVisibleMarkers();
  }

  private handleMoveEnd() {
    this.updateVisibleMarkers();
  }

  private setupClusterLayers() {
    if (!this.map) return;

    // Ajout de la source pour le clustering
    this.map.addSource('photos', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: 16, // Zoom maximal où les clusters sont générés, augmenté pour le mode hybride
      clusterRadius: 45  // Rayon de cluster légèrement réduit pour permettre plus de marqueurs isolés
    });

    // Couche pour les clusters
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'photos',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6', // couleur pour les petits clusters
          10,        // taille du seuil
          '#e2ad44', // couleur pour les clusters moyens
          30,        // taille du seuil
          '#f28cb1'  // couleur pour les grands clusters
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,   // rayon pour les petits clusters
          10,   // taille du seuil
          30,   // rayon pour les clusters moyens
          30,   // taille du seuil
          40    // rayon pour les grands clusters
        ]
      }
    });

    // Couche pour le nombre de points dans chaque cluster
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'photos',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Récupérer la source pour une utilisation ultérieure
    this.clusterSource = this.map.getSource('photos') as mapboxgl.GeoJSONSource;

    // Ajouter un gestionnaire de clic sur les clusters
    this.map.on('click', 'clusters', (e) => {
      const features = this.map?.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features || features.length === 0 || !this.map) return;

      const clusterId = features[0].properties!['cluster_id'];

      // Zoomer sur le cluster cliqué
      (this.map.getSource('photos') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err || !this.map) return;

          this.map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom
          });
        }
      );
    });

    // Changer le curseur au survol des clusters
    this.map.on('mouseenter', 'clusters', () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'clusters', () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  // Méthode pour charger les données lorsque le travelId change
  private loadTravelData() {
    if (!this.travelId) return;

    // Nettoyer les données existantes
    this.cleanMapData();

    // Charger les coordonnées
    const coordSub = this.mapService.getCoordinatesByTravelId(this.travelId).subscribe(data => {
      if (data.length > 0) {
        this.addIconAtLastCoordinate(data);
        this.addPath(data);

        setTimeout(() => {
          const bounds = this.getBounds(data);
          this.centerMapAndZoom(bounds);

          setTimeout(() => {
            this.turnAround(bounds);
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

      this.updatePhotoGeoJSON();

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

  // Convertir les photos en GeoJSON pour le clustering
  private updatePhotoGeoJSON() {
    if (!this.clusterSource || !this.allPhotos.length) return;

    // Filtrer et transformer les données en GeoJSON
    const features = this.allPhotos
      .filter(photo => {
        // Vérifier la validité des coordonnées
        return !isNaN(photo.longitude) && !isNaN(photo.latitude) &&
          Math.abs(photo.longitude) <= 180 && Math.abs(photo.latitude) <= 90;
      })
      .map(photo => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [photo.longitude, photo.latitude]
        },
        properties: {
          id: photo.id,
          path: photo.path,
          date: photo.date,
          versions: photo.versions,
          // Ajouter un flag pour marquer les photos isolées lors du calcul des clusters
          isolated: false
        }
      }));

    // Mettre à jour la source de données
    this.clusterSource.setData({
      type: 'FeatureCollection',
      features: features as GeoJSON.Feature[]
    });
  }

  // Méthode pour mettre à jour les marqueurs visibles en fonction du zoom et de la position
  private updateVisibleMarkers() {
    if (!this.map || !this.allPhotos.length) return;

    const currentZoom = this.map.getZoom();
    const currentBounds = this.map.getBounds();

    // Déterminer le mode d'affichage en fonction du zoom
    const CLUSTER_THRESHOLD = 10;       // Seuil minimum pour afficher des clusters
    const HYBRID_THRESHOLD = 13;        // Seuil où on commence à montrer les marqueurs individuels

    // Mode 1: Zoom très faible - seulement des clusters
    if (currentZoom < CLUSTER_THRESHOLD) {
      // Supprimer tous les marqueurs individuels
      Object.values(this.visibleMarkers).forEach(({marker}) => marker.remove());
      this.visibleMarkers = {};

      // Activer les couches de clustering si elles ne sont pas déjà activées
      if (!this.isClustered) {
        this.map.setLayoutProperty('clusters', 'visibility', 'visible');
        this.map.setLayoutProperty('cluster-count', 'visibility', 'visible');
        this.isClustered = true;
      }
      return;
    }

    // Mode 2: Zoom intermédiaire - clusters + marqueurs isolés
    // On montre des clusters pour les groupes denses, et des marqueurs individuels pour les photos isolées
    if (currentZoom >= CLUSTER_THRESHOLD && currentZoom < HYBRID_THRESHOLD) {
      // Garder le clustering actif
      if (!this.isClustered) {
        this.map.setLayoutProperty('clusters', 'visibility', 'visible');
        this.map.setLayoutProperty('cluster-count', 'visibility', 'visible');
        this.isClustered = true;
      }

      // On identifie les photos isolées qui ne sont pas dans des clusters
      this.showIsolatedMarkers(currentBounds, currentZoom);
      return;
    }

    // Mode 3: Zoom élevé - uniquement des marqueurs individuels
    if (this.isClustered) {
      this.map.setLayoutProperty('clusters', 'visibility', 'none');
      this.map.setLayoutProperty('cluster-count', 'visibility', 'none');
      this.isClustered = false;
    }

    // Identifier les photos dans la zone visible
    const visiblePhotos = this.allPhotos.filter(photo => {
      // Vérifier si les coordonnées sont valides et dans les limites de la carte visible
      return !isNaN(photo.longitude) && !isNaN(photo.latitude) &&
        currentBounds.contains([photo.longitude, photo.latitude]);
    });

    // Déterminer les marqueurs à supprimer et à ajouter
    const currentIds = new Set(visiblePhotos.map(p => p.id));
    const existingIds = new Set(Object.keys(this.visibleMarkers).map(Number));

    // Supprimer les marqueurs qui ne sont plus visibles
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        this.visibleMarkers[id].marker.remove();
        delete this.visibleMarkers[id];
      }
    }

    // Ajouter les nouveaux marqueurs visibles
    visiblePhotos.forEach(photo => {
      if (!existingIds.has(photo.id)) {
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

    const el = document.createElement('div');
    el.className = 'photo-marker';

    // Ajouter un attribut data-id pour faciliter le débogage dans l'inspecteur DOM
    el.setAttribute('data-photo-id', picture.id.toString());

    // Style du marqueur (image de fond ou couleur par défaut)
    if (picture.versions?.icon && picture.versions.icon.length > 0) {
      el.style.backgroundImage = `url('${environment.baseApi}${picture.versions.icon[0].path}')`;
    } else if (picture.path) {
      el.style.backgroundImage = `url('${environment.baseApi}${picture.path}')`;
    } else {
      el.style.backgroundColor = '#3498db'; // Couleur bleue par défaut
    }

    // Créer le marqueur avec les coordonnées
    const marker = new mapboxgl.Marker(el)
      .setLngLat([picture.longitude, picture.latitude])
      .addTo(this.map);

    // Stocker le marqueur avec son élément DOM
    this.visibleMarkers[picture.id] = { marker, element: el };

    // Ajouter l'événement click
    el.addEventListener('click', () => {
      this.highlightMarker(picture.id);
      this.photosClick.emit(picture);
    });

    // Ajouter un popup au survol
    el.addEventListener('mouseenter', () => {
      this.createMarkerPopup(picture, marker);
    });
  }

  // Méthode pour nettoyer les données de la carte avant de charger un nouveau voyage
  private cleanMapData() {
    // Supprimer les sources et couches existantes
    if (this.map && this.map.getSource('path')) {
      this.map.removeLayer('path');
      this.map.removeSource('path');
    }

    // Supprimer tous les marqueurs
    Object.values(this.visibleMarkers).forEach(({marker}) => marker.remove());
    this.visibleMarkers = {};

    // Supprimer le marqueur de position courante
    if (this.meMarker) {
      this.meMarker.remove();
    }

    // Réinitialiser la source de cluster
    if (this.clusterSource) {
      this.clusterSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }

    // Vider les données des photos
    this.allPhotos = [];
  }

  addTerrain() {
    if (!this.map) return;

    this.map.addSource('mapbox-dem', {
      'type': 'raster-dem',
      'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
      'tileSize': 512,
      'maxzoom': 14
    });

    this.map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});
  }

  private getBounds(coordinates: CoordinateDto[]): mapboxgl.LngLatBounds {
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coordinate => {
      bounds.extend([coordinate.longitude, coordinate.latitude]);
    });
    return bounds;
  }

  private centerMapAndZoom(bounds: mapboxgl.LngLatBounds, duration: number = 10000, padding: number = 50) {
    if (!this.map) return;

    this.map.fitBounds(bounds, {
      padding,
      duration,
      curve: 1.42,
    });
  }

  private turnAround(bounds: mapboxgl.LngLatBounds) {
    if (!this.map) return;

    this.map.easeTo({
      center: bounds.getCenter(),
      pitch: 60,
      bearing: 180,
      duration: 10000,
    });
  }

  private addPath(coordinates: CoordinateDto[]) {
    if (!this.map) return;

    // Trier les coordonnées par date
    const sortedCoordinates = [...coordinates].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    this.map.addSource('path', {
      'type': 'geojson',
      'lineMetrics': true,
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': sortedCoordinates.map(c => [c.longitude, c.latitude])
        }
      }
    });

    this.map.addLayer({
      'id': 'path',
      'type': 'line',
      'source': 'path',
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, "rgba(23, 127, 253, 0.2)",
          1, "rgba(23, 127, 253, 1)"
        ]
      }
    });
  }

  private addIconAtLastCoordinate(coordinates: CoordinateDto[]) {
    if (!this.map || coordinates.length === 0) return;

    const lastCoordinate = coordinates[coordinates.length - 1];
    const el = document.createElement('div');
    el.className = 'me-marker';

    // Ajouter le marqueur sur la carte
    this.meMarker = new mapboxgl.Marker(el)
      .setLngLat([lastCoordinate.longitude, lastCoordinate.latitude])
      .addTo(this.map);
  }

  private createMarkerPopup(picture: PictureCoordinateDTO, marker: mapboxgl.Marker) {
    if (!this.map) return;

    // Récupérer l'élément DOM du marqueur
    const markerElement = marker.getElement();

    // Créer le contenu du popup
    const popupContent = document.createElement('div');
    popupContent.className = 'map-popup';

    // Utiliser des lazy loading pour les images
    if (picture.versions?.icon && picture.versions.icon.length > 0) {
      const iconPath = picture.versions.icon[0].path;
      const img = document.createElement('img');
      img.className = 'popup-image';
      img.loading = 'lazy';  // Ajouter lazy loading
      img.src = `${environment.baseApi}${iconPath}`;
      img.alt = `Photo du ${new Date(picture.date).toLocaleDateString()}`;
      popupContent.appendChild(img);
    }

    // Ajouter la date
    const dateEl = document.createElement('div');
    dateEl.className = 'popup-date';
    dateEl.textContent = new Date(picture.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    popupContent.appendChild(dateEl);

    // Créer et afficher le popup
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '200px',
      offset: 15
    })
      .setDOMContent(popupContent)
      .setLngLat(marker.getLngLat());

    popup.addTo(this.map);

    // Fermer le popup quand la souris quitte le marqueur
    markerElement.addEventListener('mouseleave', () => {
      popup.remove();
    });
  }

  private highlightMarker(id: number | null) {
    // Réinitialiser tous les marqueurs
    Object.entries(this.visibleMarkers).forEach(([markerId, marker]) => {
      const el = marker.element;

      if (parseInt(markerId) === id) {
        // Agrandir le marqueur sélectionné
        el.style.width = '60px';
        el.style.height = '60px';
        el.style.borderRadius = '35%';
        el.style.zIndex = '1000';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 0 15px rgba(23, 127, 253, 0.8)';
      } else {
        // Rétablir la taille normale
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.zIndex = '';
        el.style.border = '2px solid white';
        el.style.boxShadow = '';
      }
    });
  }

  private resetMarkerSizes() {
    Object.values(this.visibleMarkers).forEach(({ element }) => {
      element.style.width = '30px';
      element.style.height = '30px';
      element.style.borderRadius = '50%';
      element.style.zIndex = '';
      element.style.border = '2px solid white';
      element.style.boxShadow = '';
    });
  }

  private centerOnPhoto(photo: PictureCoordinateDTO) {
    if (!this.map) return;

    this.map.easeTo({
      center: [photo.longitude, photo.latitude],
      zoom: 14,
      duration: 700,
    });
  }

  private animateMarkerMovement(marker: mapboxgl.Marker, target: LngLat, duration: number) {
    const start = performance.now();
    const startPosition = marker.getLngLat();
    const deltaPosition = {
      lng: target.lng - startPosition.lng,
      lat: target.lat - startPosition.lat
    };

    const animateStep = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      // Fonction d'interpolation pour un mouvement plus fluide
      const easeValue = this.easeInOutCubic(progress);

      const currentLng = startPosition.lng + deltaPosition.lng * easeValue;
      const currentLat = startPosition.lat + deltaPosition.lat * easeValue;

      marker.setLngLat([currentLng, currentLat]);

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      }
    };

    requestAnimationFrame(animateStep);
  }

  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  private addSky() {
    if (!this.map) return;

    this.map.setFog({
      color: 'rgb(186, 210, 235)', // Lower atmosphere
      'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
      'horizon-blend': 0.02, // Atmosphere thickness
      'space-color': 'rgb(11, 11, 25)', // Background color
      'star-intensity': 0.6 // Background star brightness
    });
  }

  // Méthode pour afficher les marqueurs isolés qui ne sont pas dans des clusters
  private showIsolatedMarkers(bounds: mapboxgl.LngLatBounds, currentZoom: number) {
    if (!this.map || !this.clusterSource) return;

    // Obtenir une liste des points dans la zone visible
    const visibleFeatures = this.map.queryRenderedFeatures(
      undefined, // toute la zone visible
      { layers: ['clusters'] } // uniquement les clusters
    );

    // Collecter les IDs des photos qui sont déjà dans un cluster
    const clusterIds = new Set<number>();

    // Pour chaque cluster visible, obtenir les points qu'il contient
    visibleFeatures.forEach(feature => {
      if (feature.properties && feature.properties['cluster_id']) {
        // Cette partie est complexe car MapboxGL ne fournit pas directement les points dans un cluster
        // On peut approximer en utilisant la position du cluster et un rayon
      }
    });

    // Trouver les photos qui sont dans la zone visible mais pas dans un cluster
    const isolatedPhotos = this.allPhotos.filter(photo => {
      // Vérifier si la photo est dans la zone visible
      const isVisible = !isNaN(photo.longitude) &&
        !isNaN(photo.latitude) &&
        bounds.contains([photo.longitude, photo.latitude]);

      if (!isVisible) return false;

      // Vérifier si la photo est dans un cluster
      if (clusterIds.has(photo.id)) return false;

      // Vérifier la distance aux autres photos pour détecter les photos isolées
      const isIsolated = this.isPhotoIsolated(photo, currentZoom);

      return isIsolated;
    });

    // Ajouter des marqueurs pour les photos isolées
    const existingIds = new Set(Object.keys(this.visibleMarkers).map(Number));

    // Ajouter de nouveaux marqueurs pour les photos isolées
    isolatedPhotos.forEach(photo => {
      if (!existingIds.has(photo.id)) {
        this.addSingleMarker(photo);
      }
    });

    // Supprimer les marqueurs qui ne sont plus isolés
    Object.keys(this.visibleMarkers).forEach(idStr => {
      const id = parseInt(idStr);
      if (!isolatedPhotos.some(p => p.id === id)) {
        this.visibleMarkers[id].marker.remove();
        delete this.visibleMarkers[id];
      }
    });
  }

  // Vérifie si une photo est suffisamment isolée pour être affichée individuellement
  private isPhotoIsolated(photo: PictureCoordinateDTO, zoom: number): boolean {
    // Calculer un seuil de distance approprié en fonction du niveau de zoom
    // Plus le zoom est élevé, plus le seuil est petit
    const distanceThreshold = Math.max(0.01, 0.1 / Math.pow(1.5, Math.max(0, zoom - 7)));

    // Vérifier la distance avec les autres photos
    for (const otherPhoto of this.allPhotos) {
      // Ne pas comparer avec soi-même
      if (otherPhoto.id === photo.id) continue;

      // Calculer la distance approximative
      const distance = Math.sqrt(
        Math.pow(photo.longitude - otherPhoto.longitude, 2) +
        Math.pow(photo.latitude - otherPhoto.latitude, 2)
      );

      // Si une photo est trop proche, celle-ci n'est pas isolée
      if (distance < distanceThreshold) {
        return false;
      }
    }

    // Si aucune photo n'est trop proche, la photo est isolée
    return true;
  }
}
