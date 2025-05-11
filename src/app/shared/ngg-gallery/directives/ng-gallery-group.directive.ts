import {Directive, Input, Output, EventEmitter, inject, OnInit, signal} from '@angular/core';
import { GalleryService } from '../services/gallery.service';
import { NgGalleryImage, NgGalleryConfig } from '../models/gallery.model';
import {GalleryInjectorService} from "../services/gallery-injector.service";

@Directive({
  selector: '[ngGalleryGroup]',
  exportAs: 'ngGalleryGroup'
})
export class NgGalleryGroupDirective implements OnInit{
  @Input('ngGalleryGroup') groupId: string = 'default';
  @Input() ngGalleryConfig?: Partial<NgGalleryConfig>;

  @Output() galleryOpen = new EventEmitter<void>();
  @Output() galleryClose = new EventEmitter<void>();

  private galleryService = inject(GalleryService);
  private galleryInjectorService = inject(GalleryInjectorService);
  private galleryItems = signal<Map<string, NgGalleryImage>>(new Map());


  ngOnInit(): void {
    this.galleryInjectorService.ensureGalleryExists();
  }

  /**
   * Enregistre une image dans le groupe
   */
  registerItem(id: string, item: NgGalleryImage): void {
    this.galleryItems.update(items => {
      const newItems = new Map(items);
      newItems.set(id, item);
      return newItems;
    });
  }

  /**
   * Supprime une image du groupe
   */
  unregisterItem(id: string): void {
    this.galleryItems.update(items => {
      const newItems = new Map(items);
      newItems.delete(id);
      return newItems;
    });
  }

  /**
   * Ouvre la galerie avec l'image sélectionnée
   */
  openGallery(itemId: string): void {
    const items = this.galleryItems();

    // Convertir Map en Array pour la galerie
    const images: NgGalleryImage[] = Array.from(items.values());

    // Trouver l'index de l'image sélectionnée
    const index = images.findIndex(img => img.id === itemId);

    if (index !== -1) {
      this.galleryService.open(images, index, this.groupId, this.ngGalleryConfig);
      this.galleryOpen.emit();

      // S'abonner à la fermeture de la galerie
      const state = this.galleryService.getState();
      const unsubscribe = effect(() => {
        if (!state().open && unsubscribe) {
          this.galleryClose.emit();
          unsubscribe();
        }
      });
    }
  }

  /**
   * Récupère toutes les images du groupe
   */
  getItems(): NgGalleryImage[] {
    return Array.from(this.galleryItems().values());
  }

}

// Déclaration de la fonction effect (qui serait utilisée dans un contexte réel)
function effect(effectFn: () => void): () => void {
  // Cette implémentation est un placeholder
  // En pratique, vous utiliseriez le vrai effect d'Angular
  const cleanup = () => {};
  effectFn();
  return cleanup;
}
