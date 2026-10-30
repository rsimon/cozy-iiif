import type { Level0Crop, Level0Tile } from './types';
import { getFullTiles, getLevel0Tile, getThrottledLoader, toURL } from './utils';
import type {
  Bounds,
  Level0ImageInfo,
  TileSpec
} from '../types';

const clampRegion = (info: Level0ImageInfo, region: Bounds): Bounds => {
  const x = Math.min(Math.max(0, region.x), info.width - 1);
  const y = Math.min(Math.max(0, region.y), info.height - 1);
  const w = Math.max(1, Math.min(region.w, info.width - x));
  const h = Math.max(1, Math.min(region.h, info.height - y));
  return { x, y, w, h };
}

/**
 * The tile at grid position (col, row) for the given scale factor.
 */
const getTileAt = (
  info: Level0ImageInfo,
  tile: TileSpec,
  scaleFactor: number,
  col: number,
  row: number
): Level0Tile => {
  // Full-image pixels per tile
  const spanW = tile.width * scaleFactor;
  const spanH = tile.height * scaleFactor;

  const levelW = Math.ceil(info.width / scaleFactor);
  const levelH = Math.ceil(info.height / scaleFactor);

  const isFullSize = (w: number, h: number) =>
    info.majorVersion === 2 ? w === info.width : w === info.width && h === info.height;

  // If the whole image fits into one tile, request the whole img at this level
  if (levelW < tile.width && levelH < tile.height) {
    const size = isFullSize(levelW, levelH)
      ? (info.majorVersion === 2 ? 'full' : 'max')
      : (info.majorVersion === 2 ? `${levelW},` : `${levelW},${levelH}`);

    return {
      url: toURL(info, 'full', size),
      width: levelW,
      height: levelH,
      rect: { x: 0, y: 0, w: info.width, h: info.height }
    }
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
    rect: { x, y, w, h }
  };
}

/**
 * CSS variant: the best single image for the region, plus the crop rectangle
 * (in that image's pixels) that the consuming app should show.
 */
export const getLevel0Crop = (
  info: Level0ImageInfo,
  bounds: Bounds,
  minWidth?: number
): Level0Crop | undefined => {
  const region = clampRegion(info, bounds);

  const tile = getLevel0Tile(info, region, minWidth ?? region.w);
  if (!tile) return undefined;

  const sx = tile.width / tile.rect.w;
  const sy = tile.height / tile.rect.h;

  return {
    tile,
    crop: {
      x: (region.x - tile.rect.x) * sx,
      y: (region.y - tile.rect.y) * sy,
      w: region.w * sx,
      h: region.h * sy
    }
  };
}

/**
 * Candidates for stitching: every full-image tile on its own, plus, for each
 * scale factor, all tiles of that grid that overlap the region.
 */
const getTileGroups = (info: Level0ImageInfo, region: Bounds): Level0Tile[][] => {
  const fullTiles = getFullTiles(info).map(t => [t]);

  const grids = info.tiles.flatMap(tile =>
    tile.scaleFactors.map(sf => {
      const spanW = tile.width * sf;
      const spanH = tile.height * sf;

      const startCol = Math.floor(region.x / spanW);
      const startRow = Math.floor(region.y / spanH);
      const endCol = Math.floor((region.x + region.w - 1) / spanW);
      const endRow = Math.floor((region.y + region.h - 1) / spanH);

      const group: Level0Tile[] = [];

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          group.push(getTileAt(info, tile, sf, col, row));
        }
      }

      return group;
    })
  );

  return [...fullTiles, ...grids];
}

// Output pixels per full-image pixel
const groupResolution = (g: Level0Tile[]) => g[0].width / g[0].rect.w;

const groupSize = (g: Level0Tile[]) => g.reduce((sum, t) => sum + t.width * t.height, 0);

/**
 * The smallest set of tiles that, stitched together, shows the region at least minWidth pixels.
 */
const getBestTileGroup = (
  info: Level0ImageInfo,
  region: Bounds,
  minWidth: number
): Level0Tile[] | undefined => {
  const groups = getTileGroups(info, region).filter(g => g.length > 0);

  const required = Math.min(minWidth, region.w) / region.w;

  const sufficient = groups.filter(g => groupResolution(g) >= required);

  if (sufficient.length > 0)
    return sufficient.reduce((a, b) => (groupSize(b) < groupSize(a) ? b : a));

  return groups.reduce<Level0Tile[] | undefined>(
    (a, b) => (!a || groupResolution(b) > groupResolution(a) ? b : a),
    undefined
  );
}

/**
 * Canvas variant: renders the region as an actual image, stitching tiles if needed.
 * `minWidth` defaults to the region's native width.
 */
export const cropRegion = async (
  info: Level0ImageInfo,
  bounds: Bounds,
  minWidth?: number
): Promise<Blob> => {
  const region = clampRegion(info, bounds);

  const group = getBestTileGroup(info, region, minWidth ?? region.w);

  if (!group)
    throw new Error('No usable image source for this region');

  const scale = groupResolution(group);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(region.w * scale));
  canvas.height = Math.max(1, Math.round(region.h * scale));

  const ctx = canvas.getContext('2d');
  
  if (!ctx)
    // Should never happen
    throw new Error('Error initializing canvas context');

  const loader = getThrottledLoader({ callsPerSecond: 20 });

  // TODO implement polite harvesting!
  await Promise.all(group.map(async (tile) => {
    const img = await loader.loadImage(tile.url);

    // Round the edges (not the sizes), so neighbouring tiles leave no seams.
    // Whatever falls outside the canvas is clipped - that's the crop.
    const left = Math.round((tile.rect.x - region.x) * scale);
    const top = Math.round((tile.rect.y - region.y) * scale);
    const right = Math.round((tile.rect.x + tile.rect.w - region.x) * scale);
    const bottom = Math.round((tile.rect.y + tile.rect.h - region.y) * scale);

    ctx.drawImage(img, left, top, right - left, bottom - top);
  }));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      0.95
    );
  });

}