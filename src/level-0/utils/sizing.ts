import { normalizeTargetSize } from '../../core';
import { clampRegion } from '../../core/image/urls';
import type { Bounds, Level0ImageInfo, Size } from '../../types';
import type { GetLevel0ImageOpts } from '../types';

// Clamps source bounds, then applies center-cropping when `cover` is requested.
export const fitRegion = (
  bounds: Bounds,
  imageSize: Size,
  opts: GetLevel0ImageOpts
): Bounds => {
  const clampedBounds = clampRegion(bounds, imageSize);
  const target = normalizeTargetSize(opts.size);
  if (target === 'full' || opts.fit !== 'cover') return clampedBounds;

  const targetAspect = target.w / target.h;
  const sourceAspect = clampedBounds.w / clampedBounds.h;

  if (sourceAspect > targetAspect) {
    const w = Math.max(1, Math.floor(clampedBounds.h * targetAspect));
    return { ...clampedBounds, x: clampedBounds.x + Math.floor((clampedBounds.w - w) / 2), w };
  }

  const h = Math.max(1, Math.floor(clampedBounds.w / targetAspect));
  return { ...clampedBounds, y: clampedBounds.y + Math.floor((clampedBounds.h - h) / 2), h };
}

// Calculates rendered dimensions without upscaling.
export const calculateRenderedSize = (
  bounds: Bounds,
  opts: GetLevel0ImageOpts,
  availableScale = 1
): Size => {
  const target = normalizeTargetSize(opts.size);

  if (target === 'full') {
    const scale = Math.min(1, availableScale);
    return {
      w: Math.max(1, Math.floor(bounds.w * scale)),
      h: Math.max(1, Math.floor(bounds.h * scale))
    };
  }

  const scale = Math.min(target.w / bounds.w, target.h / bounds.h, 1, availableScale);
  return {
    w: Math.max(1, Math.floor(bounds.w * scale)),
    h: Math.max(1, Math.floor(bounds.h * scale))
  };
}
