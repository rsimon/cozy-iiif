import type { Bounds, CozyImageInfo, Level0ImageInfo, TileSpec } from '../../types';
import type { Tile } from '../types';

export const toURL = (info: CozyImageInfo, region: string, size: string) =>
  `${info.id}/${region}/${size}/0/default.jpg`;

const toSize = (info: CozyImageInfo, w: number, h: number) => {
  const isV2 = info.majorVersion === 2;
  const isFullSize = isV2 ? w === info.width : w === info.width && h === info.height;

  if (isFullSize) return isV2 ? 'full' : 'max';
  return isV2 ? `${w},` : `${w},${h}`;
}

/**
 * All full-image tiles listed in `sizes`
 */
export const getFullTiles = (info: CozyImageInfo): Tile[] => {
  const region: Bounds = { x: 0, y: 0, w: info.width, h: info.height };

  // Only use the explicitly listed sizes, without forcing the raw full image
  return info.sizes.map(s => ({
    url: toURL(info, 'full', toSize(info, s.width, s.height)),
    width: s.width,
    height: s.height,
    region
  }));
}

export const getLevel0TileForScale = (
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

  const isFullSize = (w: number, h: number) =>
    info.majorVersion === 2 ? w === info.width : w === info.width && h === info.height;

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

  const size = isFullSize(sizeW, sizeH)
    ? (info.majorVersion === 2 ? 'full' : 'max')
    : (info.majorVersion === 2 ? `${sizeW},` : `${sizeW},${sizeH}`);

  return {
    url: toURL(info, regionParam, size),
    width: sizeW,
    height: sizeH,
    region: { x, y, w, h }
  };
};

// The smallest tile or size that shows the region at least minWidth pixels
// wide, else the most detailed one
export const getLevel0Tile = (
  info: Level0ImageInfo,
  region: Bounds,
  minWidth: number
): Tile | undefined => {
  const tileSources = info.tiles.flatMap((tile) =>
    tile.scaleFactors.map(sf => getLevel0TileForScale(info, tile, sf, region))
  );

  const candidates = [...getFullTiles(info), ...tileSources]
    .filter((s): s is Tile => Boolean(s));

  const resolution = (s: Tile) => s.width / s.region.w;
  const required = Math.min(minWidth, region.w) / region.w;

  const sufficient = candidates.filter((s) => resolution(s) >= required);

  if (sufficient.length > 0)
    return sufficient.reduce((a, b) => (b.width * b.height < a.width * a.height ? b : a));

  // Fallback: if nothing is sufficient, pick the highest resolution available
  const bestCandidate = candidates.reduce<Tile | undefined>(
    (a, b) => (!a || resolution(b) > resolution(a) ? b : a),
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