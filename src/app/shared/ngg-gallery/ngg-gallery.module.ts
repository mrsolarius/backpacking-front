// ng-gallery.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgGalleryComponent } from './components/gallery/ng-gallery.component';
import { NgGalleryImageComponent } from './components/gallery-image/ng-gallery-image.component';
import { NgGalleryControlsComponent } from './components/controls/ng-gallery-controls.component';
import { NgGalleryResponsiveImgComponent } from './components/responsive-img/ng-gallery-responsive-img.component';
import { GalleryService } from './services/gallery.service';
import {NgGalleryGroupDirective} from "./directives/ng-gallery-group.directive";
import {NgGalleryItemDirective} from "./directives/ng-gallery-item.directive";
import {GalleryInjectorService} from "./services/gallery-injector.service";
import {ZoomableImageComponent} from "./components/zoomable-image/zoomable-image.component";

@NgModule({
  declarations: [
    NgGalleryComponent,
    NgGalleryImageComponent,
    NgGalleryControlsComponent,
    NgGalleryGroupDirective,
    ZoomableImageComponent,
    NgGalleryItemDirective
  ],
  imports: [
    CommonModule,
    NgGalleryResponsiveImgComponent
  ],
  exports: [
    NgGalleryComponent,
    NgGalleryImageComponent,
    NgGalleryResponsiveImgComponent,
    NgGalleryGroupDirective,
    NgGalleryItemDirective
  ],
  providers: [
    GalleryService,
    GalleryInjectorService
  ]
})
export class NgGalleryModule { }
