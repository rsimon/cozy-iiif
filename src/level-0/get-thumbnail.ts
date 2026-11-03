import { fetchImageInfo } from '../helpers';
import type { Level0ImageInfo, Level0ImageServiceResource } from '../types';
import { cropRegionFromTile } from './crop-region';
import type { CroppedTile, GetLevel0ImageOpts } from './types';
import {
  calculateRenderedSize,
  fitRegion,
  getLevel0ScaleFactor,
  getLevel0TilesForRegion,
  getThrottledLoader
} from './utils';

/**
 * Returns a single Level 0 tile suitable for displaying as a thumbnail
 * in the requested size. (Default: 400x400 px, `contain` fit mode.) 
 * 
 * The result includes a `crop` region, which will be equal to the px size 
 * of the tile if the thumbnail was requested in `contain` mode. If the
 * thumbnail was requested in `cover` mode, the crop region will represent
 * the corresponding center-crop.
 * 
 * Use this function is you want a simple thumbnail based on a single
 * Level 0 tile (optionally clip-able to the crop region via CSS).
 */
export const getThumbnailTile = (
  info: Level0ImageInfo,
  opts: GetLevel0ImageOpts = { size: 400 }
): CroppedTile => cropRegionFromTile(info, {
  x: 0,
  y: 0,
  w: info.width,
  h: info.height
}, opts);

/**
 * Returns a thumbnail image as a Blob. The thumbnail will be
 * sized and cropped according to the `size` and `fit` arguments,
 * and assembled by stitching, cropping and resizing mulitple 
 * Level 0 tiles if necessary.
 * 
 * Use this function if you need a high-resolution thumbnail, or
 * a file-based thumbnail ready for export or download without
 * the need for CSS masking.
 */
export const getStitchedThumbnail = async (
  source: Level0ImageInfo | Level0ImageServiceResource,
  opts: GetLevel0ImageOpts = { size: 400 }
): Promise<Blob> => {
  const info = 'tiles' in source
    ? source : await fetchImageInfo(source.serviceUrl);

  if (!info)
    throw new Error(`Error fetching info.json: ${source.serviceUrl}`);

  if (info.type !== 'level0')
    throw new Error(`Not a Level 0 image service ${source.serviceUrl}`);

  const imageSize = { w: info.width, h: info.height };

  const region = fitRegion({
    x: 0,
    y: 0,
    w: imageSize.w,
    h: imageSize.h
  }, imageSize, opts);

  // Ideal output size: the region scaled down to fit the 
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
  canvas.width = Math.ceil(region.w / scaleFactor);
  canvas.height = Math.ceil(region.h / scaleFactor);

  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('Error creating canvas context');

  const loader = getThrottledLoader();
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
    }, 'image/jpeg', 0.85);
  });
}
