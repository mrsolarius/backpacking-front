export interface CoordinateObjsDTO {
  id: number;
  date: string;
  latitude: string;
  longitude: string;
  created_at: string;
  updated_at: string;
}

export interface CoordinateDto {
  id: number;
  date: Date;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}
