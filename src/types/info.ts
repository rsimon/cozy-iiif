import type { IIIFExternalWebResource } from '@iiif/parser';
import type { Bounds, GetRegionURLOpts, Rotation } from './image';

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

  readonly sizes: Size[];

  readonly serviceUrl: string;

  readonly source: IIIFExternalWebResource;

  getImageURL(minSize?: number, rotation?: Rotation): string;

}

export interface Size {

  width: number;

  height: number;

}

interface TileSpec extends Size {

  scaleFactors: number[];
  
}

export interface Level0ImageInfo extends BaseImageInfo {

  readonly type: 'level0';

}


export interface DynamicImageInfo extends BaseImageInfo {

  readonly type: 'dynamic';

  getRegionURL(bounds: Bounds, rotation?: Rotation, opts?: GetRegionURLOpts): string;

}



