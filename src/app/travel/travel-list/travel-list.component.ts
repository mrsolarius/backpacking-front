import { Component, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TravelService } from '../travel.service';
import { TravelDTO } from '../dto/travel.dto';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Inject, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-travel-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AsyncPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule
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
      this.travels$ = this.travelService.getAllTravels();
    }
  }

  getCoverImageUrl(travel: TravelDTO): string {
    if (travel.coverPicture && travel.coverPicture.path) {
      return `https://api.backpaking.louisvolat.fr/storage/${travel.coverPicture.path}/l.webp`;
    }
    return 'assets/placeholder-travel.jpg'; // Image par défaut si pas de couverture
  }
}
