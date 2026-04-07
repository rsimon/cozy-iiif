import { imageSize } from 'image-size';
import type { ImageService2, ImageService3, Service } from '@iiif/presentation-3';
import { getPropertyValue } from './resource';
import type { Bounds, CozyImageResource, GetRegionURLOpts } from '../types';

type ImageService = ImageService2 | ImageService3;

export const normalizeServiceUrl = (url: string) =>
  url.endsWith('/info.json') ? url : `${url.endsWith('/') ? url : `${url}/`}info.json`;

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

export const getStaticImagePixelSize = (url: string) => () => {
  const isBrowser = typeof window !== 'undefined';

  return fetch(url).then(res => res.blob()).then(blob => {
    if (isBrowser) {
      return createImageBitmap(blob).then(bitmap => {
        const { width, height } = bitmap;
        bitmap.close(); 
        return { width, height }
      });
    } else {      return blob.arrayBuffer().then(buffer => 
        imageSize(new Uint8Array(buffer)));
    }
  });
}

export const getImageURLFromService = (
  service: Service,
  width: number,
  height: number,
  rotation: number = 0
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

  return `${id}/full/!${width},${height}/${rotation}/default.jpg`;
}

export const getRegionURLFromService = (
  service: Service,
  bounds: Bounds,
  rotation = 0, // 0, 90, 180, 270
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

  // Find minimum scale required to keep shortest edge >= minSize
  const minRequiredScale = minSize / Math.min(w, h);

  const scale = maxSize 
    ? Math.max(minRequiredScale, maxSize / Math.max(w, h))
    : minRequiredScale;

  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  const normalizedRotation = ((rotation % 360) + 360) % 360;

  const regionParam = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`;
  return `${id}/${regionParam}/!${width},${height}/${normalizedRotation}/default.jpg`;
}

export const getRegionURL = (
  image: CozyImageResource
) => (
  bounds: Bounds,
  rotation = 0,
  opts: GetRegionURLOpts = { minSize: 400 }
): string | undefined => {
  if (image.type === 'dynamic') {
    return getRegionURLFromService(image.service, bounds, rotation, opts);
  } else {
    console.error('Level 0 or static image canvas: unsupported');
  }
}

export const getImageURL = (
  width: number | undefined, 
  height: number | undefined, 
  service: Service  
) => (minSize = 800, rotation = 0) => {
  if (!width || !height) return;

  const aspect = width / height;
  const isPortrait = aspect < 1;
  
  const h = Math.ceil(isPortrait ? minSize / aspect : minSize);
  const w = Math.ceil(isPortrait ? minSize : minSize / aspect);

  return getImageURLFromService(service!, w, h, rotation);
}

export const getPixelSizeFromServiceUrl = (serviceUrl: string) => () =>
  fetch(serviceUrl).then(res => res.json()).then(data => {
    const width: number = data.width;
    const height: number = data.height;
    return (width !== undefined && height !== undefined) ? { width, height } : undefined;
  });