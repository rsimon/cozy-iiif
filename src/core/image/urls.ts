import type { Service } from '@iiif/presentation-3';
import { getPropertyValue } from '../resource';
import { parseImageService } from './service';
import type {
  Bounds,
  GetImageURLOpts,
  Rotation,
  Size
} from '../../types';

const normalizeTargetSize = (size: GetImageURLOpts['size']): Size | 'full' => {
  if (size === 'full') return size;

  const target = typeof size === 'number' ? { w: size, h: size } : size;
  if (!Number.isFinite(target.w) || !Number.isFinite(target.h) || target.w <= 0 || target.h <= 0) {
    throw new RangeError('Image URL size dimensions must be finite positive numbers');
  }

  return target;
}

const normalizeRotation = (rotation: Rotation) => {
  const opts = typeof rotation === 'number'
    ? { degrees: rotation } : rotation;

  return {
    degrees: ((opts.degrees % 360) + 360) % 360,
    mirrored: opts.mirrored
  }
}

const toRotationParam = (rotation: Rotation): string => {
  const { degrees, mirrored } = normalizeRotation(rotation);
  return mirrored ? `!${((-degrees % 360) + 360) % 360}` : `${degrees}`;
}

const getImageURLFromService = (
  service: Service,
  region: string,
  size: 'full' | Size,
  sourceBounds: Bounds,
  rotation: Rotation = 0
): string | undefined => {
  const id = getPropertyValue(service, 'id');

  const { majorVersion, profileLevel } = parseImageService(service);

  const isLevel0 = profileLevel === 0;

  const fullSizeParam = majorVersion === 2 ? 'full' : 'max';
  
  if (isLevel0) {
    const { degrees, mirrored } = normalizeRotation(rotation);
    if (degrees !== 0 || mirrored)
      console.warn(`Level 0 image - rotation and mirroring not supported`);

    if (region !== 'full') {
      console.warn(`Level 0 image service does not support custom region URLs: ${id}`);
      return;
    }

    if (size === 'full') {
      return `${id}/full/${fullSizeParam}/0/default.jpg`;
    }

    // For level 0, find the closest pre-defined size
    if ('sizes' in service && Array.isArray(service.sizes)) {
      const suitableSize = service.sizes
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))
        .filter(s => (s.width * s.height) >= size.w * size.h)[0];

      const isV2 = majorVersion === 2;
      if (suitableSize)
        return `${id}/full/${suitableSize.width},${isV2 ? '' : suitableSize.height}/0/default.jpg`;
    }

    // Fallback: full image
    return `${id}/full/${fullSizeParam}/0/default.jpg`;
  }

  const sizeParam = size === 'full'
    ? fullSizeParam
    : getIIIFSizeParam(sourceBounds, size, fullSizeParam);

  return `${id}/${region}/${sizeParam}/${toRotationParam(rotation)}/default.jpg`;
}

// Computes `w,` or `,h` (or `full/max`) depending on which is the constraing dimension
const getIIIFSizeParam = (
  bounds: Bounds,
  target: Size,
  fullSizeParam: 'full' | 'max'
): string => {
  const widthScale = target.w / bounds.w;
  const heightScale = target.h / bounds.h;

  // Capping the scale 1 prevents upscaling the image!
  const scale = Math.min(widthScale, heightScale, 1);

  if (scale === 1) return fullSizeParam;
  
  return (widthScale <= heightScale) 
    ? `${Math.max(1, Math.floor(bounds.w * scale))},`
    : `,${Math.max(1, Math.floor(bounds.h * scale))}`;
}

// Computes center-crop bounds for 'cover' fit mode
const getCoverBounds = (bounds: Bounds, target: Size): Bounds => {
  const targetAspect = target.w / target.h;
  const sourceAspect = bounds.w / bounds.h;

  if (sourceAspect > targetAspect) {
    const w = bounds.h * targetAspect;
    return { ...bounds, x: bounds.x + (bounds.w - w) / 2, w };
  }

  const h = bounds.w / targetAspect;
  return { ...bounds, y: bounds.y + (bounds.h - h) / 2, h };
}

const toRegionParam = ({ x, y, w, h }: Bounds): string =>
  `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`;

export const clampRegion = (bounds: Bounds, imageSize: Size): Bounds => {
  const { x, y, w, h } = bounds;
  const { w: imageWidth, h: imageHeight } = imageSize;

  if (
    ![x, y, w, h, imageWidth, imageHeight].every(Number.isFinite) ||
    w <= 0 ||
    h <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    throw new RangeError('Region coordinates must be finite, and region and image dimensions must be positive');
  }

  const left = Math.max(0, Math.min(imageWidth - 1, x));
  const top = Math.max(0, Math.min(imageHeight - 1, y));
  const right = Math.min(imageWidth, Math.max(left + 1, x + w));
  const bottom = Math.min(imageHeight, Math.max(top + 1, y + h));

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top
  };
}

/**
 * Curried helper to get the image URL with given parameters from 
 * an image service.
 */
export const getImageURL = (
  width: number | undefined, 
  height: number | undefined, 
  service: Service  
) => (opts: GetImageURLOpts = { size: 400 }) => {
  if (!width || !height) {
    console.warn('Undefined image size');
    return '';
  }

  const size = normalizeTargetSize(opts.size);
  if (size === 'full')
    return getImageURLFromService(service, 'full', size, { x: 0, y: 0, w: width, h: height }, opts.rotation);

  const bounds = { x: 0, y: 0, w: width, h: height };
  const requestBounds = opts.fit === 'cover' ? getCoverBounds(bounds, size) : bounds;
  const region = opts.fit === 'cover' ? toRegionParam(requestBounds) : 'full';
  return getImageURLFromService(service, region, size, requestBounds, opts.rotation);
}

/**
 * Curried helper to get the image region URL with given parameters from
 * an image service.
 */
export const getRegionURL = (
  service: Service,
  width: number,
  height: number
) => (
  bounds: Bounds,
  opts: GetImageURLOpts = { size: 400 }
): string | undefined => {
  const id = getPropertyValue(service, 'id');
  const isLevel0 = parseImageService(service).profileLevel === 0;

  if (isLevel0) {
    console.warn(`Level 0 image service does not support custom region URLs: ${id}`);
    return;
  }

  const clampedBounds = clampRegion(bounds, { w: width, h: height });

  const size = normalizeTargetSize(opts.size);

  const regionBounds = size !== 'full' && opts.fit === 'cover'
    ? getCoverBounds(clampedBounds, size)
    : clampedBounds;
  
  const regionParam = toRegionParam(regionBounds);
  
  return getImageURLFromService(service, regionParam, size, regionBounds, opts.rotation);
}
