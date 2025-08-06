// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        RouterModule
    ],
    template: `
    <router-outlet></router-outlet>
  `,
    styles: [`
    .spacer {
      flex: 1 1 auto;
    }

    mat-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }
  `]
})
export class AppComponent {
  title = 'backpacking';
}
