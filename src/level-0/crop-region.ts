import type { Crop, StitchableTile, Tile } from './types';
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
): Tile => {
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
      region: { x: 0, y: 0, w: info.width, h: info.height }
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
    region: { x, y, w, h }
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
): Crop | undefined => {
  const region = clampRegion(info, bounds);

  const tile = getLevel0Tile(info, region, minWidth ?? region.w);
  if (!tile) return undefined;

  const sx = tile.width / tile.region.w;
  const sy = tile.height / tile.region.h;

  return {
    tile,
    crop: {
      x: (region.x - tile.region.x) * sx,
      y: (region.y - tile.region.y) * sy,
      w: region.w * sx,
      h: region.h * sy
    }
  };
}

/**
 * Candidates for stitching: every full-image tile on its own, plus, for each
 * scale factor, all tiles of that grid that overlap the region.
 */
const getTileGroups = (info: Level0ImageInfo, region: Bounds): Tile[][] => {
  const fullTiles = getFullTiles(info).map(t => [t]);

  const grids = info.tiles.flatMap(tile =>
    tile.scaleFactors.map(sf => {
      const spanW = tile.width * sf;
      const spanH = tile.height * sf;

      const startCol = Math.floor(region.x / spanW);
      const startRow = Math.floor(region.y / spanH);
      const endCol = Math.floor((region.x + region.w - 1) / spanW);
      const endRow = Math.floor((region.y + region.h - 1) / spanH);

      const group: Tile[] = [];

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
const groupResolution = (g: Tile[]) => g[0].width / g[0].region.w;

const groupSize = (g: Tile[]) => g.reduce((sum, t) => sum + t.width * t.height, 0);

/**
 * The smallest set of tiles that, stitched together, shows the region at least minWidth pixels.
 */
const getBestTileGroup = (
  info: Level0ImageInfo,
  region: Bounds,
  minWidth: number
): Tile[] | undefined => {
  const groups = getTileGroups(info, region).filter(g => g.length > 0);

  const required = Math.min(minWidth, region.w) / region.w;

  const sufficient = groups.filter(g => groupResolution(g) >= required);

  if (sufficient.length > 0)
    return sufficient.reduce((a, b) => (groupSize(b) < groupSize(a) ? b : a));

  return groups.reduce<Tile[] | undefined>(
    (a, b) => (!a || groupResolution(b) > groupResolution(a) ? b : a),
    undefined
  );
}

const getTilesForRegion = (info: Level0ImageInfo, bounds: Bounds): StitchableTile[] => {
  const tileWidth = info.tiles[0].width;
  const tileHeight = info.tiles[0].height || info.tiles[0].width; // fallback for square tiles
  const maxWidth = info.width;
  const maxHeight = info.height;

  const startTileX = Math.floor(bounds.x / tileWidth);
  const startTileY = Math.floor(bounds.y / tileHeight);
  const endTileX = Math.ceil((bounds.x + bounds.w) / tileWidth);
  const endTileY = Math.ceil((bounds.y + bounds.h) / tileHeight);

  const getTileUrl = (bounds: Bounds): string => {
    const { x, y, w, h } = bounds;
    const tileWidth = info.tiles[0].width;
    const tileHeight = info.tiles[0].height|| info.tiles[0].width;
    return `${info.id}/${x * tileWidth},${y * tileHeight},${w},${h}/${tileWidth},/0/default.jpg`;
  }

  const tiles: StitchableTile[] = [];
  
  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      // Skip tiles outside image bounds
      if (x * tileWidth >= maxWidth || y * tileHeight >= maxHeight) {
        continue;
      }

      // Calculate actual tile dimensions (might be smaller at edges)
      const effectiveWidth = Math.min(tileWidth, maxWidth - (x * tileWidth));
      const effectiveHeight = Math.min(tileHeight, maxHeight - (y * tileHeight));

      tiles.push({
        x,
        y,
        width: effectiveWidth,
        height: effectiveHeight,
        url: getTileUrl({ x, y, w: effectiveWidth, h: effectiveHeight })
      });
    }
  }

  return tiles;
}

/**
 * Canvas variant: renders the region as an actual image, stitching tiles if needed.
 * `minWidth` defaults to the region's native width.
 */
export const cropRegion = async (info: Level0ImageInfo, bounds: Bounds): Promise<Blob> => {
  const tiles = getTilesForRegion(info, bounds);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx)
    // Should never happen
    throw new Error('Error initializing canvas context');
  
  const tileWidth = info.tiles[0].width;
  const tileHeight = info.tiles[0].height || info.tiles[0].width;

  const tilesWidth = (Math.ceil(bounds.w / tileWidth) + 1) * tileWidth;
  const tilesHeight = (Math.ceil(bounds.h / tileHeight) + 1) * tileHeight;

  canvas.width = tilesWidth;
  canvas.height = tilesHeight;

  const loader = getThrottledLoader({ callsPerSecond: 20 });

  // TODO implement polite harvesting!
  await Promise.all(tiles.map(async (tile) => {
    const img = await loader.loadImage(tile.url);
    const x = (tile.x * tileWidth) - bounds.x;
    const y = (tile.y * tileHeight) - bounds.y;
    ctx.drawImage(img, x, y);
  }));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = bounds.w;
  cropCanvas.height = bounds.h;

  const cropCtx = cropCanvas.getContext('2d');
  
  if (!cropCtx)
    throw new Error('Error initializing canvas context');

  // Copy cropped region
  cropCtx.drawImage(canvas, 
    0, 0, bounds.w, bounds.h,
    0, 0, bounds.w, bounds.h
  );

  return new Promise((resolve, reject) => {
    cropCanvas.toBlob(
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