import {Component, EventEmitter, Inject, Output, PLATFORM_ID} from '@angular/core';
import {MatSlider, MatSliderThumb} from "@angular/material/slider";
import {MapDataService} from "../map/map-data.service";
import {AsyncPipe, isPlatformBrowser} from "@angular/common";
import {CoordinateDto} from "../map/dto/Coordinate.dto";
import {FormsModule} from "@angular/forms";
import {first} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {MatIcon} from "@angular/material/icon";
import {MatCheckbox, MatCheckboxChange} from "@angular/material/checkbox";


export enum CameraFollow {
  ON = 'ON',
  OFF = 'OFF'
}


@Component({
  selector: 'app-coordinate-folower',
  standalone: true,
  imports: [
    MatSlider,
    MatSliderThumb,
    AsyncPipe,
    FormsModule,
    FormsModule,
    MatCheckbox,
    MatIcon,
  ],
  templateUrl: './coordinate-follower.component.html',
  styleUrl: './coordinate-follower.component.scss'
})
export class CoordinateFollowerComponent {
  weatherIconMap:any = {
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


  @Output()
  sliderChange = new EventEmitter<CoordinateDto>();
  @Output()
  cameraFollowChange = new EventEmitter<CameraFollow>();
  coordinates: CoordinateDto[] = [];
  selectedCoordinate: number = 0;
  weatherData: any;
  isBrowser: boolean;
  constructor(@Inject(PLATFORM_ID) platformId:any,mapDataService: MapDataService, private http: HttpClient) {
    mapDataService.getCoordinates().pipe(first()).subscribe((coordinates) => {
      this.coordinates = coordinates;
      this.selectedCoordinate = this.coordinates.length - 1;
      this.onSliderChange(this.selectedCoordinate);
    });

    this.isBrowser = isPlatformBrowser(platformId);
  }

  formatLabel(p1: number) {
      console.log(this.coordinates[p1].date.toLocaleDateString('fr-FR', {  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      return this.coordinates[p1].date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  onSliderChange(selectedCoordinate: number) {
    if(this.isBrowser) {
      this.sliderChange.emit(this.coordinates[selectedCoordinate]);
    }
    this.getWeatherData(this.coordinates[selectedCoordinate].latitude, this.coordinates[selectedCoordinate].longitude)
      .pipe(first())
      .subscribe(data => {
        this.weatherData = data;
      });
  }

  getWeatherData(lat: number, lon: number) {
  const apiKey = 'cd24834c2501f9da7da53bf7a96cb381';
  const url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  return this.http.get(url);
}

  getDayOrNight(date: Date) {
    const hours = date.getHours();
    return hours > 6 && hours < 20 ? 'day' : 'night';
  }

  cameraFollowChanged($event: MatCheckboxChange) {
    this.cameraFollowChange.emit($event.checked? CameraFollow.ON : CameraFollow.OFF);
  }
}
