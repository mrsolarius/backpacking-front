import { Injectable, signal, computed, Signal } from '@angular/core';
import { NgGalleryConfig, NgGalleryImage, NgGalleryState, DEFAULT_GALLERY_CONFIG } from '../models/gallery.model';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private defaultState: NgGalleryState = {
    open: false,
    currentIndex: 0,
    images: [],
    config: DEFAULT_GALLERY_CONFIG,
    zoomed: false
  };

  // Définir l'état comme un signal
  private state = signal<NgGalleryState>({...this.defaultState});

  // Créer des signals dérivés pour les propriétés principales
  readonly isOpen = computed(() => this.state().open);
  readonly currentIndex = computed(() => this.state().currentIndex);
  readonly images = computed(() => this.state().images);
  readonly config = computed(() => this.state().config);
  readonly zoomed = computed(() => this.state().zoomed);
  readonly currentImage = computed(() => {
    const state = this.state();
    return state.images[state.currentIndex] || null;
  });

  constructor() {}

  /**
   * Ouvre la galerie
   * @param images Liste des images
   * @param index Index initial
   * @param groupId Identifiant du groupe (optionnel)
   * @param config Configuration (optionnel)
   */
  open(images: NgGalleryImage[], index = 0, groupId?: string, config?: Partial<NgGalleryConfig>): void {
    const updatedConfig = { ...DEFAULT_GALLERY_CONFIG, ...config };
    this.state.set({
      open: true,
      currentIndex: index,
      images,
      groupId,
      config: updatedConfig,
      zoomed: false
    });

    // Préchargement des images adjacentes
    this.preloadAdjacentImages();
  }

  /**
   * Ferme la galerie
   */
  close(): void {
    this.state.update(state => ({
      ...state,
      open: false,
      zoomed: false
    }));
  }

  /**
   * Navigue vers l'image suivante
   */
  next(): void {
    this.state.update(state => {
      if (state.currentIndex < state.images.length - 1) {
        return {
          ...state,
          currentIndex: state.currentIndex + 1,
          zoomed: false
        };
      }
      return state;
    });
    this.preloadAdjacentImages();
  }

  /**
   * Navigue vers l'image précédente
   */
  prev(): void {
    this.state.update(state => {
      if (state.currentIndex > 0) {
        return {
          ...state,
          currentIndex: state.currentIndex - 1,
          zoomed: false
        };
      }
      return state;
    });
    this.preloadAdjacentImages();
  }

  /**
   * Active/désactive le zoom sur l'image courante
   */
  toggleZoom(): void {
    this.state.update(state => ({
      ...state,
      zoomed: !state.zoomed
    }));
  }

  /**
   * Récupère l'état complet actuel
   */
  getState(): Signal<NgGalleryState> {
    return this.state.asReadonly();
  }

  /**
   * Précharge l'image suivante et précédente pour améliorer la performance
   */
  preloadAdjacentImages(): void {
    const currentState = this.state();
    const currentIndex = currentState.currentIndex;
    const images = currentState.images;

    // Précharge l'image suivante
    if (currentIndex < images.length - 1) {
      const nextImage = images[currentIndex + 1];
      this.preloadImage(nextImage.defaultSrc);
      if (nextImage.originalSrc) {
        this.preloadImage(nextImage.originalSrc);
      }
    }

    // Précharge l'image précédente
    if (currentIndex > 0) {
      const prevImage = images[currentIndex - 1];
      this.preloadImage(prevImage.defaultSrc);
      if (prevImage.originalSrc) {
        this.preloadImage(prevImage.originalSrc);
      }
    }
  }

  private preloadImage(src: string): void {
    const img = new Image();
    img.src = src;
  }

  updateZoomState(zoomed: boolean): void {
    this.state.update(state => ({
      ...state,
      zoomed
    }));
  }
}
