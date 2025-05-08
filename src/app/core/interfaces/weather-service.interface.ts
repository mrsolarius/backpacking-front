import { Observable } from 'rxjs';
import { CurrentWeatherDTO, HistoricalWeatherResponse } from '../models/dto/weather.dto';

export interface IWeatherService {
  /**
   * Récupère les données météo historiques pour une date spécifique
   * @param lat Latitude
   * @param lon Longitude
   * @param date Date pour laquelle récupérer les données historiques
   * @returns Un Observable contenant la réponse de météo historique
   */
  getHistoricalWeatherData(lat: number, lon: number, date: Date): Observable<HistoricalWeatherResponse>;

  /**
   * Récupère les données météo actuelles
   * @param lat Latitude
   * @param lon Longitude
   * @returns Un Observable contenant les données météo actuelles
   */
  getCurrentWeatherData(lat: number, lon: number): Observable<CurrentWeatherDTO>;
}
