import {CurrentWeatherDTO, HistoricalWeatherResponse} from "../models/dto/weather.dto";

export function adaptHistoricalToCurrentFormat(response: HistoricalWeatherResponse): CurrentWeatherDTO {
  const historicalData = response.data[0];
  return {
    dt: historicalData.dt,
    main: {
      temp: historicalData.temp,
      feels_like: historicalData.feels_like,
      pressure: historicalData.pressure,
      humidity: historicalData.humidity
    },
    weather: historicalData.weather,
    wind: {
      speed: historicalData.wind_speed,
      deg: historicalData.wind_deg,
      gust: historicalData.wind_gust
    },
    clouds: {all: historicalData.clouds},
    visibility: historicalData.visibility || 10000
  };
}

export function isCurrentWeather(data: any): data is CurrentWeatherDTO {
  return (
    typeof data?.dt === 'number' &&
    typeof data?.main?.temp === 'number' &&
    Array.isArray(data?.weather)
  );
}
