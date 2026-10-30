import type { IIIFExternalWebResource, Service } from '@iiif/presentation-3';
import type { Size } from './info';

export type CozyImageResource = 
  | StaticImageResource 
  | ImageServiceResource;

export type ImageServiceResource =
  | DynamicImageServiceResource
  | Level0ImageServiceResource;

interface BaseImageResource {

  readonly source: IIIFExternalWebResource;

  readonly type: 'static' | 'dynamic' | 'level0';

  readonly width: number;

  readonly height: number;

  readonly target?: Bounds;

  readonly selector?: Bounds;

  getImageURL(minSize?: number, rotation?: Rotation): string;

}

export interface StaticImageResource extends BaseImageResource {

  readonly type: 'static';

  readonly url: string;

  getPixelSize(): Promise<Size>;

}

export interface DynamicImageServiceResource extends BaseImageResource {

  readonly type: 'dynamic';

  readonly service: Service;

  readonly serviceUrl: string;

  readonly majorVersion: number;

  readonly profileLevel: number;

  getRegionURL(bounds: Bounds, rotation?: Rotation, opts?: GetRegionURLOpts): string;

}

export interface Level0ImageServiceResource extends BaseImageResource {

  readonly type: 'level0';

  readonly majorVersion: number;

  readonly service: Service;

  readonly serviceUrl: string;

}


export interface ImageRequestOptions {

  readonly width?: number;

  readonly height?: number;

  readonly region?: 'full' | 'square' | { x: number; y: number; width: number; height: number };

  readonly quality?: 'default' | 'color' | 'gray' | 'bitonal';

  readonly format?: 'jpg' | 'png' | 'gif' | 'webp';

}

export interface Bounds {

  x: number;

  y: number;

  w: number;

  h: number;

}

export interface GetRegionURLOpts {

  minSize?: number;

  maxSize?: number;

}

export interface RotationOptions {

  degrees: number;

  mirrored?: boolean;

}

export type Rotation = number | RotationOptions;