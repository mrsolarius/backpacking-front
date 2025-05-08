export enum ImageResolution {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3
}

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  ICON = 'icon'
}

export interface PictureVersionDTO {
  id: number;
  pictureId: number;
  path: string;
  resolution: ImageResolution;
  versionType: DeviceType;
  createdAt: string;
  updatedAt: string;
}

export interface PictureVersionsMap {
  [DeviceType.DESKTOP]?: PictureVersionDTO[];
  [DeviceType.TABLET]?: PictureVersionDTO[];
  [DeviceType.MOBILE]?: PictureVersionDTO[];
  [DeviceType.ICON]?: PictureVersionDTO[];
}

export interface PictureCoordinateDTO {
  id: number;
  path: string;
  latitude: number;
  longitude: number;
  altitude: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  width: number;
  height: number;
  travelId?: number;
  versions?: PictureVersionsMap;
}

export interface PictureCoordinateInputDTO {
  id: number;
  path: string;
  latitude: string;
  longitude: string;
  altitude: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  width?: number;
  height?: number;
  versions?: PictureVersionsMap;
  travelId?: number;
}

export function mapToPictureCoordinateDTO(data: PictureCoordinateInputDTO[]): PictureCoordinateDTO[] {
  return data.map(item => ({
    id: item.id,
    path: item.path,
    latitude: parseFloat(item.latitude || '0'),
    longitude: parseFloat(item.longitude || '0'),
    altitude: parseFloat(item.altitude || '0'),
    date: new Date(item.date),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    width: item.width || 0,
    height: item.height || 0,
    travelId: item.travelId,
    versions: item.versions
  }));
}

// Méthodes utilitaires
export const PictureUtils = {
  /**
   * Obtient la version la plus appropriée pour un type d'appareil et une résolution donnés
   */
  getBestVersionForDevice(picture: PictureCoordinateDTO, deviceType: DeviceType, preferredResolution: ImageResolution = ImageResolution.MEDIUM): PictureVersionDTO | undefined {
    if (!picture.versions || !picture.versions[deviceType] || picture.versions[deviceType]?.length === 0) {
      return undefined;
    }

    const versions = picture.versions[deviceType] || [];

    // D'abord, essayez de trouver la résolution préférée
    const preferredVersion = versions.find(v => v.resolution === preferredResolution);
    if (preferredVersion) {
      return preferredVersion;
    }

    // Sinon, retournez la version avec la résolution la plus proche
    return versions.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.resolution - preferredResolution);
      const currentDiff = Math.abs(current.resolution - preferredResolution);

      return currentDiff < closestDiff ? current : closest;
    }, versions[0]);
  },

  /**
   * Obtient la version la mieux adaptée en fonction des dimensions de l'écran
   */
  getOptimalVersion(picture: PictureCoordinateDTO, screenWidth: number): PictureVersionDTO | undefined {
    if (!picture.versions) {
      return undefined;
    }

    let deviceType: DeviceType;
    let resolution: ImageResolution;

    // Déterminer le type d'appareil en fonction de la largeur de l'écran
    if (screenWidth > 1024) {
      deviceType = DeviceType.DESKTOP;
      resolution = screenWidth > 2560 ? ImageResolution.HIGH : ImageResolution.MEDIUM;
    } else if (screenWidth > 640) {
      deviceType = DeviceType.TABLET;
      resolution = screenWidth > 1280 ? ImageResolution.HIGH : ImageResolution.MEDIUM;
    } else {
      deviceType = DeviceType.MOBILE;
      resolution = screenWidth > 480 ? ImageResolution.MEDIUM : ImageResolution.LOW;
    }

    return PictureUtils.getBestVersionForDevice(picture, deviceType, resolution);
  }
};
