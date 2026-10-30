import type { Bounds } from '../types';

export interface Level0Tile {

  url: string;

  width: number;

  height: number;

  rect: Bounds;

}

export interface Level0Crop {

  tile: Level0Tile;

  crop: Bounds;

}