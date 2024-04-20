import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {CoordinateDTO, CoordinateObjsDTO} from "./dto/CoordinateDTO";
import {map, Observable} from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class MapDataService {


  constructor(private http:HttpClient) { }


  public getCoordinates():Observable<CoordinateDTO[]>{
    return this.http.get< CoordinateObjsDTO[]>(environment.apiUrl+'coordinates').pipe(map(data=>data.map((c)=>({...c,latitude:parseFloat(c.latitude),longitude:parseFloat(c.longitude)} as CoordinateDTO))))
  }

}
