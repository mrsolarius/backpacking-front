import {Component, EventEmitter, Inject, Input, OnInit, Output, PLATFORM_ID, SimpleChanges} from '@angular/core';
import {MatSlider, MatSliderThumb} from "@angular/material/slider";
import {MapDataService} from "../../../../core/services/map-data.service";
import {AsyncPipe, isPlatformBrowser} from "@angular/common";
import {CoordinateDto} from "../../../../core/models/dto/coordinate.dto";
import {FormsModule} from "@angular/forms";
import {catchError, EMPTY, first, Observable, of, tap} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {MatIcon} from "@angular/material/icon";
import {MatCheckbox, MatCheckboxChange} from "@angular/material/checkbox";

export enum CameraFollow {
  ON = 'ON',
  OFF = 'OFF'
}

interface WeatherResponse {
  data: any[];
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
}

interface WeatherCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

@Component({
  selector: 'app-coordinate-folower',
  standalone: true,
  imports: [
    MatSlider,
    MatSliderThumb,
    FormsModule,
    MatCheckbox,
    MatIcon,
  ],
  templateUrl: './coordinate-follower.component.html',
  styleUrl: './coordinate-follower.component.scss'
})
export class CoordinateFollowerComponent implements OnInit {
  weatherIconMap: any = {
    '200': 'thunder.svg', // Thunderstorm with light rain
    '201': 'thunder.svg', // Thunderstorm with rain
    '202': 'thunder.svg', // Thunderstorm with heavy rain
    '210': 'thunder.svg', // Light thunderstorm
    '211': 'thunder.svg', // Thunderstorm
    '212': 'thunder.svg', // Heavy thunderstorm
    '221': 'thunder.svg', // Ragged thunderstorm
    '230': 'thunder.svg', // Thunderstorm with light drizzle
    '231': 'thunder.svg', // Thunderstorm with drizzle
    '232': 'thunder.svg', // Thunderstorm with heavy drizzle
    '300': 'rainy-1.svg', // Light intensity drizzle
    '301': 'rainy-2.svg', // Drizzle
    '302': 'rainy-3.svg', // Heavy intensity drizzle
    '310': 'rainy-4.svg', // Light intensity drizzle rain
    '311': 'rainy-5.svg', // Drizzle rain
    '312': 'rainy-6.svg', // Heavy intensity drizzle rain
    '313': 'rainy-7.svg', // Shower rain and drizzle
    '314': 'rainy-7.svg', // Heavy shower rain and drizzle
    '321': 'rainy-1.svg', // Shower drizzle
    '500': 'rainy-1.svg', // Light rain
    '501': 'rainy-2.svg', // Moderate rain
    '502': 'rainy-3.svg', // Heavy intensity rain
    '503': 'rainy-4.svg', // Very heavy rain
    '504': 'rainy-5.svg', // Extreme rain
    '511': 'snowy-1.svg', // Freezing rain
    '520': 'rainy-1.svg', // Light intensity shower rain
    '521': 'rainy-2.svg', // Shower rain
    '522': 'rainy-3.svg', // Heavy intensity shower rain
    '531': 'rainy-4.svg', // Ragged shower rain
    '600': 'snowy-1.svg', // Light snow
    '601': 'snowy-2.svg', // Snow
    '602': 'snowy-3.svg', // Heavy snow
    '611': 'snowy-4.svg', // Sleet
    '612': 'snowy-5.svg', // Light shower sleet
    '613': 'snowy-6.svg', // Shower sleet
    '615': 'snowy-1.svg', // Light rain and snow
    '616': 'snowy-2.svg', // Rain and snow
    '620': 'snowy-3.svg', // Light shower snow
    '621': 'snowy-4.svg', // Shower snow
    '622': 'snowy-5.svg', // Heavy shower snow
    '701': 'cloudy.svg', // Mist
    '711': 'cloudy.svg', // Smoke
    '721': 'cloudy.svg', // Haze
    '731': 'cloudy.svg', // Sand/dust whirls
    '741': 'cloudy.svg', // Fog
    '751': 'cloudy.svg', // Sand
    '761': 'cloudy.svg', // Dust
    '762': 'cloudy.svg', // Volcanic ash
    '771': 'cloudy.svg', // Squalls
    '781': 'cloudy.svg', // Tornado
    '800': 'day.svg', // Clear sky (day)
    '800n': 'night.svg', // Clear sky (night)
    '801': 'cloudy-day-1.svg', // Few clouds: 11-25% (day)
    '801n': 'cloudy-night-1.svg', // Few clouds: 11-25% (night)
    '802': 'cloudy-day-2.svg', // Scattered clouds: 25-50% (day)
    '802n': 'cloudy-night-2.svg', // Scattered clouds: 25-50% (night)
    '803': 'cloudy-day-3.svg', // Broken clouds: 51-84% (day)
    '803n': 'cloudy-night-3.svg', // Broken clouds: 51-84% (night)
    '804': 'cloudy.svg', // Overcast clouds: 85-100%
  };

