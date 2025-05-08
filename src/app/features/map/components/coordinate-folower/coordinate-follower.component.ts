// src/app/features/map/components/coordinate-folower/coordinate-follower.component.ts
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges
} from '@angular/core';
import {isPlatformBrowser} from "@angular/common";
import {CoordinateDto} from "../../../../core/models/dto/coordinate.dto";
import {CameraFollow} from "../../models/camera-follow.enum";
import {MapDataService} from "../../../../core/services/map-data.service";
import {catchError, EMPTY, first, forkJoin, map, Observable, of, Subscription} from "rxjs";
import {TimelineSliderComponent} from "../timeline-slider/timeline-slider.component";
import {CoordinateInfoComponent} from "../coordinate-info/coordinate-info.component";
import {WeatherDisplayComponent} from "../weather-display/weather-display.component";
import {WeatherService} from "../../../../core/services/weather.service";
import {CurrentWeatherDTO, HistoricalWeatherResponse} from "../../../../core/models/dto/weather.dto";
import {WeatherMetricsComponent} from "../weather-metric/weather-metric.component";
import {GeocodingService} from "../../../../core/services/geocoding.service";
import {ReverseGeocodingResponse} from "../../../../core/models/dto/geocoding.dto";
import {adaptHistoricalToCurrentFormat, isCurrentWeather} from "../../../../core/mappers/wether.mapper";

@Component({
  selector: 'app-coordinate-follower',
  standalone: true,
  imports: [
    TimelineSliderComponent,
    CoordinateInfoComponent,
    WeatherDisplayComponent,
    WeatherMetricsComponent,
  ],
  templateUrl: './coordinate-follower.component.html',
  styleUrl: './coordinate-follower.component.scss'
})
export class CoordinateFollowerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() travelId: number = 0;

  @Output() sliderChange = new EventEmitter<CoordinateDto>();
  @Output() cameraFollowChange = new EventEmitter<CameraFollow>();

  coordinates: CoordinateDto[] = [];
  currentCoordinate?: CoordinateDto;
  weatherData?: CurrentWeatherDTO;
  locationData?: ReverseGeocodingResponse;
  isBrowser: boolean;

  // Optimisation: Limiter les requêtes météo et géocodage
  private dataFetchDebounceTimeout?: any;
  private isSliderDragging = false;
  private subscriptions: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) platformId: any,
    private mapDataService: MapDataService,
    private weatherService: WeatherService,
    private geocodingService: GeocodingService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser && this.travelId) {
      this.loadCoordinates();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['travelId'] && !changes['travelId'].firstChange && this.isBrowser) {
      this.loadCoordinates();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.dataFetchDebounceTimeout) {
      clearTimeout(this.dataFetchDebounceTimeout);
    }
  }

  loadCoordinates() {
    const sub = this.mapDataService.getCoordinatesByTravelId(this.travelId)
      .pipe(first())
      .subscribe((coordinates) => {
        this.coordinates = coordinates;
        if (this.coordinates.length > 0) {
          this.currentCoordinate = this.coordinates[this.coordinates.length - 1];
          this.onSliderChange(this.currentCoordinate);
        }
      });

    this.subscriptions.push(sub);
  }

  onSliderChange(coordinate: CoordinateDto) {
    if (!coordinate) return;

    this.currentCoordinate = coordinate;
    this.sliderChange.emit(coordinate);

    // Optimisation: Éviter les requêtes excessives pendant le glissement du slider
    if (this.dataFetchDebounceTimeout) {
      clearTimeout(this.dataFetchDebounceTimeout);
    }

    // Si le slider est en cours de glissement, attendre qu'il s'arrête pour mettre à jour les données
    if (this.isSliderDragging) {
      this.dataFetchDebounceTimeout = setTimeout(() => {
        this.fetchCoordinateData(coordinate);
      }, 300);
    } else {
      this.fetchCoordinateData(coordinate);
    }
  }

  onSliderDragStart() {
    this.isSliderDragging = true;
  }

  onSliderDragEnd() {
    this.isSliderDragging = false;
    if (this.dataFetchDebounceTimeout) {
      clearTimeout(this.dataFetchDebounceTimeout);
    }

    // Mettre à jour les données quand le glissement est terminé
    if (this.currentCoordinate) {
      this.fetchCoordinateData(this.currentCoordinate);
    }
  }

  /**
   * Méthode centralisée pour récupérer à la fois les données météo et de localisation
   * Respect du principe SRP en déléguant les responsabilités spécifiques aux méthodes dédiées
   */
  private fetchCoordinateData(coordinate: CoordinateDto) {
    const sub = forkJoin({
      weather: this.getWeatherData(coordinate),
      location: this.getLocationData(coordinate)
    })
      .pipe(first())
      .subscribe(result => {
        let tempWetherData;
        if (isCurrentWeather(result.weather)){
          tempWetherData = result.weather;
        }else  {
          tempWetherData = adaptHistoricalToCurrentFormat(result.weather);
        }
        this.locationData = result.location;

        // Si on a des données de géocodage, remplacer le nom dans les données météo
        this.weatherData = {
          ...tempWetherData,
          name: this.getLocalizedName(result.location)
        };
      });

    this.subscriptions.push(sub);
  }

  /**
   * Récupère les données météo
   * Abstraction qui respecte le principe de responsabilité unique
   */
  private getWeatherData(coordinate: CoordinateDto): Observable<CurrentWeatherDTO | HistoricalWeatherResponse> {
    return this.weatherService.getHistoricalWeatherData(
      coordinate.latitude,
      coordinate.longitude,
      coordinate.date
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des données météo historiques:', error);
        // En cas d'erreur, essayer l'API météo actuelle comme fallback
        return this.weatherService.getCurrentWeatherData(coordinate.latitude, coordinate.longitude);
      }),
    )
  }

  /**
   * Récupère les données de localisation
   * Abstraction qui respecte le principe de responsabilité unique
   */
  private getLocationData(coordinate: CoordinateDto): Observable<ReverseGeocodingResponse | undefined> {
    return this.geocodingService.getReverseGeocodingData({
      lat: coordinate.latitude,
      lon: coordinate.longitude,
      limit: 1
    }).pipe(
      first(),
      map(data => data[0]), // Extraire le premier résultat
      // Extraire le premier résultat
      catchError(error => {
        console.error('Erreur lors de la récupération des données de géocodage:', error);
        return of(undefined);
      })
    ).pipe(
      catchError(() => of(undefined))
    );
  }

  /**
   * Obtient le nom localisé à partir des données de géocodage
   * Respect du principe de responsabilité unique
   */
  private getLocalizedName(locationData: ReverseGeocodingResponse|undefined): string {
    if (!locationData) return 'Lieu inconnu';

    // Essayer d'obtenir le nom dans la langue de l'utilisateur
    if (this.isBrowser) {
      const userLang = navigator.language.split('-')[0];

      if (locationData.local_names && locationData.local_names[userLang]) {
        return locationData.local_names[userLang];
      }
    }

    // Sinon, utiliser le nom par défaut
    return locationData.name;
  }

  getDayOrNight(date: Date): string {
    const hours = date.getHours();
    return hours > 6 && hours < 20 ? 'day' : 'night';
  }

  cameraFollowChanged(cameraFollow: CameraFollow) {
    this.cameraFollowChange.emit(cameraFollow);
  }

  getNow(): Date {
    return new Date();
  }
}
