
import { fetchImageInfo } from '../helpers';
import type { CroppedTile, GetLevel0ImageOpts } from './types';
import type { Bounds, Level0ImageInfo, Level0ImageServiceResource } from '../types';
import {
  getLevel0Tile,
  getLevel0TilesForRegion,
  getThrottledLoader,
  calculateRenderedSize,
  fitRegion,
  getLevel0ScaleFactor
} from './utils';

/**
 * Returns a single Level 0 image tile that matches the requested `bounds`,
 * plus a `crop` rectangle (in that tile's pixel coordinate space) that 
 * the consuming app should clip the tile to, in order to display the 
 * requested region exactly.
 * 
 * Use this function if you want a simple crop based on a single
 * Level 0 tile and (for example) as CSS clip.
 */
export const cropRegionFromTile = (
  info: Level0ImageInfo,
  bounds: Bounds,
  opts: GetLevel0ImageOpts = { size: 'full' }
): CroppedTile => {
  const imageSize = { w: info.width, h: info.height };

  const region = fitRegion(bounds, imageSize, opts);

  // The requested region, scaled down to the requested 
  // size (aspect ratio preserved), but never larger
  // than the region's native pixel size (no upscaling). 
  const outputSize = calculateRenderedSize(region, opts);

  const tile = getLevel0Tile(info, region, outputSize);

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
 * Returns a cropped region as an image Blob at the requested size.
 * The image will be stitched from multiple Level 0 tiles if needed.
 * 
 * Use this function if you need a high-resolution crop, or binary
 * image data ready for export or download without the need for CSS 
 * masking.
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

  // Ideal output size: the crop scaled down to fit the 
  // requested size (aspect ratio preserved), but never larger
  // than the region's native pixel size (no upscaling). 
  const renderedSize = calculateRenderedSize(region, opts);

  // Lowest-resolution available scale factor that still delivers
  // at least the resolution needed for renderedSize. If the server
  // has nothing high-res enough, falls back to the highest-res
  // factor.
  const scaleFactor = getLevel0ScaleFactor(info, region, renderedSize);
  
  // Actual output size. Equals renderedSize unless the the fallback
  // was hit in `getLevel0ScaleFactor`.
  const outputSize = calculateRenderedSize(region, opts, 1 / scaleFactor);
  
  const tiles = getLevel0TilesForRegion(info, region, scaleFactor);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx)
    throw new Error('Error initializing canvas context');
  
  const tilesWidth = Math.ceil(region.w / scaleFactor);
  const tilesHeight = Math.ceil(region.h / scaleFactor);

  canvas.width = tilesWidth;
  canvas.height = tilesHeight;

  const loader = getThrottledLoader({ callsPerSecond: 20 });

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

  // Draw cropped region
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
      0.9
    );
  });

}