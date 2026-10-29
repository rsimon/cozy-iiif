import type { ImageService2, ImageService3, Service } from '@iiif/presentation-3';
import { getPropertyValue } from '../resource';

type ImageService = ImageService2 | ImageService3;

export const isImageService = (data: any): data is ImageService => {
  const t = getPropertyValue<string>(data, 'type');

  return t?.startsWith('ImageService') || (
    data.profile?.toString().includes('iiif.io/api/image/')
  );
}

export const parseImageService = (service: Service) => {
  const t = getPropertyValue<string>(service, 'type');
  const context = getPropertyValue<string>(service, 'context');

  if (t === 'ImageService2' || context?.includes('image/2')) {
    const service2 = service as ImageService2;

    const p = getPropertyValue<string>(service2, 'profile');

    const labels = ['level0', 'level1', 'level2'];
    const profiles = Array.isArray(p) ? p: p ? [p] : [];

    const levels = profiles
      .map(profile => labels.findIndex(level => profile.toString().includes(level)))
      .filter(l => l > -1)
      .sort((a, b) => b - a); // Sort descending

    return { majorVersion: 2, profileLevel: levels[0] };
  } else if (t || context) {
    // Image API 3
    const service3 = service as ImageService3;
    return { majorVersion: 3, profileLevel: parseInt(service3.profile)}
  }
}

// export const getProfileLevel = (service: Service): 0 | 1 | 2 | undefined; 
// export const isLevel0 = (service: Service): boolean;   









