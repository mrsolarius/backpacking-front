import { Observable } from 'rxjs';
import { ReverseGeocodingResponse, ReverseGeocodingParams } from '../models/dto/geocoding.dto';

/**
 * Interface pour les services de géocodage
 */
export interface IGeocodingService {
  /**
   * Récupère les informations de localisation à partir de coordonnées géographiques
   * @param params Les paramètres de géocodage inverse (lat, lon, limit)
   * @returns Un Observable contenant la réponse de géocodage inverse
   */
  getReverseGeocodingData(params: ReverseGeocodingParams): Observable<ReverseGeocodingResponse[]>;
}
