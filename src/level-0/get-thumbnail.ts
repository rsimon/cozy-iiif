import {
  getLevel0OutputSize,
  getLevel0Region,
  getLevel0ScaleFactor,
  getLevel0TilesForRegion,
  getThrottledLoader
} from './utils';
import type { Crop } from './types';
import { cropRegionFromTile } from './crop-region';
import type { Level0ImageInfo, Level0ImageServiceResource } from '../types';
import { fetchImageInfo } from '../helpers';
import type { GetLevel0ImageOpts } from './types';

/**
 * Returns a tile and crop rectangle for displaying a Level 0 thumbnail.
 */
export const getThumbnailTile = (
  info: Level0ImageInfo,
  opts: GetLevel0ImageOpts = { size: 400 }
): Crop => cropRegionFromTile(info, {
  x: 0,
  y: 0,
  w: info.width,
  h: info.height
}, opts);

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

  const region = getLevel0Region({
    x: 0,
    y: 0,
    w: info.width,
    h: info.height
  }, opts);
  const desiredSize = getLevel0OutputSize(region, opts);
  const scaleFactor = getLevel0ScaleFactor(info, region, desiredSize);
  const outputSize = getLevel0OutputSize(region, opts, 1 / scaleFactor);
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
