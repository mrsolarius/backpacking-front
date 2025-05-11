import { Pipe, PipeTransform } from '@angular/core';
import {PictureCoordinateDTO} from "../../core/models/dto/images.dto";
import {NgGalleryImage} from "../ngg-gallery/models/gallery.model";
import {mapPictureCoordinateToNgGalleryImage} from "../../core/mappers/images.mapper";

@Pipe({
  name: 'pictureArrayDtoMapper',
  standalone: true
})
export class PictureArrayDtoMapperPipe implements PipeTransform {

  transform(value: PictureCoordinateDTO[]): NgGalleryImage[] {
    return value.map(mapPictureCoordinateToNgGalleryImage);
  }

}
