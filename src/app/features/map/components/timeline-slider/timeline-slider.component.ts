import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSlider, MatSliderThumb } from "@angular/material/slider";
import { FormsModule } from "@angular/forms";
import { CoordinateDto } from "../../../../core/models/dto/coordinate.dto";
import { MatCheckbox, MatCheckboxChange } from "@angular/material/checkbox";
import { CameraFollow } from "../../models/camera-follow.enum";

@Component({
  selector: 'app-timeline-slider',
  standalone: true,
  imports: [
    MatSlider,
    MatSliderThumb,
    FormsModule,
    MatCheckbox,
  ],
  templateUrl:'timeline-slider.component.html',
  styleUrls: ['timeline-slider.component.scss']
})
export class TimelineSliderComponent {
  @Input() coordinates: CoordinateDto[] = [];
  @Output() sliderChange = new EventEmitter<CoordinateDto>();
  @Output() cameraFollowChange = new EventEmitter<CameraFollow>();
  @Output() sliderDragStart = new EventEmitter<void>();
  @Output() sliderDragEnd = new EventEmitter<void>();

  selectedIndex: number = 0;

  formatLabel(index: number): string {
    if (!this.coordinates || !this.coordinates[index]) return '';

    return this.coordinates[index].date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onValueChange(index: number): void {
    if (!this.coordinates || this.coordinates.length === 0) return;

    this.selectedIndex = index;
    this.sliderChange.emit(this.coordinates[index]);
  }

  onDragStart(): void {
    this.sliderDragStart.emit();
  }

  onDragEnd(): void {
    this.sliderDragEnd.emit();
  }

  onCameraFollowChanged(event: MatCheckboxChange): void {
    this.cameraFollowChange.emit(event.checked ? CameraFollow.ON : CameraFollow.OFF);
  }
}
