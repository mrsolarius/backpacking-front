export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherRain {
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherSnow {
  '1h'?: number;
  '3h'?: number;
}

// Interface pour l'API "Current Weather"
export interface CurrentWeatherDTO {
  dt: number;
  name?: string;
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    temp_min?: number;
    temp_max?: number;
  };
  weather: WeatherCondition[];
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  rain?: WeatherRain;
  snow?: WeatherSnow;
  visibility: number;
  sys?: {
    country: string;
    sunrise: number;
    sunset: number;
  };
}

// Interface pour un point de données dans la réponse historique
export interface HistoricalWeatherDataPoint {
  dt: number;
  sunrise?: number;
  sunset?: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point?: number;
  uvi?: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: WeatherCondition[];
  rain?: WeatherRain;
  snow?: WeatherSnow;
}

// Interface pour la réponse de l'API "Time Machine"
export interface HistoricalWeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  data: HistoricalWeatherDataPoint[];
}
