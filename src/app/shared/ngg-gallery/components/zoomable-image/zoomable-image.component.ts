import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  ElementRef, ViewChild, AfterViewInit, HostListener,
  OnDestroy, signal, computed, NgZone } from '@angular/core';
import { NgGalleryImage } from '../../models/gallery.model';
import { fromEvent, Subscription } from 'rxjs';

interface ZoomState {
  scale: number;         // Niveau de zoom actuel
  translateX: number;    // Position horizontale
  translateY: number;    // Position verticale
  originX: number;       // Point d'origine X pour le zoom
  originY: number;       // Point d'origine Y pour le zoom
}

@Component({
  selector: 'ngg-zoomable-image',
  templateUrl: './zoomable-image.component.html',
  styleUrls: ['./zoomable-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoomableImageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('imageContainer') imageContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('zoomableImg') zoomableImg!: ElementRef<HTMLImageElement>;

  @Input({ required: true }) image!: NgGalleryImage;
  @Input() set zoom(value: boolean) {
    const oldValue = this.isZoomed();
    if (oldValue !== value) {
      this.isZoomed.set(value);
      this.updateZoomStateBasedOnZoomLevel(value);
    }
  }
  @Output() zoomChange = new EventEmitter<boolean>();
  @Output() imageClick = new EventEmitter<void>();

  // États réactifs avec signals
  isZoomed = signal<boolean>(false);
  zoomState = signal<ZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    originX: 50,
    originY: 50
  });

  // Valeurs dérivées
  imageTransform = computed(() => {
    const state = this.zoomState();
    return `scale(${state.scale}) translate(${state.translateX}px, ${state.translateY}px)`;
  });

  imageStyle = computed(() => {
    const state = this.zoomState();
    return {
      'transform': this.imageTransform(),
      'transform-origin': `${state.originX}% ${state.originY}%`,
      'cursor': this.isZoomed() ? 'grab' : 'zoom-in'
    };
  });

  // Variables pour la gestion des interactions
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private initialPinchDistance = 0;
  private maxScale = 3;
  private minScale = 1;

  // Pour le nettoyage des subscriptions rxjs
  private subscriptions: Subscription[] = [];

  // Ref vers l'image pour les calculs
  private imgElement!: HTMLImageElement;
  private containerElement!: HTMLDivElement;

  constructor(private ngZone: NgZone) {
    // Au lieu d'utiliser effect pour mettre à jour directement le signal zoomState,
    // nous utilisons une méthode dédiée appelée depuis le setter de zoom
  }

  // Méthode pour mettre à jour l'état de zoom en fonction du niveau de zoom
  private updateZoomStateBasedOnZoomLevel(zoomed: boolean): void {
    if (zoomed) {
      this.zoomState.update(state => ({
        ...state,
        scale: 2, // Zoom initial
        translateX: 0,
        translateY: 0
      }));
    } else {
      this.zoomState.update(state => ({
        ...state,
        scale: 1,
        translateX: 0,
        translateY: 0
      }));
    }
  }

  ngAfterViewInit(): void {
    this.imgElement = this.zoomableImg.nativeElement;
    this.containerElement = this.imageContainer.nativeElement;

    // Configurer les listeners pour des événements qui ne peuvent pas être gérés avec @HostListener
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    // Nettoyage des subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupEventListeners(): void {
    // On s'exécute en dehors de la zone Angular pour certains écouteurs d'événements
    // afin d'améliorer les performances (éviter la détection de changements inutile)
    this.ngZone.runOutsideAngular(() => {
      // Listener pour wheel avec options
      const wheelSub = fromEvent<WheelEvent>(this.containerElement, 'wheel', { passive: false })
        .subscribe(e => {
          this.handleWheel(e);

          // Si besoin de déclencher la détection de changements
          if (e.deltaY > 0 && this.zoomState().scale <= this.minScale) {
            this.ngZone.run(() => {
              this.toggleZoom();
            });
          }
        });

      // Listeners pour touchmove avec options
      const touchMoveSub = fromEvent<TouchEvent>(window, 'touchmove', { passive: false })
        .subscribe(e => {
          this.handleTouchMove(e);
        });

      this.subscriptions.push(wheelSub, touchMoveSub);
    });
  }

  // HostListener pour la souris sur le composant hôte
  @HostListener('dblclick', ['$event'])
  onDoubleClick(e: MouseEvent): void {
    if (!this.imgElement) return;
    e.preventDefault();

    if (!this.isZoomed()) {
      // Calculer l'origine du zoom (position du curseur)
      const rect = this.imgElement.getBoundingClientRect();
      const originX = ((e.clientX - rect.left) / rect.width) * 100;
      const originY = ((e.clientY - rect.top) / rect.height) * 100;

      // Définir le point d'origine avant de zoomer
      this.zoomState.update(state => ({
        ...state,
        originX,
        originY
      }));
    }

    this.toggleZoom();
  }

  // HostListener pour événements souris/tactiles sur l'image
  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    if (!this.isZoomed()) {
      return;
    }

    e.preventDefault();
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.updateCursor(true);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.isZoomed()) {
      return;
    }

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.pan(deltaX, deltaY);
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
    this.updateCursor(false);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.updateCursor(false);
    }
  }

  // Événements tactiles
  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      // Déplacement avec un doigt
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Pincement pour zoom avec deux doigts
      this.initialPinchDistance = this.getPinchDistance(e);
    }
  }

  @HostListener('window:touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      this.isDragging = false;

      // Si l'échelle est proche de 1, réinitialiser le zoom
      if (this.zoomState().scale < 1.1) {
        this.toggleZoom();
      }
    }
  }

  // Les méthodes privées
  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging && this.isZoomed()) {
      // Déplacement avec un doigt
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastMouseX;
      const deltaY = touch.clientY - this.lastMouseY;

      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;

      this.pan(deltaX, deltaY);
    } else if (e.touches.length === 2) {
      // Pincement pour zoom avec deux doigts
      const currentDistance = this.getPinchDistance(e);
      const scaleFactor = currentDistance / this.initialPinchDistance;

      // Calculer le point central du pincement
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      if (this.imgElement) {
        // Convertir en coordonnées relatives à l'image
        const rect = this.imgElement.getBoundingClientRect();
        const originX = ((centerX - rect.left) / rect.width) * 100;
        const originY = ((centerY - rect.top) / rect.height) * 100;

        // Mettre à jour l'état de zoom
        this.ngZone.run(() => {
          this.setZoomLevel(
            this.zoomState().scale * scaleFactor,
            originX,
            originY
          );
        });
      }

      this.initialPinchDistance = currentDistance;
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.isZoomed() || !this.imgElement) {
      return;
    }

    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.zoomState().scale + delta));

    // Calculer l'origine du zoom (position du curseur)
    const rect = this.imgElement.getBoundingClientRect();
    const originX = ((e.clientX - rect.left) / rect.width) * 100;
    const originY = ((e.clientY - rect.top) / rect.height) * 100;

    this.ngZone.run(() => {
      this.setZoomLevel(newScale, originX, originY);
    });
  }

  // Calcul de la distance pour le pincement
  private getPinchDistance(e: TouchEvent): number {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }

  // Fonctions utilitaires
  private pan(deltaX: number, deltaY: number): void {
    if (!this.imgElement || !this.containerElement) return;

    // Calculer les limites de déplacement
    const imgRect = this.imgElement.getBoundingClientRect();
    const containerRect = this.containerElement.getBoundingClientRect();

    const scale = this.zoomState().scale;
    const scaledWidth = imgRect.width * scale;
    const scaledHeight = imgRect.height * scale;

    const maxTranslateX = (scaledWidth - containerRect.width) / (2 * scale);
    const maxTranslateY = (scaledHeight - containerRect.height) / (2 * scale);

    // Mettre à jour la position en respectant les limites
    this.zoomState.update(state => {
      const newTranslateX = Math.min(maxTranslateX, Math.max(-maxTranslateX, state.translateX + deltaX / scale));
      const newTranslateY = Math.min(maxTranslateY, Math.max(-maxTranslateY, state.translateY + deltaY / scale));

      return {
        ...state,
        translateX: newTranslateX,
        translateY: newTranslateY
      };
    });
  }

  private setZoomLevel(scale: number, originX: number, originY: number): void {
    // Limiter l'échelle entre min et max
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, scale));

    // Si l'échelle change significativement, mettre à jour isZoomed
    const wasZoomed = this.isZoomed();
    const willBeZoomed = clampedScale > this.minScale;

    if (wasZoomed !== willBeZoomed) {
      this.isZoomed.set(willBeZoomed);
      this.zoomChange.emit(willBeZoomed);
    }

    // Mettre à jour l'état de zoom
    this.zoomState.update(state => ({
      ...state,
      scale: clampedScale,
      originX,
      originY
    }));
  }

  private updateCursor(isGrabbing: boolean): void {
    if (this.imgElement) {
      this.imgElement.style.cursor = isGrabbing ? 'grabbing' : 'grab';
    }
  }

  // Fonction publique pour basculer le zoom
  toggleZoom(): void {
    const newZoomed = !this.isZoomed();
    this.isZoomed.set(newZoomed);
    this.updateZoomStateBasedOnZoomLevel(newZoomed);
    this.zoomChange.emit(newZoomed);
  }

  // Clic sur l'image
  onImageClick(event: MouseEvent): void {
    // Empêcher la propagation du clic pour éviter la fermeture de la galerie
    event.stopPropagation();

    // Émettre l'événement de clic
    this.imageClick.emit();
  }

  // Fonctions pour le template
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
