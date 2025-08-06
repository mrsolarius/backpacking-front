// gallery.component.ts amélioré
import { Component, EventEmitter, Inject, Input, OnInit, Output, PLATFORM_ID, DOCUMENT } from '@angular/core';
import {AsyncPipe, CommonModule, isPlatformBrowser} from "@angular/common";
import { PictureCoordinateDTO } from "../../core/models/dto/images.dto";
import { GalleryService } from "../../core/services/gallery.service";
import { BehaviorSubject, Observable, distinctUntilChanged, map, switchMap } from "rxjs";
import { MatIcon } from "@angular/material/icon";
import { environment } from "../../../environments/environment";
import { ImageLoaderDirective } from "../../shared/ngg-gallery/directives/image-loader.directive";
import {
  NgGalleryResponsiveImgComponent
} from "../../shared/ngg-gallery/components/responsive-img/ng-gallery-responsive-img.component";
import { mapPictureCoordinateToNgGalleryImage } from '../../core/mappers/images.mapper';
import {PictureDtoMapperPipe} from "../../shared/directives/picture-dto-mapper.pipe";
import {NgGalleryModule} from "../../shared/ngg-gallery/ngg-gallery.module";
import {NgGalleryGroupDirective} from "../../shared/ngg-gallery/directives/ng-gallery-group.directive";

@Component({
    selector: 'app-gallery',
    imports: [
        AsyncPipe,
        CommonModule,
        MatIcon,
        NgGalleryResponsiveImgComponent,
        PictureDtoMapperPipe,
        NgGalleryModule,
    ],
    templateUrl: './gallery.component.html',
    styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit {
  protected readonly storageURL = environment.baseApi;
  isBrowser: boolean;

  private travelIdSubject = new BehaviorSubject<number>(0);
  private _selectedPhotoSubject = new BehaviorSubject<PictureCoordinateDTO | undefined>(undefined);

  selectedPhotoObs = this._selectedPhotoSubject.asObservable().pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id));
  selectedIndex: number = 0;

  @Input() set travelId(value: number) {
    this.travelIdSubject.next(value);
  }
  get travelId(): number {
    return this.travelIdSubject.value;
  }

  @Input() set selectedPhoto(value: PictureCoordinateDTO | undefined) {
    this._selectedPhotoSubject.next(value);
  }
  get selectedPhoto(): PictureCoordinateDTO | undefined {
    return this._selectedPhotoSubject.value;
  }

  @Output() photoHover = new EventEmitter<PictureCoordinateDTO>();

  picturesObs: Observable<PictureCoordinateDTO[]>;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private galleryService: GalleryService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Réagir aux changements de travel ID et charger les images correspondantes
    this.picturesObs = this.travelIdSubject.pipe(
      distinctUntilChanged(),
      switchMap(travelId => travelId ? this.galleryService.getPicturesByTravelId(travelId) : [])
    );

    // Observer les changements de photo sélectionnée et mettre à jour l'index
    this.selectedPhotoObs.subscribe(selectedPhoto => {
      if (selectedPhoto) {
        this.updateSelectedIndex(selectedPhoto);
      }
    });
  }

  ngOnInit() {
    // Pas besoin de vérifier isBrowser ici car on utilise déjà les observables
  }

  private updateSelectedIndex(photo: PictureCoordinateDTO): void {
    this.picturesObs.pipe(
      map(pictures => pictures.findIndex(p => p.id === photo.id))
    ).subscribe(index => {
      if (index !== -1) {
        this.selectedIndex = index;
        this.scrollToSelectedImage(photo.id);
      }
    });
  }

  private scrollToSelectedImage(id: number): void {
    if (this.isBrowser) {
      setTimeout(() => {
        const element = this.document.getElementById(id.toString());
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }

  getImageUrl(picture: PictureCoordinateDTO, type: 'thumbnail' | 'fullsize' = 'thumbnail'): string {
    if (!picture || !picture.versions) {
      return '';
    }

    if (type === 'fullsize') {
      return `${this.storageURL}${picture.path}`;
    }

    // Retourne l'URL de la version tablette avec résolution 1x par défaut
    const tabletVersion = picture.versions.tablet?.[0];
    return tabletVersion ? `${this.storageURL}${tabletVersion.path}` : '';
  }

  getSrcSet(picture: PictureCoordinateDTO, deviceType: 'desktop' | 'tablet' | 'mobile'): string {
    if (!picture?.versions?.[deviceType]) {
      return '';
    }

    return picture.versions[deviceType]!
      .map(v => `${this.storageURL}${v.path} ${v.resolution}x`)
      .join(', ');
  }

  getImageOrientation(picture: PictureCoordinateDTO): 'landscape' | 'portrait' {
    return picture.width > picture.height ? 'landscape' : 'portrait';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }

  shouldShowDate(pictures: PictureCoordinateDTO[], index: number): boolean {
    if (index === 0) return true;

    const currentDate = pictures[index].date;
    const previousDate = pictures[index - 1].date;

    return currentDate.getDay() !== previousDate.getDay();
  }

  imageHover(picture: PictureCoordinateDTO): void {
    this.photoHover.emit(picture);
  }
}
