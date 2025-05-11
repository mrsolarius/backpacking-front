import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'ngg-gallery-controls',
  template: `
    <div class="ngg-controls" role="navigation">
      <button
        type="button"
        class="ngg-control ngg-control-prev"
        [disabled]="currentIndex === 0"
        (click)="onPrevClick()"
        aria-label="Image précédente">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      @if (showCounter) {
        <div class="ngg-counter" aria-live="polite">
          {{ currentIndex + 1 }} / {{ totalImages }}
        </div>
      }

      <button
        type="button"
        class="ngg-control ngg-control-next"
        [disabled]="currentIndex === totalImages - 1"
        (click)="onNextClick()"
        aria-label="Image suivante">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <button
        type="button"
        class="ngg-control ngg-control-close"
        (click)="onCloseClick()"
        aria-label="Fermer">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .ngg-controls {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 15px;
      z-index: 10;
    }

    .ngg-control {
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .ngg-control:hover {
      background: rgba(0, 0, 0, 0.7);
    }

    .ngg-control:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .ngg-counter {
      background: rgba(0, 0, 0, 0.5);
      color: white;
      padding: 5px 10px;
      border-radius: 15px;
      align-self: center;
      font-size: 14px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgGalleryControlsComponent {
  @Input({ required: true }) currentIndex = 0;
  @Input({ required: true }) totalImages = 0;
  @Input() showCounter = true;

  @Output() prevClick = new EventEmitter<void>();
  @Output() nextClick = new EventEmitter<void>();
  @Output() closeClick = new EventEmitter<void>();

  onPrevClick(): void {
    this.prevClick.emit();
  }

  onNextClick(): void {
    this.nextClick.emit();
  }

  onCloseClick(): void {
    this.closeClick.emit();
  }
}
