import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TravelService } from '../../../core/services/travel.service';
import { TravelDTO } from '../../../core/models/dto/travel.dto';
import { MapComponent } from '../../map/map.component';
import { GalleryComponent } from '../../gallery/gallery.component';
import { CoordinateFollowerComponent, CameraFollow } from '../../map/coordinate-folower/coordinate-follower.component';
import { PictureCoordinateDTO } from '../../../core/models/dto/images.dto';
import { CoordinateDto } from '../../../core/models/dto/coordinate.dto';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-travel-detail',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    GalleryComponent,
    CoordinateFollowerComponent,
    MatTabsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './travel-detail.component.html',
  styleUrls: ['./travel-detail.component.scss']
})
export class TravelDetailComponent implements OnInit {
  travelId: number;
  travel: TravelDTO | null = null;
  isBrowser: boolean;

  // Propriétés pour la communication entre composants
  selectedPhoto: PictureCoordinateDTO | undefined;
  photoHovered: PictureCoordinateDTO | undefined;
  selectedCoordinate: CoordinateDto | undefined;
  cameraFollow: CameraFollow = CameraFollow.ON;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private travelService: TravelService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.travelId = 0; // Sera initialisé dans ngOnInit
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.travelId = +id;
          this.loadTravelDetails();
        } else {
          this.router.navigate(['/travels']);
        }
      });
    }
  }

  loadTravelDetails(): void {
    this.travelService.getTravelById(this.travelId, true).subscribe({
      next: (travel) => {
        this.travel = travel;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du voyage:', err);
        this.router.navigate(['/travels']);
      }
    });
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
}
