// map.component.ts amélioré
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

  @Input() travelId: number = 0;

  @Output()
  photosClick = new EventEmitter<PictureCoordinateDTO>();

  // Stockage des marqueurs avec leurs éléments DOM
  private markers: { [id: number]: { marker: mapboxgl.Marker, element: HTMLDivElement } } = {};

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
    });

    this.map.on('load', () => {
      this.isLoading = false;
      this.loadTravelData();
      this.addSky();
      this.addTerrain();
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
      this.addMarkers(data);
    });

    this.subscriptions.push(photoSub);
  }

  // Méthode pour nettoyer les données de la carte avant de charger un nouveau voyage
  private cleanMapData() {
    // Supprimer les sources et couches existantes
    if (this.map && this.map.getSource('path')) {
      this.map.removeLayer('path');
      this.map.removeSource('path');
    }

    // Supprimer tous les marqueurs
    Object.values(this.markers).forEach(({marker}) => marker.remove());
    this.markers = {};

    // Supprimer le marqueur de position courante
    if (this.meMarker) {
      this.meMarker.remove();
    }
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

  private addMarkers(pictures: PictureCoordinateDTO[]) {
    if (!this.map) return;

    pictures.forEach(picture => {
      // Vérifier si les coordonnées sont valides
      if (isNaN(picture.longitude) || isNaN(picture.latitude)) {
        console.warn(`Coordonnées invalides pour la photo ${picture.id}`);
        return;
      }

      const el = document.createElement('div');
      el.className = 'marker';

      // Utiliser une version miniature si disponible
      if (picture.versions?.icon && picture.versions.icon.length > 0) {
        el.style.backgroundImage = `url('${environment.baseApi}${picture.versions.icon[0].path}')`;
      } else {
        el.style.backgroundImage = `url('${environment.baseApi}${picture.path}/dot.webp')`;
      }

      el.style.backgroundSize = 'cover';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([picture.longitude, picture.latitude])
        .addTo(this.map as any);

      // Stocker le marqueur avec son élément DOM pour pouvoir le manipuler plus tard
      this.markers[picture.id] = { marker, element: el };

      // Ajouter l'événement click
      el.addEventListener('click', () => {
        this.highlightMarker(picture.id);
        this.photosClick.emit(picture);
      });

      // Ajouter un popup au survol
      el.addEventListener('mouseenter', () => {
        this.createMarkerPopup(picture, marker);
      });
    });
  }

  private createMarkerPopup(picture: PictureCoordinateDTO, marker: mapboxgl.Marker) {
    if (!this.map) return;

    // Récupérer l'élément DOM du marqueur
    const markerElement = marker.getElement();

    // Créer le contenu du popup
    const popupContent = document.createElement('div');
    popupContent.className = 'marker-popup';

    // Ajouter une image miniature - utiliser de préférence la version icon pour le popup aussi
    if (picture.versions?.icon && picture.versions.icon.length > 0) {
      // Utiliser icon avec résolution 3x si disponible, sinon prendre la première
      const iconPath = picture.versions.icon[2]?.path || picture.versions.icon[0].path;
      const img = document.createElement('img');
      img.src = `${environment.baseApi}${iconPath}`;
      img.alt = `Photo du ${new Date(picture.date).toLocaleDateString()}`;
      img.style.width = '100%';
      img.style.maxHeight = '120px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';
      popupContent.appendChild(img);
    }

    // Ajouter la date
    const dateEl = document.createElement('div');
    dateEl.style.fontSize = '12px';
    dateEl.style.marginTop = '4px';
    dateEl.style.textAlign = 'center';
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
    Object.entries(this.markers).forEach(([markerId, marker]) => {
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
    Object.values(this.markers).forEach(({ element }) => {
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
}
