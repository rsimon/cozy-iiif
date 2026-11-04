
import { fetchImageInfo } from '../helpers';
import type { CroppedTile, GetLevel0ImageOpts } from './types';
import type { Bounds, Level0ImageInfo, Level0ImageServiceResource } from '../types';
import {
  getLevel0Tile,
  calculateRenderedSize,
  fitRegion,
  stitchRegionToBlob
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

  return stitchRegionToBlob(
    info,
    region,
    opts,
    20
  );

}