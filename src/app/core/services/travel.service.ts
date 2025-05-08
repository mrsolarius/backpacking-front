import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, share } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TravelDTO, TravelInputDTO, mapToTravelDTO, mapToTravelDTOList } from '../models/dto/travel.dto';

@Injectable({
  providedIn: 'root'
})
export class TravelService {
  private readonly API_URL = environment.apiUrl + '/travels';

  constructor(private http: HttpClient) {}

  // Récupère tous les voyages
  getAllTravels(): Observable<TravelDTO[]> {
    return this.http.get<TravelInputDTO[]>(this.API_URL).pipe(
      map(data => mapToTravelDTOList(data)),
      share()
    );
  }

  // Récupère un voyage spécifique
  getTravelById(id: number, includeDetails: boolean = false): Observable<TravelDTO> {
    return this.http.get<TravelInputDTO>(`${this.API_URL}/${id}?includeDetails=${includeDetails}`).pipe(
      map(data => mapToTravelDTO(data)),
      share()
    );
  }

  // Récupère les voyages de l'utilisateur connecté
  getMyTravels(includeDetails: boolean = false): Observable<TravelDTO[]> {
    return this.http.get<TravelInputDTO[]>(`${this.API_URL}/mine?includeDetails=${includeDetails}`).pipe(
      map(data => mapToTravelDTOList(data)),
      share()
    );
  }

  // Crée un nouveau voyage
  createTravel(travelData: any): Observable<TravelDTO> {
    return this.http.post<TravelInputDTO>(this.API_URL, travelData).pipe(
      map(data => mapToTravelDTO(data))
    );
  }

  // Met à jour un voyage existant
  updateTravel(id: number, travelData: any): Observable<TravelDTO> {
    return this.http.put<TravelInputDTO>(`${this.API_URL}/${id}`, travelData).pipe(
      map(data => mapToTravelDTO(data))
    );
  }

  // Supprime un voyage
  deleteTravel(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
