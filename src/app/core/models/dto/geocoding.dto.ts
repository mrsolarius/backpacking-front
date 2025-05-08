/**
 * Interface pour les noms localisés d'un lieu
 */
export interface LocalNames {
  [languageCode: string]: string;
}

/**
 * Interface pour la réponse de l'API de géocodage inverse
 */
export interface ReverseGeocodingResponse {
  name: string;
  local_names?: LocalNames;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

/**
 * Paramètres pour la requête de géocodage inverse
 */
export interface ReverseGeocodingParams {
  lat: number;
  lon: number;
  limit?: number;
}
