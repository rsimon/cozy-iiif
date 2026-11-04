import type { Bounds, Level0ImageInfo } from '../../types';
import type { GetLevel0ImageOpts } from '../types';
import { getThrottledLoader } from './throttled-loader';
import {
  calculateRenderedSize,
  getLevel0ScaleFactor,
  getLevel0TilesForRegion
} from './level-0-utils';

export const stitchRegionToBlob = async (
  info: Level0ImageInfo,
  region: Bounds,
  opts: GetLevel0ImageOpts,
  callsPerSecond = 5
): Promise<Blob> => {
  // Ideal output size: the region scaled down to fit the 
  // requested size (aspect ratio preserved), but never larger
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
  canvas.width = Math.ceil(region.w / scaleFactor);
  canvas.height = Math.ceil(region.h / scaleFactor);

  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('Error creating canvas context');

  const loader = getThrottledLoader({ callsPerSecond });

  // Place each fetched tile in the composite canvas using scaled image
  // coordinates, offset so the requested region begins at the canvas origin.
  await Promise.all(tiles.map(async tile => {
    const img = await loader.loadImage(tile.url);
    ctx.drawImage(
      img,
      tile.x - region.x / scaleFactor,
      tile.y - region.y / scaleFactor
    );
  }));

  const output = document.createElement('canvas');
  output.width = outputSize.w;
  output.height = outputSize.h;

  const outputContext = output.getContext('2d');
  if (!outputContext)
    throw new Error('Error creating canvas context');

  // Crop the requested region from the tile canvas and resize it to output.
  outputContext.drawImage(
    canvas,
    0,
    0,
    region.w / scaleFactor,
    region.h / scaleFactor,
    0,
    0,
    outputSize.w,
    outputSize.h
  );

  return new Promise((resolve, reject) => {
    output.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.9);
  });
}
