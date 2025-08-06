import {Component, OnInit, Inject, PLATFORM_ID, makeStateKey, TransferState, OnDestroy} from '@angular/core';
import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TravelService } from '../../../../../core/services/travel.service';
import { TravelDTO } from '../../../../../core/models/dto/travel.dto';
import { MapComponent } from '../../../../map/components/map/map.component';
import { GalleryComponent } from '../../../../gallery/gallery.component';
import { CoordinateFollowerComponent } from '../../../../map/components/coordinate-folower/coordinate-follower.component';
import { PictureCoordinateDTO } from '../../../../../core/models/dto/images.dto';
import { CoordinateDto } from '../../../../../core/models/dto/coordinate.dto';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {CameraFollow} from "../../../../map/models/camera-follow.enum";
import {NgGalleryModule} from "../../../../../shared/ngg-gallery/ngg-gallery.module";
import {Subscription} from "rxjs";


@Component({
    selector: 'app-travel-detail',
    imports: [
        CommonModule,
        MapComponent,
        GalleryComponent,
        CoordinateFollowerComponent,
        MatTabsModule,
        MatIconModule,
        MatButtonModule,
        NgGalleryModule
    ],
    templateUrl: './travel-detail.component.html',
    styleUrls: ['./travel-detail.component.scss']
})
export class TravelDetailComponent implements OnInit, OnDestroy {
  travelId: number;
  travel: TravelDTO | null = null
  travelDuration: string = '';
  isBrowser: boolean;

  // Propriétés pour la communication entre composants
  selectedPhoto: PictureCoordinateDTO | undefined;
  photoHovered: PictureCoordinateDTO | undefined;
  selectedCoordinate: CoordinateDto | undefined;
  cameraFollow: CameraFollow = CameraFollow.ON;

  sub=new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private travelService: TravelService,
    @Inject(PLATFORM_ID) platformId: Object,
    private transferState: TransferState
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.travelId = 0; // Sera initialisé dans ngOnInit
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const travelData = data['travel'];

      if (travelData) {
        this.travel = travelData;
        this.travelId = travelData.id;
        this.travelDuration = this.getTravelDuration(travelData);
      } else {
        this.router.navigate(['/travels']);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // Méthodes pour gérer la communication entre composants
  photoSelected(event: PictureCoordinateDTO): void {
    this.selectedPhoto = event;
  }

  photoHover(event: PictureCoordinateDTO): void {
    this.photoHovered = event;
  }

  coordinateSelected(event: CoordinateDto): void {
    this.selectedCoordinate = event;
  }

  cameraFollowChange(event: CameraFollow): void {
    this.cameraFollow = event;
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/travels']);
  }

  getTravelDuration(travel: TravelDTO): string {
    if (!travel.endDate) {
      return 'En cours';
    }
    const diff = travel.endDate.getTime() - travel.startDate.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return `${days} jours`;
  }

}
