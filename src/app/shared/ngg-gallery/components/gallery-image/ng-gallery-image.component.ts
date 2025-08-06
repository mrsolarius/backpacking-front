import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { NgGalleryImage } from '../../models/gallery.model';

@Component({
    selector: 'ngg-gallery-image',
    templateUrl: 'ng-gallery-image.component.html',
    styleUrls: ['ng-gallery-image.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class NgGalleryImageComponent {
  @Input({ required: true }) image!: NgGalleryImage;
  @Input() zoomed = false;
  @Output() imageClick = new EventEmitter<void>();

  private tapCount = 0;
  private lastTapTime = 0;
  private doubleTapDelay = 300; // ms

  onImageClick(): void {
    this.imageClick.emit();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    if (timeSinceLastTap < this.doubleTapDelay && this.tapCount === 1) {
      // Double tap détecté
      event.preventDefault();
      this.imageClick.emit();
      this.tapCount = 0;
      return;
    }

    this.tapCount = 1;
    this.lastTapTime = currentTime;

    // Reset le compteur après le délai
    setTimeout(() => {
      this.tapCount = 0;
    }, this.doubleTapDelay);
  }

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
