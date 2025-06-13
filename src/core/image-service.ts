import type { ImageService2, ImageService3, Service } from '@iiif/presentation-3';
import { getPropertyValue } from './resource';
import type { Bounds, CozyImageResource, GetRegionURLOpts } from '../types';

type ImageService = ImageService2 | ImageService3;

export const isImageService = (data: any): data is ImageService => {
  const t = getPropertyValue<string>(data, 'type');

  return t.startsWith('ImageService') || (
    data.profile && data.profile.toString().includes('iiif.io/api/image/')
  );
}

export const parseImageService = (service: Service) => {
  const t = getPropertyValue<string>(service, 'type');
  const context = getPropertyValue<string>(service, 'context');

  if (t === 'ImageService2' || context?.includes('image/2')) {
    const service2 = service as ImageService2;

    const labels = ['level0', 'level1', 'level2'];
    const profiles = Array.isArray(service2.profile) ? service2.profile : [service2.profile];

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

export const getImageURLFromService = (
  service: Service,
  width: number,
  height: number
): string => {
  const id = getPropertyValue(service, 'id');

  const compliance = service.profile || '';

  const isLevel0 = typeof compliance === 'string' &&
    (compliance.includes('level0') || compliance.includes('level:0'));
  
  if (isLevel0) {
    // For level 0, find the closest pre-defined size
    if ('sizes' in service && Array.isArray(service.sizes)) {
      const suitableSize = service.sizes
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))
        .filter(s => (s.width * s.height) >= width * height)[0];
        
      if (suitableSize)
        return `${id}/full/${suitableSize.width},${suitableSize.height}/0/default.jpg`;
    }

    // Fallback: full image
    return `${id}/full/full/0/default.jpg`;
  }

  return `${id}/full/!${width},${height}/0/default.jpg`;
}

export const getRegionURLFromService = (
  service: Service,
  bounds: Bounds,
  opts: GetRegionURLOpts = { minSize: 400 }
): string | undefined => {
  const id = getPropertyValue(service, 'id');
  const compliance = service.profile || '';

  const isLevel0 = typeof compliance === 'string' &&
    (compliance.includes('level0') || compliance.includes('level:0'));

  if (isLevel0) {
    console.warn(`Level 0 image service does not support custom region URLs: ${id}`);
    return;
  }

  const { x, y, w , h } = bounds;
  const { minSize = 400, maxSize } = opts;

  const aspect = w / h;
  const isPortrait = aspect < 1;
  
  let height = Math.ceil(isPortrait ? minSize / aspect : minSize);
  let width = Math.ceil(isPortrait ? minSize : minSize / aspect);

  // Apply maxSize constraint if specified
  if (maxSize) {
    if (width > maxSize || height > maxSize) {
      if (isPortrait) {
        height = Math.min(height, maxSize);
        width = Math.ceil(height * aspect);
      } else {
        width = Math.min(width, maxSize);
        height = Math.ceil(width / aspect);
      }
    }
  }

  const regionParam = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`;
  return `${id}/${regionParam}/!${width},${height}/0/default.jpg`;
}

export const getRegionURL = (
  image: CozyImageResource
) => (
  bounds: Bounds,
  opts: GetRegionURLOpts = { minSize: 400 }
): string | undefined => {
  if (image.type === 'dynamic') {
    return getRegionURLFromService(image.service, bounds, opts);
  } else {
    console.error('Level 0 or static image canvas: unsupported');
  }
}