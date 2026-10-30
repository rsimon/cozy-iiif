import { getThrottledLoader } from './utils/throttled-loader';
import type { StitchableTile, Tile } from './types';
import { getLevel0Tile } from './utils';
import type { Bounds, Level0ImageInfo, Level0ImageServiceResource, Size } from '../types';
import { fetchImageInfo } from '../helpers';

const DEFAULT_MIN_WIDTH = 400;

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
export const getThumbnailTile = (info: Level0ImageInfo, minSize?: Partial<Size>): Tile => {
  const fullRegion: Bounds = { x: 0, y: 0, w: info.width, h: info.height };

  const tile = getLevel0Tile(info, fullRegion, getMinWidth(info, minSize));

  // Can't happen: the full image is always a candidate
  if (!tile) throw new Error('No usable image size found');

  return tile;
}

// Best-matching scale factor for the given min size
const getBestScaleFactor = (info: Level0ImageInfo, minSize?: Partial<Size>): number => {
  // Sort descending
  const scaleFactors = info.tiles[0].scaleFactors.sort((a, b) => b - a); 
  
  if (!minSize) 
    // Just return highest scale factor
    return scaleFactors[0];

  const scaleX = minSize.width ? info.width / minSize.width : Infinity;
  const scaleY = minSize.height ? info.height / minSize.height : Infinity;

  const scale = Math.min(scaleX, scaleY);

  // Find the smallest scale factor that still meets our minimum size requirements
  for (const factor of scaleFactors) {
    if (factor <= scale)
      return factor;
  }

  // If no scale factor is small enough, return the smallest available
  return scaleFactors[scaleFactors.length - 1];
}

const getThumbnailDimensions = (info: Level0ImageInfo, minSize?: Partial<Size>): Size => {
  const scaleFactor = getBestScaleFactor(info, minSize);

  let width = Math.ceil(info.width / scaleFactor);
  let height = Math.ceil(info.height / scaleFactor);

  if (minSize) {
    const aspectRatio = info.width / info.height;
    
    if (minSize.width && width < minSize.width) {
      width = minSize.width;
      height = Math.ceil(width / aspectRatio);
    }
    
    if (minSize.height && height < minSize.height) {
      height = minSize.height;
      width = Math.ceil(height * aspectRatio);
    }
  }

  return { width, height };
}

// Determines which tiles to harvest for the given thumbnail min size
const getThumbnailTiles = (info: Level0ImageInfo, minSize?: Partial<Size>): StitchableTile[] => {
  const scaleFactor = getBestScaleFactor(info, minSize);

  const tileWidth = info.tiles[0].width;
  const tileHeight = info.tiles[0].height || info.tiles[0].width;
  
  const cols = Math.ceil(info.width / (tileWidth * scaleFactor));
  const rows = Math.ceil(info.height / (tileHeight * scaleFactor));
  
  const tiles: StitchableTile[] = [];
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const actualWidth = Math.min(tileWidth, 
        (info.width - x * tileWidth * scaleFactor) / scaleFactor);

      const actualHeight = Math.min(tileHeight, 
        (info.height - y * tileHeight * scaleFactor) / scaleFactor);
        
      if (actualWidth <= 0 || actualHeight <= 0) continue;

      tiles.push({
        url: `${info.id}/${x * tileWidth * scaleFactor},${y * tileHeight * scaleFactor},${actualWidth * scaleFactor},${actualHeight * scaleFactor}/${Math.ceil(actualWidth)},/0/default.jpg`,
        width: Math.ceil(actualWidth),
        height: Math.ceil(actualHeight), 
        x: x * tileWidth,
        y: y * tileHeight
      });
    }
  }
  
  return tiles;
}

export const getStitchedThumbnail = async (
  source: Level0ImageInfo | Level0ImageServiceResource,
  minSize?: Partial<Size>
): Promise<Blob> => {
  const info = 'tiles' in source
    ? source : await fetchImageInfo(source.serviceUrl);
  
  if (!info)
    throw new Error(`Error fetching info.json: ${source.serviceUrl}`);

  if (info.type !== 'level0')
    throw new Error(`Not a Level 0 image service ${source.serviceUrl}`);

  const tiles = getThumbnailTiles(info, minSize);
  const dimensions = getThumbnailDimensions(info, minSize);
  
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) 
      throw new Error('Error creating canvas context');

  const loader = getThrottledLoader();

  await Promise.all(tiles.map(async (tile) => {
    const img = await loader.loadImage(tile.url);
    ctx.drawImage(img, tile.x, tile.y);
  }));

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.85);
  });
  
}