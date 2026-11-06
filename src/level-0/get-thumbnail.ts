import { getImageURL } from '../core';
import { fetchImageInfo } from '../helpers';
import { cropRegionFromTile } from './crop-region';
import type { CroppedTile, GetLevel0ImageOpts } from './types';
import { fitRegion, stitchRegionToBlob } from './utils';
import type { 
  CozyCanvas, 
  CozyImageResource, 
  Level0ImageInfo, 
  Level0ImageServiceResource 
} from '../types';

/**
 * Returns a single Level 0 tile suitable for displaying as a thumbnail
 * in the requested size. (Default: 400x400 px, `contain` fit mode.) 
 * 
 * The result includes a `crop` region, which will be equal to the px size 
 * of the tile if the thumbnail was requested in `contain` mode. If the
 * thumbnail was requested in `cover` mode, the crop region will represent
 * the corresponding center-crop.
 * 
 * Use this function if you want a simple thumbnail based on a single
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
 * binary image data ready for export or download without
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

  return stitchRegionToBlob(info, region, opts);
}

/** 
 * A near-drop-in replacement for the standard canvas.getThumbnailURL() method
 * which resolves `info.json` for Level 0 tilesets, so that a suitable `size`
 * can be chosen for the thumbnail instead of the full high-res image. Returns
 * a `Promise<string | undefined>`.
 */
export const getThumbnailURL = async (
  canvas: CozyCanvas,
  images: CozyImageResource[] = canvas.images,
  opts: GetLevel0ImageOpts = { size: 400 }
) => {
  const { width, height } = canvas;
  if (!width || !height) return;
  
  if (canvas.source.thumbnail && canvas.source.thumbnail.length > 0)
    return canvas.getThumbnailURL();
  
  for (const image of images) {
    if (image.type === 'dynamic') {
      return image.getImageURL(opts);
    } else if (image.type === 'level0') {
      const info = await fetchImageInfo(image.serviceUrl);

      // Guard against `undefined` and make TS happy
      if (info?.type === 'level0')
        return getThumbnailTile(info, opts).url;
    } else if (image.type === 'static') {
      return image.url;
    }    
  }
}
