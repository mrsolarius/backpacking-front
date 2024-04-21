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
      style: 'mapbox://styles/mrsolarius/clv7zpye900n101qzevxn3alm',
      projection: {
        name: 'globe',
      },
      zoom: 1,
    });
    this.map.on('load', () => {
      this.mapService.getCoordinates().subscribe(data => {
        this.addPath(data)
        //this.addTimeOverlay(data)
        setTimeout(() => {
          const bounds = this.getBounds(data)
          this.centerMapAndZoom(bounds)
          setTimeout(() => {
            this.turnAround(bounds)
          }, 10000)
        }, 1500)
      })
      this.addSky();
      this.addTerrain();
    });
  }

  addTerrain() {
    this.map!.addSource('mapbox-dem', {
      'type': 'raster-dem',
      'url': 'mapbox://styles/mrsolarius/clv7zpye900n101qzevxn3alm',
      'tileSize': 512,
      'maxzoom': 14
    });
    this.map!.setTerrain({'source': 'mapbox-dem', 'exaggeration': 2});
  }

  private getBounds(coordinates: CoordinateDTO[]): mapboxgl.LngLatBounds {
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coordinate => {
      bounds.extend([coordinate.longitude, coordinate.latitude]);
    });
    return bounds;
  }

  private centerMapAndZoom(bounds: mapboxgl.LngLatBounds) {
      this.map!.fitBounds(bounds, {
        padding: 20,
        duration: 10000,
        curve: 1.42,
      })
  }

  private turnAround(bounds: mapboxgl.LngLatBounds) {
    this.map!.easeTo({
      center: bounds.getCenter(),
      pitch: 60,
      bearing: 180, // Ajoutez cette ligne pour faire pivoter la carte de 360 degrés
      duration: 10000, // Modifiez cette ligne pour contrôler la durée de la rotation
      easing(t: number) {
        // ease in function that finishes with t=1
        return t * t * t * t;
      }
    });
    // go to the next frame
    setTimeout(() => {
      this.map!.easeTo({
        center: bounds.getCenter(),
        pitch: 60,
        bearing: 349, // Ajoutez cette ligne pour faire pivoter la carte de 360 degrés
        duration: 10000, // Modifiez cette ligne pour contrôler la durée de la rotation,
        easing(t: number) {
          // ease out function
          return 1 - (--t) * t * t * t;
        }
      });
    }, 10000)
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

  /*private addTimeOverlay(data: CoordinateDTO[]) {
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
  }*/

  private addSky() {
    this.map!.setFog({
      color: 'rgb(186, 210, 235)', // Lower atmosphere
      'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
      'horizon-blend': 0.02, // Atmosphere thickness (default 0.2 at low zooms)
      'space-color': 'rgb(11, 11, 25)', // Background color
      'star-intensity': 0.6 // Background star brightness (default 0.35 at low zoooms )
    });
  }
}
