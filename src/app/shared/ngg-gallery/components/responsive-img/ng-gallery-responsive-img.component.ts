import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgGalleryImage } from '../../models/gallery.model';
import {ImageLoaderDirective} from "../../directives/image-loader.directive";

@Component({
    selector: 'ngg-responsive-img',
    template: `
    <picture appImageLoader>
      @for (source of ngGalleryItem.sources || []; track source) {
        <source
          [attr.media]="getMediaQuery(source)"
          [attr.type]="source.type"
          [attr.srcset]="getSrcset(source.srcset)">
      }
      <img
        [class]="cssClassImg"
        [src]="ngGalleryItem.defaultSrc"
        [alt]="ngGalleryItem.alt"
        class="ngg-responsive-img"
        loading="lazy">
    </picture>
  `,
    styles: [`
    .ngg-responsive-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ImageLoaderDirective
    ]
})
export class NgGalleryResponsiveImgComponent {
  @Input({ required: true }) ngGalleryItem!: NgGalleryImage;
  @Input() cssClassImg: string = '';

  getMediaQuery(source: any): string {
    if (source.media) {
      return source.media;
    }

    const conditions: string[] = [];

    if (source.minWidth) {
      conditions.push(`(min-width: ${source.minWidth}px)`);
    }

    if (source.maxWidth) {
      conditions.push(`(max-width: ${source.maxWidth}px)`);
    }

    return conditions.join(' and ');
  }

  getSrcset(srcset: any[]): string {
    return srcset.map(item => `${item.src} ${item.resolution}x`).join(', ');
  }
}
