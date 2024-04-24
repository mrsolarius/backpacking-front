import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {CoordinateDto, CoordinateObjsDTO} from "./dto/Coordinate.dto";
import {map, Observable} from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class MapDataService {


  constructor(private http:HttpClient) { }


  public getCoordinates():Observable<CoordinateDto[]>{
    return this.http.get< CoordinateObjsDTO[]>(environment.apiUrl+'coordinates').pipe(map(data=>data.map((c)=>({...c,latitude:parseFloat(c.latitude),longitude:parseFloat(c.longitude), date:new Date(c.date)} as CoordinateDto))))
  }

}
