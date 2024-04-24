import {Component, EventEmitter, Inject, Input, Output, PLATFORM_ID} from '@angular/core';
import {AsyncPipe, CommonModule, isPlatformBrowser, NgOptimizedImage} from "@angular/common";
import {PictureCoordinateDTO} from "./images.dto";
import {GalleryService} from "./gallery.service";
import {first, Observable} from "rxjs";
import {PhotoGalleryModule} from "@twogate/ngx-photo-gallery";

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    AsyncPipe,
    NgOptimizedImage,
    CommonModule,
    PhotoGalleryModule
  ],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent {
  protected static storageURL = 'https://api.backpaking.louisvolat.fr/storage';
  isBrowser: boolean;
  constructor(@Inject(PLATFORM_ID) platformId: Object, private galleryService: GalleryService) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  selectedPhotoValue: PictureCoordinateDTO | undefined;

  @Input()
  set selectedPhoto(value: PictureCoordinateDTO | undefined) {
    this.selectedPhotoValue = value;
    if (value) {
      this.picturesObs.pipe(first()).subscribe((items)=>this.selectedIndex=items.findIndex(picture => picture.id === value.id));
      let element = document.getElementById(value.id.toString());
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  @Output()
  photoHover = new EventEmitter<PictureCoordinateDTO>();


  protected picturesObs: Observable<PictureCoordinateDTO[]> = this.galleryService.getPictures();
  selectedIndex: any;



  getPituresUrl(picture: PictureCoordinateDTO,size:string): string {
    if (size === "raw"){
      return `${GalleryComponent.storageURL}/${picture.path}/${size}.jpg`;
    }
    return `${GalleryComponent.storageURL}/${picture.path}/${size}.webp`;
  }

  imageHover( pict: PictureCoordinateDTO) {
    this.photoHover.emit(pict);
  }

  galleryinit($event: any) {
    
  }
}


interface PictureDetails {
  srcset: string;
  media: string;
}
