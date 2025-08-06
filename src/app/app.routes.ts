import { Routes } from '@angular/router';
import { TravelListComponent } from './features/travel/travel-list/travel-list.component';
import { TravelDetailComponent } from './features/travel/travel-detail/components/travel-detail/travel-detail.component';
import {travelResolver} from "./features/travel/travel-detail/resolvers/travel-resolver.resolver";

export const routes: Routes = [
  { path: '', redirectTo: 'travels', pathMatch: 'full' },
  { path: 'travels', component: TravelListComponent },
  { path: 'travels/:id', component: TravelDetailComponent,resolve:{travel:travelResolver} },
  { path: '**', redirectTo: 'travels' } // Redirection vers la liste des voyages en cas de route non trouvée
];
