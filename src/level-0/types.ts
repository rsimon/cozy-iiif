import type { Bounds, Size } from '../types';

export interface GetLevel0ImageOpts {

  size: 'full' | number | Size;

  fit?: 'cover' | 'contain';

}

export interface Tile {

  url: string;

  width: number;

  height: number;

  region: Bounds

}

/**
 * Tiles meant for stitching don't need the IIIF region. Instead they need 
 * the actual x/y coordinates in the current zoom level.
 */
export interface StitchableTile extends Omit<Tile, 'region'> {

  x: number;

  y: number;

}

export interface CroppedTile extends Tile {

  crop: Bounds;

}