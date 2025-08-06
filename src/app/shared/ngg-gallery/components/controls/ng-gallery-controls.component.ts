import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'ngg-gallery-controls',
    templateUrl: 'ng-gallery-controls.component.html',
    styleUrls: ['ng-gallery-controls.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class NgGalleryControlsComponent {
  @Input({ required: true }) currentIndex = 0;
  @Input({ required: true }) totalImages = 0;
  @Input() showCounter = true;
  @Input() showZoom = true;
  @Input() isZoomed = false;

  @Output() prevClick = new EventEmitter<void>();
  @Output() nextClick = new EventEmitter<void>();
  @Output() zoomClick = new EventEmitter<void>();
  @Output() closeClick = new EventEmitter<void>();

  onPrevClick(): void {
    this.prevClick.emit();
  }

  onNextClick(): void {
    this.nextClick.emit();
  }

  onZoomClick(): void {
    this.zoomClick.emit();
  }

  onCloseClick(): void {
    this.closeClick.emit();
  }
}
