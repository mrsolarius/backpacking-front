import { Injectable } from '@angular/core';
import type mapboxgl from 'mapbox-gl';

export type MapboxGL = typeof mapboxgl;

@Injectable({
  providedIn: 'root'
})
export class MapboxModuleService {
  private module?: MapboxGL;
  private loading?: Promise<MapboxGL>;

  async load(): Promise<MapboxGL> {
    if (this.module) {
      return this.module;
    }

    if (!this.loading) {
      // Use the package entry which bundles its own worker via Blob.
      // This avoids 404s on esm-min/worker.js in Vite dev server.
      this.loading = import('mapbox-gl')
        // TS needs an explicit unknown cast here because the module type doesn't overlap cleanly.
        .then((mod) => (mod as unknown as { default?: MapboxGL }).default ?? (mod as unknown as MapboxGL));
    }

    this.module = await this.loading;
    return this.module;
  }

  get(): MapboxGL | undefined {
    return this.module;
  }

  getOrThrow(): MapboxGL {
    if (!this.module) {
      throw new Error('Mapbox module not loaded. Initialize the map before use.');
    }
    return this.module;
  }
}
