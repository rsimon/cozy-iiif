import { normalizeTargetSize } from '../../core';
import type { Bounds, Level0ImageInfo, Size } from '../../types';
import type { GetLevel0ImageOpts } from '../types';

export const getLevel0Region = (bounds: Bounds, opts: GetLevel0ImageOpts): Bounds => {
  const target = normalizeTargetSize(opts.size);
  if (target === 'full' || opts.fit !== 'cover') return bounds;

  const targetAspect = target.w / target.h;
  const sourceAspect = bounds.w / bounds.h;

  if (sourceAspect > targetAspect) {
    const w = Math.max(1, Math.floor(bounds.h * targetAspect));
    return { ...bounds, x: bounds.x + Math.floor((bounds.w - w) / 2), w };
  }

  const h = Math.max(1, Math.floor(bounds.w / targetAspect));
  return { ...bounds, y: bounds.y + Math.floor((bounds.h - h) / 2), h };
}

export const getLevel0OutputSize = (
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

export const getLevel0ScaleFactor = (
  info: Level0ImageInfo,
  bounds: Bounds,
  outputSize: Size
): number => {
  const scaleFactors = info.tiles[0]?.scaleFactors;
  if (!scaleFactors?.length) {
    throw new Error(`No tile scale factors available for Level 0 image ${info.id}`);
  }

  const requiredDownscale = Math.max(bounds.w / outputSize.w, bounds.h / outputSize.h);
  const sorted = [...scaleFactors].sort((a, b) => b - a);
  return sorted.find(factor => factor <= requiredDownscale) ?? sorted[sorted.length - 1];
}
