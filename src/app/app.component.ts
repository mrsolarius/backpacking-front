import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {MapComponent} from "./map/map.component";
import {MainComponent} from "./main/main.component";
import {GalleryComponent} from "./gallery/gallery.component";
import {PictureCoordinateDTO} from "./gallery/images.dto";
import {MatMenu} from "@angular/material/menu";
import {MatTab, MatTabGroup} from "@angular/material/tabs";
import {CameraFollow, CoordinateFollowerComponent} from "./coordinate-folower/coordinate-follower.component";
import {CoordinateDto} from "./map/dto/Coordinate.dto";

const weatherIconMap = {
  '200': 'weather-lightning-rainy', // Thunderstorm with light rain
  '201': 'weather-lightning-rainy', // Thunderstorm with rain
  '202': 'weather-lightning-rainy', // Thunderstorm with heavy rain
  '210': 'weather-lightning', // Light thunderstorm
  '211': 'weather-lightning', // Thunderstorm
  '212': 'weather-lightning', // Heavy thunderstorm
  '221': 'weather-lightning', // Ragged thunderstorm
  '230': 'weather-lightning-rainy', // Thunderstorm with light drizzle
  '231': 'weather-lightning-rainy', // Thunderstorm with drizzle
  '232': 'weather-lightning-rainy', // Thunderstorm with heavy drizzle
  '300': 'weather-rainy', // Light intensity drizzle
  '301': 'weather-rainy', // Drizzle
  '302': 'weather-pouring', // Heavy intensity drizzle
  '310': 'weather-rainy', // Light intensity drizzle rain
  '311': 'weather-rainy', // Drizzle rain
  '312': 'weather-pouring', // Heavy intensity drizzle rain
  '313': 'weather-pouring', // Shower rain and drizzle
  '314': 'weather-pouring', // Heavy shower rain and drizzle
  '321': 'weather-rainy', // Shower drizzle
  '500': 'weather-rainy', // Light rain
  '501': 'weather-rainy', // Moderate rain
  '502': 'weather-pouring', // Heavy intensity rain
  '503': 'weather-pouring', // Very heavy rain
  '504': 'weather-pouring', // Extreme rain
  '511': 'weather-snowy-rainy', // Freezing rain
  '520': 'weather-rainy', // Light intensity shower rain
  '521': 'weather-pouring', // Shower rain
  '522': 'weather-pouring', // Heavy intensity shower rain
  '531': 'weather-pouring', // Ragged shower rain
  '600': 'weather-snowy', // Light snow
  '601': 'weather-snowy', // Snow
  '602': 'weather-snowy-heavy', // Heavy snow
  '611': 'weather-snowy-rainy', // Sleet
  '612': 'weather-snowy-rainy', // Light shower sleet
  '613': 'weather-snowy-rainy', // Shower sleet
  '615': 'weather-snowy-rainy', // Light rain and snow
  '616': 'weather-snowy-rainy', // Rain and snow
  '620': 'weather-snowy', // Light shower snow
  '621': 'weather-snowy', // Shower snow
  '622': 'weather-snowy-heavy', // Heavy shower snow
  '701': 'weather-fog', // Mist
  '711': 'smoke', // Smoke
  '721': 'weather-hazy', // Haze
  '731': 'weather-windy', // Sand/dust whirls
  '741': 'weather-fog', // Fog
  '751': 'weather-windy', // Sand
  '761': 'weather-windy', // Dust
  '762': 'weather-windy', // Volcanic ash
  '771': 'weather-windy', // Squalls
  '781': 'weather-tornado', // Tornado
  '800': 'weather-sunny', // Clear sky
  '801': 'weather-partly-cloudy', // Few clouds: 11-25%
  '802': 'weather-partly-cloudy', // Scattered clouds: 25-50%
  '803': 'weather-cloudy', // Broken clouds: 51-84%
  '804': 'weather-cloudy', // Overcast clouds: 85-100%
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MapComponent, MainComponent, GalleryComponent, MatMenu, MatTab, CoordinateFollowerComponent, MatTabGroup],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'backpacking';

  selectedPhoto: PictureCoordinateDTO | undefined;
  photoHovered: PictureCoordinateDTO | undefined;
  selectedCoordinate: CoordinateDto | undefined;
  cameraFollow: CameraFollow = CameraFollow.ON;

  photoSelected($event: PictureCoordinateDTO) {
    this.selectedPhoto = $event;
  }

  photoHover($event: PictureCoordinateDTO) {
    this.photoHovered = $event;
  }

  coordinateSelected($event: CoordinateDto) {
    this.selectedCoordinate = $event;
  }

  cameraFollowChange($event: CameraFollow) {
    this.cameraFollow = $event;
  }

}
