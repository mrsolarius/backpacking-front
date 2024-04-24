import {
  Component,
  ElementRef,
  EventEmitter,
  Inject, Input,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import mapboxgl from "mapbox-gl";
import {isPlatformBrowser} from "@angular/common";
import {environment} from "../../environments/environment";
import {CoordinateDto} from "./dto/Coordinate.dto";
import {MapDataService} from "./map-data.service";
import {Position} from "geojson";
import {GalleryService} from "../gallery/gallery.service";
import { PictureCoordinateDTO} from "../gallery/images.dto";

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class MapComponent implements OnInit {
  private readonly isServer: boolean;
  private map?: mapboxgl.Map;

  @Output()
  photosClick = new EventEmitter<PictureCoordinateDTO>();

  @Input()
  set photoHovered(value: PictureCoordinateDTO | undefined) {
    if (value) {
      this.updateMarkerSize(value.id);
      this.map!.easeTo({
        center: [value.longitude, value.latitude],
        zoom: 14,
        duration: 100,
      });
    } else {
      this.updateMarkerSize(null);
    }
  }

  private markers: { [id: number]: mapboxgl.Marker } = {};

  @ViewChild('me')
  me: ElementRef | undefined;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private mapService: MapDataService, private galleryService:GalleryService) {
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
        this.addIconAtLastCoordinate(data, 'assets/me.jpg');
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
      this.galleryService.getPictures().subscribe(data => {
        this.addMarkers(data);
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

  private getBounds(coordinates: CoordinateDto[]): mapboxgl.LngLatBounds {
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach(coordinate => {
      bounds.extend([coordinate.longitude, coordinate.latitude]);
    });
    return bounds;
  }

  private centerMapAndZoom(bounds: mapboxgl.LngLatBounds, duration: number = 10000, padding: number = 20) {
      this.map!.fitBounds(bounds, {
        padding,
        duration,
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

  private addPath(coordinates: CoordinateDto[]) {
  // Calculate min and max dates
  const sortedCoordinates = coordinates.sort((a, b) => a.date.getTime() - b.date.getTime());

  this.map!.addSource('path', {
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

  this.map!.addLayer({
    'id': 'path',
    'type': 'line',
    'source': 'path',
    'layout': {
      'line-join': 'round',
      'line-cap': 'round'
    },
    'paint': {
      'line-width': 8,
      'line-gradient': [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0, "rgba(23, 127, 253, 0.2)",
        1,  "rgba(23, 127, 253, 1)"
      ]
    }
  });
}

private addIconAtLastCoordinate(coordinates: CoordinateDto[], imagePath: string) {

    const lastCoordinate = coordinates[coordinates.length - 1];

    // Add the marker to the map at the last coordinate
    new mapboxgl.Marker(this.me!.nativeElement)
      .setLngLat([lastCoordinate.longitude, lastCoordinate.latitude])
      .addTo(this.map!);
}

private addMarkers(coordinates: PictureCoordinateDTO[]) {
  coordinates.forEach(coordinate => {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = "url('https://api.backpaking.louisvolat.fr/storage/" + coordinate.path + "/dot.webp')";


    const marker = new mapboxgl.Marker(el)
      .setLngLat([coordinate.longitude, coordinate.latitude])
      .addTo(this.map!);

    this.markers[coordinate.id] = marker;

    el.addEventListener('click', () => {
      this.updateMarkerSize(coordinate.id);
      this.photosClick.emit(coordinate);
    });

  });
}

private updateMarkerSize(id: number | null) {
  Object.entries(this.markers).forEach(([markerId, marker]) => {
    const el = marker.getElement();
    if (parseInt(markerId) === id) {
      el.style.width = '60px';
      el.style.height = '60px';
      el.style.borderRadius = '35%';
      el.style.zIndex = '1000';
    } else {
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.zIndex = 'unset';
    }
  });
}

  /*private addTimeOverlay(data: CoordinateDto[]) {
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
