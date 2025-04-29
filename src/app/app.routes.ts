import { Routes } from '@angular/router';
import { TravelListComponent } from './travel/travel-list/travel-list.component';
import { TravelDetailComponent } from './travel/travel-detail/travel-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'travels', pathMatch: 'full' },
  { path: 'travels', component: TravelListComponent },
  { path: 'travels/:id', component: TravelDetailComponent },
  { path: '**', redirectTo: 'travels' } // Redirection vers la liste des voyages en cas de route non trouvée
];
