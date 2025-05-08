import { PictureCoordinateDTO } from './images.dto';
import { CoordinateDto } from './coordinate.dto';

export interface TravelInputDTO {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  coverPicture: any | null; // À ajuster selon le format exact
  userId: number;
  coordinates: any[] | null; // À ajuster selon le format exact
  pictures: any[] | null; // À ajuster selon le format exact
  createdAt: string;
  updatedAt: string;
}

export interface TravelDTO {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  coverPicture: PictureCoordinateDTO | null;
  userId: number;
  coordinates: CoordinateDto[] | null;
  pictures: PictureCoordinateDTO[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapToTravelDTO(data: TravelInputDTO): TravelDTO {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    coverPicture: data.coverPicture, // À transformer si nécessaire
    userId: data.userId,
    coordinates: data.coordinates, // À transformer si nécessaire
    pictures: data.pictures, // À transformer si nécessaire
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt)
  };
}

export function mapToTravelDTOList(data: TravelInputDTO[]): TravelDTO[] {
  return data.map(item => mapToTravelDTO(item));
}
