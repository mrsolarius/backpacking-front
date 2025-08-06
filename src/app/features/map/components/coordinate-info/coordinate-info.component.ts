import { Component, Input } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { CoordinateDto } from "../../../../core/models/dto/coordinate.dto";

@Component({
    selector: 'app-coordinate-info',
    imports: [
        MatIcon
    ],
    templateUrl: 'coordinate-info.component.html',
    styleUrls: ['coordinate-info.component.scss']
})
export class CoordinateInfoComponent {
  @Input() coordinate?: CoordinateDto;
  @Input() locationName?: string;


  now = new Date();
}
