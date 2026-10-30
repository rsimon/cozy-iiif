import type { Service } from "@iiif/presentation-3";
import type { Bounds, CozyImageResource, GetRegionURLOpts, Rotation } from "../../types";
import { getPropertyValue } from "../resource";
import { getProfileLevel } from "./service";

/** 
 * Shorter side is at least minSize.
 */ 
export const getMinSizeDimensions = (
  width: number,
  height: number,
  minSize: number
): { w: number; h: number } => {
  const shorter = Math.min(width, height);

  // Multiply before dividing, so the shorter side comes out exactly minSize
  return {
    w: Math.ceil((width * minSize) / shorter),
    h: Math.ceil((height * minSize) / shorter)
  };
}

const getImageURLFromService = (
  service: Service,
  width: number,
  height: number,
  rotation: Rotation = 0
): string => {
  const id = getPropertyValue(service, 'id');

  const compliance = service.profile || '';

  const isLevel0 = typeof compliance === 'string' &&
    (compliance.includes('level0') || compliance.includes('level:0'));
  
  if (isLevel0) {
    const { degrees, mirrored } = normalizeRotation(rotation);
    if (degrees !== 0 || mirrored)
      console.warn(`Level 0 image - rotation and mirroring not supported`);

    // For level 0, find the closest pre-defined size
    if ('sizes' in service && Array.isArray(service.sizes)) {
      const suitableSize = service.sizes
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))
        .filter(s => (s.width * s.height) >= width * height)[0];

      const isV2 = getProfileLevel(service.profile) === 2;
        
      if (suitableSize)
        return `${id}/full/${suitableSize.width},${isV2 ? '' : suitableSize.height}/0/default.jpg`;
    }

    // Fallback: full image
    return `${id}/full/full/0/default.jpg`;
  }

  return `${id}/full/!${width},${height}/${toRotationParam(rotation)}/default.jpg`;
}

/**
 * Curried helper to get the image URL with given parameters from 
 * an image service.
 */
export const getImageURL = (
  width: number | undefined, 
  height: number | undefined, 
  service: Service  
) => (minSize = 800, rotation: Rotation = 0) => {
  if (!width || !height) return;

  const aspect = width / height;
  const isPortrait = aspect < 1;
  
  const h = Math.ceil(isPortrait ? minSize / aspect : minSize);
  const w = Math.ceil(isPortrait ? minSize : minSize / aspect);

  return getImageURLFromService(service!, w, h, rotation);
}

const getRegionURLFromService = (
  service: Service,
  bounds: Bounds,
  rotation: Rotation = 0,
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

  const regionParam = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`;
  return `${id}/${regionParam}/!${width},${height}/${toRotationParam(rotation)}/default.jpg`;
}

/**
 * Curried helper to get the image region URL with given parameters from 
 * an image service.
 */
export const getRegionURL = (
  service: Service
) => (
  bounds: Bounds,
  rotation: Rotation = 0,
  opts: GetRegionURLOpts = { minSize: 400 }
): string | undefined => {
  return getRegionURLFromService(service, bounds, rotation, opts);
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

