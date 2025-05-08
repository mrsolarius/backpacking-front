import { Injectable } from '@angular/core';
import { Map as MapboxMap, LngLatBounds } from 'mapbox-gl';
import {IMapClusteringService} from "../interfaces/map-clustering.interface";
import {MapMarkerService} from "./map-marker.service";
import {PictureCoordinateDTO} from "../../../core/models/dto/images.dto";

@Injectable({
  providedIn: 'root'
})
export class MapClusteringService implements IMapClusteringService {
  private clusterSource?: mapboxgl.GeoJSONSource;
  private _isClustered = true;
  private map?: MapboxMap;

  constructor(private markerService: MapMarkerService) {
  }

  /**
   * Configure les couches pour le clustering de photos
   */
  setupClusterLayers(map: MapboxMap): void {
    this.map = map;

    // Ajout de la source pour le clustering
    map.addSource('photos', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: true,
      clusterMaxZoom: 16, // Zoom maximal où les clusters sont générés
      clusterRadius: 45  // Rayon de cluster légèrement réduit pour permettre plus de marqueurs isolés
    });

    // Couche pour les clusters
    map.addLayer({
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
    map.addLayer({
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
    this.clusterSource = map.getSource('photos') as mapboxgl.GeoJSONSource;

    // Ajouter un gestionnaire de clic sur les clusters
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {layers: ['clusters']});
      if (!features || features.length === 0) return;

      const clusterId = features[0].properties!['cluster_id'];

      // Zoomer sur le cluster cliqué
      (map.getSource('photos') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;

          map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom
          });
        }
      );
    });

    // Changer le curseur au survol des clusters
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  /**
   * Met à jour les données GeoJSON pour le clustering
   */
  updatePhotoGeoJSON(photos: PictureCoordinateDTO[]): void {
    if (!this.clusterSource || !photos.length) return;

    // Filtrer et transformer les données en GeoJSON
    const features = photos
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

  /**
   * Récupère la source de clustering
   */
  getSource(): any {
    return this.clusterSource;
  }

  /**
   * Affiche les marqueurs isolés qui ne sont pas dans des clusters
   */
  showIsolatedMarkers(
    bounds: LngLatBounds,
    zoom: number,
    allPhotos: PictureCoordinateDTO[],
    visibleMarkers: any
  ): void {
    if (!this.map || !this.clusterSource) return;

    // Obtenir une liste des points dans la zone visible
    const visibleFeatures = this.map.queryRenderedFeatures(
      undefined, // toute la zone visible
      {layers: ['clusters']} // uniquement les clusters
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
    const isolatedPhotos = allPhotos.filter(photo => {
      // Vérifier si la photo est dans la zone visible
      const isVisible = !isNaN(photo.longitude) &&
        !isNaN(photo.latitude) &&
        bounds.contains([photo.longitude, photo.latitude]);

      if (!isVisible) return false;

      // Vérifier si la photo est dans un cluster
      if (clusterIds.has(photo.id)) return false;

      // Vérifier la distance aux autres photos pour détecter les photos isolées
      const isIsolated = this.isPhotoIsolated(photo, zoom, allPhotos);

      return isIsolated;
    });

    // Récupérer les IDs des marqueurs existants
    const existingIds = new Set(Object.keys(visibleMarkers).map(Number));

    // Supprimer les marqueurs qui ne sont plus isolés
    Object.keys(visibleMarkers).forEach(idStr => {
      const id = parseInt(idStr);
      if (!isolatedPhotos.some(p => p.id === id)) {
        visibleMarkers[id].marker.remove();
        delete visibleMarkers[id];
      }
    });
  }

  /**
   * Vérifie si une photo est suffisamment isolée pour être affichée individuellement
   */
  isPhotoIsolated(
    photo: PictureCoordinateDTO,
    zoom: number,
    allPhotos: PictureCoordinateDTO[]
  ): boolean {
    // Calculer un seuil de distance approprié en fonction du niveau de zoom
    // Plus le zoom est élevé, plus le seuil est petit
    const distanceThreshold = Math.max(0.01, 0.1 / Math.pow(1.5, Math.max(0, zoom - 7)));

    // Vérifier la distance avec les autres photos
    for (const otherPhoto of allPhotos) {
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

  /**
   * Définit si le clustering est activé ou non
   */
  setClustered(value: boolean): void {
    if (!this.map) return;

    this._isClustered = value;

    if (value) {
      this.map.setLayoutProperty('clusters', 'visibility', 'visible');
      this.map.setLayoutProperty('cluster-count', 'visibility', 'visible');
    } else {
      this.map.setLayoutProperty('clusters', 'visibility', 'none');
      this.map.setLayoutProperty('cluster-count', 'visibility', 'none');
    }
  }

  /**
   * Indique si le clustering est activé
   */
  isClustered(): boolean {
    return this._isClustered;
  }
}
