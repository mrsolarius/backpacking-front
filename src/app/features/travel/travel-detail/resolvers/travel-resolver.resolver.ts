import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TravelService } from "../../../../core/services/travel.service";
import { TravelDTO } from '../../../../core/models/dto/travel.dto';

export const travelResolver: ResolveFn<TravelDTO | null> = (route, state) => {
  const travelService = inject(TravelService);
  const travelId = route.paramMap.get('id');

  if (!travelId) {
    console.error('Travel ID not found in route parameters');
    return of(null);
  }

  const id = parseInt(travelId, 10);
  if (isNaN(id)) {
    console.error('Invalid Travel ID:', travelId);
    return of(null);
  }

  // On délègue complètement la gestion du cache et du transfer state au service
  return travelService.getTravelById(id, true).pipe(
    catchError(err => {
      console.error('Error fetching travel details:', err);
      return of(null);
    })
  );
};
