import { getThrottledLoader } from './utils/throttled-loader';
import type { Level0Tile } from './types';
import { getLevel0Tile } from './utils';
import type { Bounds, Level0ImageInfo, Size } from '../types';

const DEFAULT_MIN_WIDTH = window.devicePixelRatio * 200;

/** Translates a min width and/or min height into a min width. Never exceeds the full image. */
const getMinWidth = (info: Level0ImageInfo, minSize?: Partial<Size>) => {
  const { width, height } = minSize || {};

  if (!width && !height)
    return Math.min(DEFAULT_MIN_WIDTH, info.width);

  const fromHeight = height ? (height * info.width) / info.height : 0;
  return Math.min(Math.max(width || 0, fromHeight), info.width);
}

/**
 * The best Level 0 image for the whole picture at (at least) the given size.
 * Use the URL directly, and let CSS scale it down to the exact size.
 */
export const getThumbnailTile = (info: Level0ImageInfo, minSize?: Partial<Size>): Level0Tile => {
  const fullRegion: Bounds = { x: 0, y: 0, w: info.width, h: info.height };

  const tile = getLevel0Tile(info, fullRegion, getMinWidth(info, minSize));

  // Can't happen: the full image is always a candidate
  if (!tile) throw new Error('No usable image size found');

  return tile;
}

/**
 * Renders the whole picture at exactly the requested size (aspect ratio preserved),
 * using the best Level 0 image as the source.
 */
export const renderThumbnailImage = async (
  info: Level0ImageInfo,
  minSize?: Partial<Size>
): Promise<Blob> => {
  const tile = getThumbnailTile(info, minSize);

  const width = Math.ceil(getMinWidth(info, minSize));
  const height = Math.min(info.height, Math.ceil((width * info.height) / info.width));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new Error('Error creating canvas context');

  const loader = getThrottledLoader();

  const img = await loader.loadImage(tile.url);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.85);
  });
}