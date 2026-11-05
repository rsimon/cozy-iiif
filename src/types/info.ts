import type { IIIFExternalWebResource } from '@iiif/parser';
import type { Bounds, GetImageURLOpts } from './image';
import type { ImageSize, ImageTile } from '@iiif/presentation-3';

export type CozyImageInfo = 
  | Level0ImageInfo
  | DynamicImageInfo; 

interface BaseImageInfo {

  readonly id: string;

  readonly majorVersion: number;

  readonly profileLevel: number;

  readonly width: number;

  readonly height: number;

  readonly tiles: ImageTile[];

  readonly sizes: ImageSize[];

  readonly serviceUrl: string;

  readonly source: IIIFExternalWebResource;

  getImageURL(opts?: GetImageURLOpts): string;

}

export interface Level0ImageInfo extends BaseImageInfo {

  readonly type: 'level0';

}

export interface DynamicImageInfo extends BaseImageInfo {

  readonly type: 'dynamic';

  getRegionURL(bounds: Bounds, opts?: GetImageURLOpts): string;

}

