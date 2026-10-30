import type { Bounds } from '../types';

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

export interface Crop {

  tile: Tile;

  crop: Bounds;

}