  @Input() travelId: number = 0;

  @Output()
  sliderChange = new EventEmitter<CoordinateDto>();
  @Output()
  cameraFollowChange = new EventEmitter<CameraFollow>();

  coordinates: CoordinateDto[] = [];
  selectedCoordinate: number = 0;
  weatherData: any;
  isBrowser: boolean;
  private weatherCache: WeatherCache = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
  private readonly API_KEY = '102011f938be0f23a8dd32e9073a96ca';

  constructor(
    @Inject(PLATFORM_ID) platformId: any,
    private mapDataService: MapDataService,
    private http: HttpClient
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

  loadCoordinates() {
    this.mapDataService.getCoordinatesByTravelId(this.travelId)
      .pipe(first())
      .subscribe((coordinates) => {
        this.coordinates = coordinates;
        if (this.coordinates.length > 0) {
          this.selectedCoordinate = this.coordinates.length - 1;
          this.onSliderChange(this.selectedCoordinate);
        }
      });
  }

  formatLabel(index: number): string {
    if (!this.coordinates || !this.coordinates[index]) return '';

    return this.coordinates[index].date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onSliderChange(selectedCoordinate: number) {
    if (!this.coordinates || this.coordinates.length === 0) return;

    const coordinate = this.coordinates[selectedCoordinate];
    this.sliderChange.emit(coordinate);

    this.getHistoricalWeatherData(
      coordinate.latitude,
      coordinate.longitude,
      coordinate.date
    )
      .pipe(
        first(),
        catchError(error => {
          console.error('Erreur lors de la récupération des données météo:', error);
          // En cas d'erreur, essayer l'API météo actuelle comme fallback
          return this.getCurrentWeatherData(coordinate.latitude, coordinate.longitude).pipe(
            first(),
            catchError(currentError => {
              console.error('Erreur lors de la récupération des données météo actuelles:', currentError);
              this.weatherData = null;
              return EMPTY;
            })
          );
        })
      )
      .subscribe(data => {
        if (data) {
          // Pour l'API historique, adapter les données au format attendu
          if (data.data && data.data.length > 0) {
            const historicalData = data.data[0];
            this.weatherData = {
              weather: [{
                id: historicalData.weather[0].id,
                description: historicalData.weather[0].description
              }],
              main: {
                temp: historicalData.temp,
                humidity: historicalData.humidity
              },
              name: data.timezone.split('/').pop().replace('_', ' ') // Extraction du nom de la ville à partir du fuseau horaire
            };
          } else {
            // Pour l'API courante, les données sont déjà au bon format
            this.weatherData = data;
          }
        }
      });
  }

  /**
   * Récupère les données météo historiques pour une date spécifique
   */
  getHistoricalWeatherData(lat: number, lon: number, date: Date): Observable<WeatherResponse> {
    // Arrondir les coordonnées pour améliorer l'efficacité du cache
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLon = Math.round(lon * 1000) / 1000;

    // Convertir la date en timestamp Unix (secondes depuis le 1er janvier 1970)
    const timestamp = Math.floor(date.getTime() / 1000);

    const cacheKey = `${roundedLat},${roundedLon},${timestamp}`;
    const now = Date.now();

    // Vérifier si nous avons des données en cache valides
    if (this.weatherCache[cacheKey] &&
      (now - this.weatherCache[cacheKey].timestamp) < this.CACHE_DURATION) {
      return of(this.weatherCache[cacheKey].data);
    }

    // Construire l'URL pour l'API OpenWeatherMap historique
    const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${this.API_KEY}&units=metric`;

    return this.http.get<WeatherResponse>(url).pipe(
      tap(data => {
        // Stocker les résultats dans le cache
        this.weatherCache[cacheKey] = {
          data,
          timestamp: now
        };
      })
    );
  }

  /**
   * Récupère les données météo actuelles (utilisé comme fallback)
   */
  getCurrentWeatherData(lat: number, lon: number): Observable<any> {
    // Arrondir les coordonnées pour améliorer l'efficacité du cache
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLon = Math.round(lon * 1000) / 1000;
    const cacheKey = `current_${roundedLat},${roundedLon}`;
    const now = Date.now();

    // Vérifier si nous avons des données en cache valides (30 minutes pour les données actuelles)
    if (this.weatherCache[cacheKey] &&
      (now - this.weatherCache[cacheKey].timestamp) < 30 * 60 * 1000) {
      return of(this.weatherCache[cacheKey].data);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;

    return this.http.get(url).pipe(
      tap(data => {
        // Stocker les résultats dans le cache
        this.weatherCache[cacheKey] = {
          data,
          timestamp: now
        };
      })
    );
  }

  getDayOrNight(date: Date): string {
    const hours = date.getHours();
    return hours > 6 && hours < 20 ? 'day' : 'night';
  }

  cameraFollowChanged($event: MatCheckboxChange) {
    this.cameraFollowChange.emit($event.checked ? CameraFollow.ON : CameraFollow.OFF);
  }

  getNow(): Date {
    return new Date();
  }
}
