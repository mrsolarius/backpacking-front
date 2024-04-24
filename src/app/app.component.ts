import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {MapComponent} from "./map/map.component";
import {MainComponent} from "./main/main.component";
import {GalleryComponent} from "./gallery/gallery.component";
import {PictureCoordinateDTO} from "./gallery/images.dto";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MapComponent, MainComponent, GalleryComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'backpacking';

  selectedPhoto: PictureCoordinateDTO | undefined;
  photoHovered: PictureCoordinateDTO | undefined;

  photoSelected($event: PictureCoordinateDTO) {
    this.selectedPhoto = $event;
  }

  photoHover($event: PictureCoordinateDTO) {
    this.photoHovered = $event;
  }
}
