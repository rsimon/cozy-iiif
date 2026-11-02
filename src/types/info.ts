import type { IIIFExternalWebResource } from '@iiif/parser';
import type { Bounds, GetImageURLOpts } from './image';

export type CozyImageInfo = 
  | Level0ImageInfo
  | DynamicImageInfo; 

interface BaseImageInfo {

  readonly id: string;

  readonly majorVersion: number;

  readonly profileLevel: number;

  readonly width: number;

  readonly height: number;

  readonly tiles: TileSpec[];

  readonly sizes: TileSize[];

  readonly serviceUrl: string;

  readonly source: IIIFExternalWebResource;

  getImageURL(opts?: GetImageURLOpts): string | undefined;

}

export interface TileSize {

  width: number;

  height: number;

}

export interface TileSpec extends TileSize {

  scaleFactors: number[];
  
}

export interface Level0ImageInfo extends BaseImageInfo {

  readonly type: 'level0';

}


export interface DynamicImageInfo extends BaseImageInfo {

  readonly type: 'dynamic';

  getRegionURL(bounds: Bounds, opts?: GetImageURLOpts): string | undefined;

}

