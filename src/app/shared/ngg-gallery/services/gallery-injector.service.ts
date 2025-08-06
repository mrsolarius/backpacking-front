import {
  Injectable,
  inject,
  DestroyRef,
  ApplicationRef,
  EnvironmentInjector,
  ComponentRef,
  createComponent,
  DOCUMENT
} from '@angular/core';
import {NgGalleryComponent} from "../components/gallery/ng-gallery.component";


@Injectable({
  providedIn: 'root'
})
export class GalleryInjectorService {
  private document = inject(DOCUMENT);
  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);
  private destroyRef = inject(DestroyRef);

  private galleryComponentRef: ComponentRef<NgGalleryComponent> | null = null;
  private galleryContainer: HTMLDivElement | null = null;

  constructor() {
    // Nettoyer lorsque l'application est détruite
    this.destroyRef.onDestroy(() => {
      this.destroyGallery();
    });
  }

  ensureGalleryExists(): void {
    if (this.galleryComponentRef) {
      return; // Déjà créé
    }

    // Créer le conteneur
    this.galleryContainer = this.document.createElement('div');
    this.galleryContainer.classList.add('ngg-gallery-container');
    this.document.body.appendChild(this.galleryContainer);

    // Créer le composant avec l'API moderne
    this.galleryComponentRef = createComponent(NgGalleryComponent, {
      environmentInjector: this.envInjector,
      hostElement: this.galleryContainer
    });

    // Attacher à l'appRef pour qu'il soit détecté par change detection
    this.appRef.attachView(this.galleryComponentRef.hostView);
  }

  private destroyGallery(): void {
    if (this.galleryComponentRef) {
      this.appRef.detachView(this.galleryComponentRef.hostView);
      this.galleryComponentRef.destroy();
      this.galleryComponentRef = null;
    }

    if (this.galleryContainer && this.galleryContainer.parentNode) {
      this.galleryContainer.parentNode.removeChild(this.galleryContainer);
      this.galleryContainer = null;
    }
  }
}
