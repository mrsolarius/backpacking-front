import { Component, Input } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { CurrentWeatherDTO } from "../../../../core/models/dto/weather.dto";

@Component({
  selector: 'app-weather-display',
  standalone: true,
  templateUrl: './weather-display.component.html',
  styleUrls: ['./weather-display.component.scss']
})
export class WeatherDisplayComponent {
  @Input() weatherData?: CurrentWeatherDTO;
  @Input() timeOfDay: string = 'day';

  // Mapper pour les icônes météo
  private weatherIconMap: {[key: string]: string} = {
    '200': 'thunder.svg', '201': 'thunder.svg', '202': 'thunder.svg',
    '210': 'thunder.svg', '211': 'thunder.svg', '212': 'thunder.svg',
    '221': 'thunder.svg', '230': 'thunder.svg', '231': 'thunder.svg',
    '232': 'thunder.svg', '300': 'rainy-1.svg', '301': 'rainy-2.svg',
    '302': 'rainy-3.svg', '310': 'rainy-4.svg', '311': 'rainy-5.svg',
    '312': 'rainy-6.svg', '313': 'rainy-7.svg', '314': 'rainy-7.svg',
    '321': 'rainy-1.svg', '500': 'rainy-1.svg', '501': 'rainy-2.svg',
    '502': 'rainy-3.svg', '503': 'rainy-4.svg', '504': 'rainy-5.svg',
    '511': 'snowy-1.svg', '520': 'rainy-1.svg', '521': 'rainy-2.svg',
    '522': 'rainy-3.svg', '531': 'rainy-4.svg', '600': 'snowy-1.svg',
    '601': 'snowy-2.svg', '602': 'snowy-3.svg', '611': 'snowy-4.svg',
    '612': 'snowy-5.svg', '613': 'snowy-6.svg', '615': 'snowy-1.svg',
    '616': 'snowy-2.svg', '620': 'snowy-3.svg', '621': 'snowy-4.svg',
    '622': 'snowy-5.svg', '701': 'cloudy.svg', '711': 'cloudy.svg',
    '721': 'cloudy.svg', '731': 'cloudy.svg', '741': 'cloudy.svg',
    '751': 'cloudy.svg', '761': 'cloudy.svg', '762': 'cloudy.svg',
    '771': 'cloudy.svg', '781': 'cloudy.svg', '800': 'day.svg',
    '800n': 'night.svg', '801': 'cloudy-day-1.svg', '801n': 'cloudy-night-1.svg',
    '802': 'cloudy-day-2.svg', '802n': 'cloudy-night-2.svg',
    '803': 'cloudy-day-3.svg', '803n': 'cloudy-night-3.svg',
    '804': 'cloudy.svg',
  };

  getWeatherIcon(weatherData: CurrentWeatherDTO): string {
    if (!weatherData || !weatherData.weather || !weatherData.weather[0]) {
      return `${this.timeOfDay}.svg`;
    }

    const weatherId = weatherData.weather[0].id;
    const isNight = this.timeOfDay === 'night';

    // Cas spéciaux pour certains IDs qui ont des variantes jour/nuit
    if (weatherId === 800) {
      return isNight ? 'night.svg' : 'day.svg';
    } else if ([801, 802, 803].includes(weatherId)) {
      const suffix = isNight ? 'n' : '';
      return this.weatherIconMap[`${weatherId}${suffix}`] || 'cloudy.svg';
    }

    return this.weatherIconMap[weatherId.toString()] || 'cloudy.svg';
  }
}
