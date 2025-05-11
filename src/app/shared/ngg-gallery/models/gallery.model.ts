export interface NgGalleryImage {
  id: string;
  alt: string;
  caption?: string;

  // Sources d'images
  thumbnail: string;
  defaultSrc: string;

  // Versions responsive simples
  sources?: NgGallerySources[];

  // Pour le zoom
  originalSrc?: string;
}

export interface NgGallerySources {
  srcset: {
    resolution: number; // 1 correspond à 1x, 2 à 2x
    src: string;
  }[];
  minWidth?: number; // Correspond au media min-width en px
  maxWidth?: number; // Correspond au media max-width en px
  media?: string;
  type?: string;
}

export interface NgGalleryConfig {
  animations: boolean;
  showControls: boolean;
  showCounter: boolean;
  enableZoom: boolean;
  captionPosition: 'bottom' | 'top' | 'none';
  closeOnOutsideClick: boolean;
}

export const DEFAULT_GALLERY_CONFIG: NgGalleryConfig = {
  animations: true,
  showControls: true,
  showCounter: true,
  enableZoom: true,
  captionPosition: 'bottom',
  closeOnOutsideClick: true
};

export interface NgGalleryState {
  open: boolean;
  currentIndex: number;
  images: NgGalleryImage[];
  groupId?: string;
  config: NgGalleryConfig;
  zoomed: boolean;
}
