import { clampRegion, normalizeTargetSize } from '../../core';
import type { GetLevel0ImageOpts, StitchableTile, Tile } from '../types';
import type { 
  Bounds, 
  CozyImageInfo, 
  Level0ImageInfo, 
  Size, 
  TileSpec 
} from '../../types';

const toURL = (info: CozyImageInfo, region: string, size: string) =>
  `${info.id}/${region}/${size}/0/default.jpg`;

const toSize = (info: CozyImageInfo, w: number, h: number) => {
  const isV2 = info.majorVersion === 2;
  const isFullSize = isV2 ? w === info.width : w === info.width && h === info.height;

  if (isFullSize) return isV2 ? 'full' : 'max';
  return isV2 ? `${w},` : `${w},${h}`;
}

/**
 * Clamps the `bounds` to the `imageSize`, then applies center-cropping
 * in case `cover` is requested.
 */
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

/**
 * Returns the largest size (aspect ratio preserved) that fits into the
 * requested target size without exceeding the native size of `bounds`
 * (no upscaling). With `size: 'full'`, that's the native size itself.
 *
 * `availableScale` additionally caps the result to a fraction of the
 * native size, to reflect the resolution the server can actually deliver.
 */
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

/**
 * Returns the lowest-resolution Level 0 scale factor that still delivers
 * the given resolution. If the server has nothing high-res enough, falls 
 * back to the highest-res available factor.
 */
export const getLevel0ScaleFactor = (
  info: Level0ImageInfo,
  region: Bounds,
  outputSize: Size
): number => {
  const scaleFactors = info.tiles[0]?.scaleFactors;

  if (!scaleFactors?.length)
    throw new Error(`No tile scale factors available for Level 0 image ${info.id}`);

  const requiredDownscale = Math.max(region.w / outputSize.w, region.h / outputSize.h);
  const sorted = [...scaleFactors].sort((a, b) => b - a);
  return sorted.find(factor => factor <= requiredDownscale) ?? sorted[sorted.length - 1];
}

/**
 * All full-image tiles listed in `sizes`.
 */
const getFullTiles = (info: CozyImageInfo): Tile[] => {
  const region: Bounds = { x: 0, y: 0, w: info.width, h: info.height };

  // Only sizes explicitly listed in `info.sizes` are candidates. The raw
  // full-size image (possibly huge) is only used as last-resort fallback
  // in `getLevel0Tile`.
  return info.sizes.map(s => ({
    url: toURL(info, 'full', toSize(info, s.width, s.height)),
    width: s.width,
    height: s.height,
    region
  }));
}

/**
 * Returns all tiles intersecting the `bounds` at the given scale factor.
 * Tile `x`/`y` are in scaled (level) coordinates, i.e. relative to the 
 * full image downscaled by `scaleFactor`.
 */
export const getLevel0TilesForRegion = (
  info: Level0ImageInfo,
  bounds: Bounds,
  scaleFactor: number
): StitchableTile[] => {
  const tileWidth = info.tiles[0]?.width;
  const tileHeight = info.tiles[0]?.height || tileWidth;
  if (!tileWidth || !tileHeight || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    throw new Error(`Invalid tile specification for Level 0 image ${info.id}`);
  }

  const spanW = tileWidth * scaleFactor;
  const spanH = tileHeight * scaleFactor;
  const startTileX = Math.floor(bounds.x / spanW);
  const startTileY = Math.floor(bounds.y / spanH);
  const endTileX = Math.ceil((bounds.x + bounds.w) / spanW);
  const endTileY = Math.ceil((bounds.y + bounds.h) / spanH);
  const tiles: StitchableTile[] = [];

  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      const sourceX = x * spanW;
      const sourceY = y * spanH;
      if (sourceX >= info.width || sourceY >= info.height) continue;

      const width = Math.min(tileWidth, Math.ceil((info.width - sourceX) / scaleFactor));
      const height = Math.min(tileHeight, Math.ceil((info.height - sourceY) / scaleFactor));
      const sourceWidth = Math.min(spanW, info.width - sourceX);
      const sourceHeight = Math.min(spanH, info.height - sourceY);

      tiles.push({
        x: x * tileWidth,
        y: y * tileHeight,
        width,
        height,
        url: toURL(
          info,
          `${sourceX},${sourceY},${sourceWidth},${sourceHeight}`,
          `${width},`
        )
      });
    }
  }

  return tiles;
}

