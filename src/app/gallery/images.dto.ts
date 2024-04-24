export interface CoordinateInputDTO {
  id: number;
  path: string;
  latitude: string;
  longitude: string;
  altitude: string;
  date: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
}

export interface PictureCoordinateDTO {
  id: number;
  path: string;
  latitude: number;
  longitude: number;
  altitude: number;
  date: Date;
  created_at: Date;
  updated_at: Date;
  width: number;
  height: number;
}

export function mapToCoordinateDTO(data: CoordinateInputDTO[]): PictureCoordinateDTO[] {
  return data.map(item => ({
    id: item.id,
    path: item.path,
    latitude: parseFloat(item.latitude),
    longitude: parseFloat(item.longitude),
    altitude: parseFloat(item.altitude),
    date: new Date(item.date),
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
    width: item.width,
    height: item.height
  }));
}
