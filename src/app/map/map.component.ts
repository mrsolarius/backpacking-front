import {Component, Inject, OnInit, PLATFORM_ID} from '@angular/core';
import mapboxgl from "mapbox-gl";
import {isPlatformBrowser} from "@angular/common";
import {environment} from "../../environments/environment";
import {CoordinateDTO} from "./dto/CoordinateDTO";
import {MapDataService} from "./map-data.service";
import {Position} from "geojson";

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit {
  private readonly isServer: boolean;
  private map?: mapboxgl.Map;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private mapService: MapDataService) {
    this.isServer = !isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isServer) {
      return;
    }
    mapboxgl.accessToken = environment.mapToken;
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      projection: {
        name: 'globe',
      }
    });
    this.map.on('load', () => {
      this.mapService.getCoordinates().subscribe(data => {
        this.addPath(data)
        this.addTimeOverlay(data)
        this.centerMapAndZoom(data)
      })
      this.addTerrain();
    });
  }

  addTerrain() {
    this.map!.addSource('mapbox-dem', {
      'type': 'raster-dem',
      'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
      'tileSize': 512,
      'maxzoom': 14
    });
    this.map!.setTerrain({'source': 'mapbox-dem', 'exaggeration': 2});
  }

  private centerMapAndZoom(coordinates: CoordinateDTO[]) {
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coordinate => {
      bounds.extend([coordinate.longitude, coordinate.latitude]);
    });
    this.map!.fitBounds(bounds, {
      padding: 20
    });
  }

  private addPath(coordinates: CoordinateDTO[]) {
    this.map!.addLayer({
      'id': 'path',
      'type': 'line',
      'source': {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': coordinates.map(c => [c.longitude, c.latitude] as Position)
          }
        }
      },
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': '#888',
        'line-width': 8
      }
    });
  }

  private addTimeOverlay(data: CoordinateDTO[]) {
    // when mouse hover the path, show the time of the most close point
    this.map!.on('mousemove', 'path', (e) => {

      // @ts-ignore
      const tolerance = 0.001; // adjust this value as needed
      const time = data.find(c => Math.abs(c.longitude - e.lngLat.lng) < tolerance && Math.abs(c.latitude - e.lngLat.lat) < tolerance)?.date;
      if (time) {
        this.map!.getCanvas().style.cursor = 'pointer';

        console.log("found ", time)
      } else {
        // Hide tooltip when not hovering over the path
        this.map!.getCanvas().style.cursor = '';
      }
    });
  }
}
