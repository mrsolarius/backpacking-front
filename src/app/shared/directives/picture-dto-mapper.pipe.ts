import { Pipe, PipeTransform } from '@angular/core';
import {mapPictureCoordinateToNgGalleryImage} from "../../core/mappers/images.mapper";
import {PictureCoordinateDTO} from "../../core/models/dto/images.dto";
import {NgGalleryImage} from "../ngg-gallery/models/gallery.model";

@Pipe({
  name: 'pictureDTOMapper',
  standalone: true
})
export class PictureDtoMapperPipe implements PipeTransform {

  transform(value: PictureCoordinateDTO): NgGalleryImage {
    return mapPictureCoordinateToNgGalleryImage(value);
  }
}
