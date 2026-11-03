
import { fetchImageInfo } from '../helpers';
import type { CroppedTile, GetLevel0ImageOpts } from './types';
import type {
  Bounds,
  Level0ImageInfo,
  Level0ImageServiceResource
} from '../types';
import {
  getLevel0Tile,
  getLevel0TilesForRegion,
  getThrottledLoader,
  calculateRenderedSize,
  fitRegion,
  getLevel0ScaleFactor
} from './utils';

/**
 * CSS variant: the best single image for the region, plus the crop rectangle
 * (in that image's pixels) that the consuming app should show.
 */
export const cropRegionFromTile = (
  info: Level0ImageInfo,
  bounds: Bounds,
  opts: GetLevel0ImageOpts = { size: 'full' }
): CroppedTile => {
  const imageSize = { w: info.width, h: info.height };
  const region = fitRegion(bounds, imageSize, opts);
  const outputSize = calculateRenderedSize(region, opts);

  const tile = getLevel0Tile(info, region, outputSize);
  if (!tile) throw new Error(`No usable tile found for Level 0 image ${info.id}`);

  const sx = tile.width / tile.region.w;
  const sy = tile.height / tile.region.h;

  return {
    ...tile,
    crop: {
      x: (region.x - tile.region.x) * sx,
      y: (region.y - tile.region.y) * sy,
      w: region.w * sx,
      h: region.h * sy
    }
  };
}

/**
 * Canvas variant: renders a region at the requested size, stitching tiles if needed.
 * Defaults to native resolution without upscaling.
 */
export const cropStitchedRegion = async (
  source: Level0ImageInfo | Level0ImageServiceResource, 
  bounds: Bounds,
  opts: GetLevel0ImageOpts = { size: 'full' }
): Promise<Blob> => {
  const info = 'tiles' in source
    ? source : await fetchImageInfo(source.serviceUrl);

  if (!info)
    throw new Error(`Error fetching info.json: ${source.serviceUrl}`);

  if (info.type !== 'level0')
    throw new Error(`Not a Level 0 image service ${source.serviceUrl}`);

  const imageSize = { w: info.width, h: info.height };
  const region = fitRegion(bounds, imageSize, opts);
  const desiredSize = calculateRenderedSize(region, opts);
  const scaleFactor = getLevel0ScaleFactor(info, region, desiredSize);
  const outputSize = calculateRenderedSize(region, opts, 1 / scaleFactor);
  const tiles = getLevel0TilesForRegion(info, region, scaleFactor);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx)
    // Should never happen
    throw new Error('Error initializing canvas context');
  
  const tilesWidth = Math.ceil(region.w / scaleFactor);
  const tilesHeight = Math.ceil(region.h / scaleFactor);

  canvas.width = tilesWidth;
  canvas.height = tilesHeight;

  const loader = getThrottledLoader({ callsPerSecond: 20 });

  // TODO implement polite harvesting!
  await Promise.all(tiles.map(async (tile) => {
    const img = await loader.loadImage(tile.url);
    const x = tile.x - (region.x / scaleFactor);
    const y = tile.y - (region.y / scaleFactor);
    ctx.drawImage(img, x, y);
  }));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = outputSize.w;
  cropCanvas.height = outputSize.h;

  const cropCtx = cropCanvas.getContext('2d');
  
  if (!cropCtx)
    throw new Error('Error initializing canvas context');

  // Copy cropped region
  cropCtx.drawImage(canvas,
    0, 0, region.w / scaleFactor, region.h / scaleFactor,
    0, 0, outputSize.w, outputSize.h
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