/**
 * For one TileSpec (w, h, scaleFactors[]), and one scaleFactor, returns
 * the single tile that fully contains the requested region, or undefined
 * if the region covers more than one tile. 
 */
const getLevel0TileForScale = (
  info: Level0ImageInfo,
  tile: TileSpec,
  scaleFactor: number,
  region: Bounds
): Tile | undefined => {
  // Full-image pixels per tile
  const spanW = tile.width * scaleFactor;
  const spanH = tile.height * scaleFactor;

  const col = Math.floor(region.x / spanW);
  const row = Math.floor(region.y / spanH);

  if (
    Math.floor((region.x + region.w - 1) / spanW) !== col ||
    Math.floor((region.y + region.h - 1) / spanH) !== row
  ) return;

  const levelW = Math.ceil(info.width / scaleFactor);
  const levelH = Math.ceil(info.height / scaleFactor);

  // If the whole image fits into one tile, request the whole img at this level
  if (levelW < tile.width && levelH < tile.height) {
    return {
      url: toURL(info, 'full', toSize(info, levelW, levelH)),
      width: levelW,
      height: levelH,
      region: { x: 0, y: 0, w: info.width, h: info.height }
    };
  }

  const x = col * spanW;
  const y = row * spanH;
  const w = Math.min(spanW, info.width - x);
  const h = Math.min(spanH, info.height - y);

  const sizeW = Math.min(tile.width, levelW - col * tile.width);
  const sizeH = Math.min(tile.height, levelH - row * tile.height);

  const regionParam = x === 0 && y === 0 && w === info.width && h === info.height
    ? 'full' : `${x},${y},${w},${h}`;

  const size = toSize(info, sizeW, sizeH);

  return {
    url: toURL(info, regionParam, size),
    width: sizeW,
    height: sizeH,
    region: { x, y, w, h }
  };
}

/**
 * Picks a single image (a size listed in `info.sizes`, or a single tile
 * containing the whole region) to display `region` at `size`. Among the
 * candidates that provide at least `size` (capped at the region's native
 * size), returns the one with the fewest pixels. If none is sufficient,
 * returns the candidate with the best resolution coverage.
 *
 * The tile may cover more than the region, so callers need to crop.
 */
export const getLevel0Tile = (
  info: Level0ImageInfo,
  region: Bounds,
  size: Size
): Tile => {
  const tileSources = info.tiles.flatMap((tile) =>
    tile.scaleFactors.map(sf => getLevel0TileForScale(info, tile, sf, region))
  );

  const candidates = [...getFullTiles(info), ...tileSources]
    .filter((s): s is Tile => Boolean(s));

  const requestedWidth = Math.min(size.w, region.w);
  const requestedHeight = Math.min(size.h, region.h);

  const resolution = (candidate: Tile) => ({
    w: candidate.width / candidate.region.w,
    h: candidate.height / candidate.region.h
  });

  const providesSize = (candidate: Tile) => {
    const candidateResolution = resolution(candidate);
    return candidateResolution.w * region.w >= requestedWidth &&
      candidateResolution.h * region.h >= requestedHeight;
  };

  const sufficient = candidates.filter(providesSize);

  if (sufficient.length > 0)
    return sufficient.reduce((a, b) => (b.width * b.height < a.width * a.height ? b : a));

  // Fallback: choose the candidate with the best coverage of both dimensions.
  const bestCandidate = candidates.reduce<Tile | undefined>(
    (best, candidate) => {
      if (!best) return candidate;

      const coverage = (tile: Tile) => {
        const candidateResolution = resolution(tile);
        return Math.min(
          candidateResolution.w * region.w / requestedWidth,
          candidateResolution.h * region.h / requestedHeight
        );
      };

      return coverage(candidate) > coverage(best) ? candidate : best;
    },
    undefined
  );

  if (bestCandidate) return bestCandidate;

  // Final fallback: no best candidate - full image
  const isV2 = info.majorVersion === 2;
  
  return {
    url: toURL(info, 'full', isV2 ? 'full' : 'max'),
    width: info.width,
    height: info.height,
    region: { x: 0, y: 0, w: info.width, h: info.height }
  };
}