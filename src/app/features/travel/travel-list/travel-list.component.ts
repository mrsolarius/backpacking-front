import { Component, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TravelService } from '../../../core/services/travel.service';
import { TravelDTO } from '../../../core/models/dto/travel.dto';
import {map, Observable} from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Inject, PLATFORM_ID } from '@angular/core';
import {ImageLoaderDirective} from "../../../shared/ngg-gallery/directives/image-loader.directive";
import {PictureCoordinateDTO} from "../../../core/models/dto/images.dto";
import {environment} from "../../../../environments/environment";
import {
  NgGalleryResponsiveImgComponent
} from "../../../shared/ngg-gallery/components/responsive-img/ng-gallery-responsive-img.component";
import {mapPictureCoordinateToNgGalleryImage} from "../../../core/mappers/images.mapper";
import {PictureDtoMapperPipe} from "../../../shared/directives/picture-dto-mapper.pipe";

@Component({
  selector: 'app-travel-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AsyncPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    ImageLoaderDirective,
    NgGalleryResponsiveImgComponent,
    PictureDtoMapperPipe
  ],
  templateUrl: './travel-list.component.html',
  styleUrls: ['./travel-list.component.scss']
})
export class TravelListComponent implements OnInit {
  travels$!: Observable<TravelDTO[]>;
  isBrowser: boolean;

  constructor(
    private travelService: TravelService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.travels$ = this.travelService.getAllTravels().pipe(
        map(travels =>
          travels.sort((a, b) => {
            const aDate = a.endDate?.getTime() ?? a.startDate.getTime();
            const bDate = b.endDate?.getTime() ?? b.startDate.getTime();
            return bDate-aDate;
          })
        )
      );
    }
  }

  getSrcSet(picture: PictureCoordinateDTO, deviceType: 'desktop' | 'tablet' | 'mobile'): string {
    if (!picture?.versions?.[deviceType]) {
      return '';
    }

    return picture.versions[deviceType]!
      .map(v => `${environment.baseApi}${v.path} ${v.resolution}x`)
      .join(', ');
  }

  getImageUrl(picture: PictureCoordinateDTO, type: 'thumbnail' | 'fullsize' = 'thumbnail'): string {
    if (!picture || !picture.versions) {
      return '';
    }

    if (type === 'fullsize') {
      return `${environment.baseApi}${picture.path}`;
    }

    // Retourne l'URL de la version tablette avec résolution 1x par défaut
    const tabletVersion = picture.versions.tablet?.[0];
    return tabletVersion ? `${environment.baseApi}${tabletVersion.path}` : '';
  }

  protected readonly mapPictureCoordinateToNgGalleryImage = mapPictureCoordinateToNgGalleryImage;
}
