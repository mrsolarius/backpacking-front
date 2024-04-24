import {map, Observable, share} from 'rxjs';
import { CoordinateInputDTO, mapToCoordinateDTO, PictureCoordinateDTO} from './images.dto';
import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private readonly API_URL = 'https://api.backpaking.louisvolat.fr/api/pictures/';

  constructor(private http: HttpClient) {}

  getPictures(): Observable<PictureCoordinateDTO[]> {
    return this.http.get<CoordinateInputDTO[]>(this.API_URL).pipe( map(data => {
      let mappedData = mapToCoordinateDTO(data);
      return mappedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }),share());
  }
}
