import type { Crop, StitchableTile, Tile } from './types';
import { getFullTiles, getLevel0Tile, getThrottledLoader, toURL } from './utils';
import type {
  Bounds,
  Level0ImageInfo,
  Level0ImageServiceResource,
  TileSpec
} from '../types';
import { fetchImageInfo } from '../helpers';

const clampRegion = (info: Level0ImageInfo, region: Bounds): Bounds => {
  const x = Math.min(Math.max(0, region.x), info.width - 1);
  const y = Math.min(Math.max(0, region.y), info.height - 1);
  const w = Math.max(1, Math.min(region.w, info.width - x));
  const h = Math.max(1, Math.min(region.h, info.height - y));
  return { x, y, w, h };
}

/**
 * CSS variant: the best single image for the region, plus the crop rectangle
 * (in that image's pixels) that the consuming app should show.
 */
export const cropRegionFromTile = (
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

const getTileUrl = (info: Level0ImageInfo, bounds: Bounds): string => {
  const { x, y, w, h } = bounds;
  const tileWidth = info.tiles[0].width;
  const tileHeight = info.tiles[0].height|| info.tiles[0].width;
  return `${info.id}/${x * tileWidth},${y * tileHeight},${w},${h}/${tileWidth},/0/default.jpg`;
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
        url: getTileUrl(info, { x, y, w: effectiveWidth, h: effectiveHeight })
      });
    }
  }

  return tiles;
}

/**
 * Canvas variant: renders the region as an actual image, stitching tiles if needed.
 * `minWidth` defaults to the region's native width.
 */
export const cropStitchedRegion = async (
  source: Level0ImageInfo | Level0ImageServiceResource, 
  bounds: Bounds
): Promise<Blob> => {
  const info = 'tiles' in source
    ? source : await fetchImageInfo(source.serviceUrl);

  if (!info)
    throw new Error(`Error fetching info.json: ${source.serviceUrl}`);

  if (info.type !== 'level0')
    throw new Error(`Not a Level 0 image service ${source.serviceUrl}`);

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

export const cropBounds = () => {

}