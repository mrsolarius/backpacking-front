import { Component, Input } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { CurrentWeatherDTO } from "../../../../core/models/dto/weather.dto";

@Component({
    selector: 'app-weather-metrics',
    imports: [
        MatIcon
    ],
    templateUrl: './weather-metric.component.html',
    styleUrls: ['./weather-metric.component.scss']
})
export class WeatherMetricsComponent {
  @Input() weatherData?: CurrentWeatherDTO;
}
