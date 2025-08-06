import {
  Component,
  OnInit,
  Input,
  AfterViewInit,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  DestroyRef,
  inject,
  effect,
  Signal,
  Inject, DOCUMENT
} from '@angular/core';
import { GalleryService } from '../../services/gallery.service';
import { NgGalleryConfig, NgGalleryImage } from '../../models/gallery.model';

@Component({
    selector: 'ngg-gallery',
    templateUrl: 'ng-gallery.component.html',
    styleUrls: ['ng-gallery.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class NgGalleryComponent implements OnInit, AfterViewInit {
  @Input() images: NgGalleryImage[] = [];
  @Input() config: Partial<NgGalleryConfig> = {};

  private destroyRef = inject(DestroyRef);
  private elementRef = inject(ElementRef);

  // Pour la gestion du swipe
  private touchStartX = 0;
  private touchEndX = 0;
  private swipeThreshold = 50; // Distance en px pour détecter un swipe

  constructor(public galleryService: GalleryService,@Inject(DOCUMENT) private document: Document,) {
    // Utiliser effect pour réagir aux changements de l'état
    effect(() => {
      if (this.galleryService.isOpen()) {
        // Actions quand la galerie s'ouvre
        this.document.body.classList.add('ngg-gallery-open');
      } else {
        // Actions quand la galerie se ferme
        this.document.body.classList.remove('ngg-gallery-open');
      }
    });
  }

  ngOnInit(): void {
    // Si des images sont fournies directement au composant, initialiser la galerie
    if (this.images.length > 0) {
      setTimeout(() => {
        this.galleryService.open(this.images, 0, undefined, this.config);
      });
    }
  }

  ngAfterViewInit(): void {
    // Configuration supplémentaire après initialisation de la vue
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.galleryService.isOpen()) return;

    switch(event.key) {
      case 'ArrowLeft':
        this.onPrevClick();
        break;
      case 'ArrowRight':
        this.onNextClick();
        break;
      case 'Escape':
        this.onCloseClick();
        break;
      case ' ': // Espace pour zoomer/dézoomer
      case 'z':
      case 'Z':
        this.zoomAction();
        break;
    }
  }

  onTouchStart(event: TouchEvent): void {
    // Ne gérons pas le swipe si nous sommes en mode zoom
    if (this.galleryService.zoomed()) return;

    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    // Ne gérons pas le swipe si nous sommes en mode zoom
    if (this.galleryService.zoomed()) return;

    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const swipeDistance = this.touchEndX - this.touchStartX;

    if (Math.abs(swipeDistance) > this.swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe de gauche à droite -> image précédente
        this.onPrevClick();
      } else {
        // Swipe de droite à gauche -> image suivante
        this.onNextClick();
      }
    }
  }

  zoomAction(): void {
    if (this.galleryService.config().enableZoom) {
      this.galleryService.toggleZoom();
    }
  }

  onZoomChange(zoomed: boolean): void {
    // Synchroniser l'état de zoom avec le service
    if (this.galleryService.zoomed() !== zoomed) {
      this.galleryService.updateZoomState(zoomed);
    }
  }

  onPrevClick(): void {
    // Ne pas changer d'image en mode zoom
    if (this.galleryService.zoomed()) return;

    this.galleryService.prev();
  }

  onNextClick(): void {
    // Ne pas changer d'image en mode zoom
    if (this.galleryService.zoomed()) return;

    this.galleryService.next();
  }

  onCloseClick(): void {
    // Si en mode zoom, d'abord quitter le zoom
    if (this.galleryService.zoomed()) {
      this.galleryService.updateZoomState(false);
      return;
    }

    this.galleryService.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.galleryService.config().closeOnOutsideClick && event.target === event.currentTarget) {
      // Si en mode zoom, d'abord quitter le zoom
      if (this.galleryService.zoomed()) {
        this.galleryService.updateZoomState(false);
        return;
      }

      this.galleryService.close();
    }
  }
}
