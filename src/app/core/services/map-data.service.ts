// src/app/map/map-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CoordinateDto, CoordinateObjsDTO } from '../models/dto/coordinate.dto';
import { map, Observable, share } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapDataService {
  constructor(private http: HttpClient) {}

  // Récupère les coordonnées d'un voyage spécifique
  public getCoordinatesByTravelId(travelId: number): Observable<CoordinateDto[]> {
    return this.http.get<CoordinateObjsDTO[]>(`${environment.apiUrl}/travels/${travelId}/coordinates`).pipe(
      map(data => data.map((c) => ({
        ...c,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        date: new Date(c.date)
      } as CoordinateDto))),
      map(data => data.sort((a, b) => a.date.getTime() - b.date.getTime())),
      share()
    );
  }
}
