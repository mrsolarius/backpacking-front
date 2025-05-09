export interface IMapMarkerPoolService {
  /**
   * Initialise les pools de marqueurs
   */
  initMarkerPool(): void;

  /**
   * Récupère un marqueur photo du pool ou en crée un nouveau
   */
  getMarkerFromPool(): HTMLDivElement;

  /**
   * Retourne un marqueur au pool
   */
  returnMarkerToPool(element: HTMLDivElement): void;
}
