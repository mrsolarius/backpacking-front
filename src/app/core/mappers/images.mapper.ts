import { DeviceType, PictureCoordinateDTO, PictureVersionsMap, ImageResolution } from '../models/dto/images.dto';
import {NgGalleryImage, NgGallerySources} from "../../shared/ngg-gallery/models/gallery.model";

export function mapPictureCoordinateToNgGalleryImage(pictureCoordinate: PictureCoordinateDTO): NgGalleryImage {
  // Récupération de la vignette (priorité à la version ICON)
  const thumbnail = getBestVersionPath(pictureCoordinate.versions, DeviceType.ICON) || pictureCoordinate.path;

  // Construction des sources responsive avec les breakpoints numériques
  const sources = [
    createSource(pictureCoordinate.versions, DeviceType.DESKTOP, 1200), // Desktop: min-width 1200px
    createSource(pictureCoordinate.versions, DeviceType.TABLET, 768, 1199), // Tablet: 768px-1199px
    createSource(pictureCoordinate.versions, DeviceType.MOBILE, undefined, 767), // Mobile: max-width 767px
  ].filter(source => source !== null) as NgGallerySources[] ?? [];

  return {
    id: pictureCoordinate.id.toString(),
    alt: '', // À compléter selon les données
    caption: '', // À compléter selon les données
    thumbnail,
    defaultSrc: pictureCoordinate.path,
    sources: sources.length > 0 ? sources : undefined,
    originalSrc: getBestVersionPath(pictureCoordinate.versions, DeviceType.DESKTOP, ImageResolution.HIGH)
      || pictureCoordinate.path
  };
}

// Helper functions mise à jour

function createSource(
  versions: PictureVersionsMap | undefined,
  deviceType: DeviceType,
  minWidth?: number,
  maxWidth?: number
) {
  const deviceVersions = versions?.[deviceType];
  if (!deviceVersions || deviceVersions.length === 0) return null;

  return {
    srcset: deviceVersions
      .sort((a, b) => a.resolution - b.resolution)
      .map(version => ({
        resolution: version.resolution,
        src: version.path
      })),
    minWidth,
    maxWidth
  };
}

// getBestVersionPath reste identique
function getBestVersionPath(
  versions: PictureVersionsMap | undefined,
  deviceType: DeviceType,
  resolution?: ImageResolution
): string | null {
  const deviceVersions = versions?.[deviceType];
  if (!deviceVersions) return null;

  const filtered = resolution
    ? deviceVersions.filter(v => v.resolution === resolution)
    : deviceVersions;

  const sorted = [...filtered].sort((a, b) => b.resolution - a.resolution);
  return sorted[0]?.path || null;
}
