import { Directive, Input, HostListener, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { NgGalleryGroupDirective } from './ng-gallery-group.directive';
import { NgGalleryImage } from '../models/gallery.model';

@Directive({
    selector: '[ngGalleryItem]',
    standalone: false
})
export class NgGalleryItemDirective implements OnInit, OnDestroy {
  @Input() ngGalleryItem?: NgGalleryImage; // Image directe (optionnelle)
  @Input() ngGalleryItemId?: string; // ID optionnel (pour traçabilité)

  private el = inject(ElementRef);
  private galleryGroup = inject(NgGalleryGroupDirective);

  private itemId: string = '';

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    event.preventDefault();
    this.galleryGroup.openGallery(this.itemId);
  }

  ngOnInit(): void {
    // Déterminer quelle source d'image utiliser (ngGalleryItem ou lightboxImgObj)
    const galleryItem = this.ngGalleryItem;

    if (!galleryItem) {
      console.error('NgGalleryItemDirective: ngGalleryItem ou lightboxImgObj doit être fourni');
      return;
    }

    // Déterminer l'ID de l'élément
    this.itemId = this.ngGalleryItemId || galleryItem.id;

    // Vérifier si l'ID est vide et en générer un si nécessaire
    if (!this.itemId) {
      this.itemId = crypto.randomUUID();
      // Mettre à jour l'ID dans l'objet image
      galleryItem.id = this.itemId;
    }

    // Enregistrer l'élément dans le groupe
    this.galleryGroup.registerItem(this.itemId, galleryItem);
  }

  ngOnDestroy(): void {
    if (this.itemId) {
      this.galleryGroup.unregisterItem(this.itemId);
    }
  }
}
