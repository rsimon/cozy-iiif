import type {
  Manifest, 
  Canvas, 
  ImageService2, 
  ImageService3, 
  IIIFExternalWebResource, 
  Collection, 
  Range, 
  AnnotationPage 
} from '@iiif/presentation-3';

export type CozyParseResult = 
  | { type: 'collection', url: string, resource: CozyCollection }
  | { type: 'manifest'; url: string, resource: CozyManifest }
  | { type: 'iiif-image'; url: string, resource: CozyImageResource }
  | { type: 'plain-image'; url: string }
  | { type: 'webpage'; url: string }
  | { 
      type: 'error';
      code: 'INVALID_URL' | 'INVALID_HTTP_RESPONSE' | 'FETCH_ERROR' | 'INVALID_MANIFEST' | 'UNSUPPORTED_FORMAT';
      message: string;
    };

export interface CozyCollection {

  readonly majorVersion: number;

  readonly source: Collection;

  readonly id: string;

  readonly items: CozyCollectionItem[];

  getLabel(locale?: string): string | undefined;

  getMetadata(locale?: string): CozyMetadata[];

}

export interface CozyCollectionItem {

  readonly id: string;

  readonly type: string;

  readonly source: any;

  getLabel(locale?: string): string | undefined;

}

export interface CozyManifest {

  readonly majorVersion: number;

  readonly source: Manifest;

  readonly id: string;

  readonly canvases: CozyCanvas[];

  readonly structure: CozyRange[];

  getLabel(locale?: string): string | undefined;

  getTableOfContents(): CozyTOC;

  getMetadata(locale?: string): CozyMetadata[];

}

export interface CozyRange {

  readonly source: Range;

  readonly id: string;

  readonly items: (CozyCanvas | CozyRange)[];

  readonly canvases: CozyCanvas[];

  readonly ranges: CozyRange[];

  getLabel(locale?: string): string | undefined;

}

export interface CozyCanvas {

  readonly source: Canvas;

  readonly id: string;

  readonly width: number;

  readonly height: number;

  readonly images: CozyImageResource[];

  readonly annotations: AnnotationPage[];

  getLabel(locale?: string): string;

  getMetadata(locale?: string): CozyMetadata[];

  getThumbnailURL(minSize?: number): string;

}

export interface CozyMetadata {

  readonly label: string;

  readonly value: string;

}

export interface CozyTOC {

  root: CozyTOCNode[];

  enumerateNodes(type?: 'range' | 'canvas'): CozyTOCNode[];

  getBreadcrumbs(id: string): CozyTOCNode[];

  getNode(id: string): CozyTOCNode | undefined;

}

export interface CozyTOCNode {

  readonly id: string;

  readonly type: 'range' | 'canvas';

  readonly source: CozyRange | CozyCanvas;

  readonly children: CozyTOCNode[];

  readonly navItems: CozyCanvas[]; 

  readonly navSections: CozyRange[];

  readonly parent?: CozyTOCNode;

  readonly level: number;

  getLabel(locale?: string): string | undefined;

}

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

}

export interface StaticImageResource extends BaseImageResource {

  readonly type: 'static';

  readonly url: string;

}

export interface DynamicImageServiceResource extends BaseImageResource {

  readonly type: 'dynamic';

  readonly service: ImageService2 | ImageService3;

  readonly serviceUrl: string;

  readonly majorVersion: number;

  getRegionURL(bounds: Bounds, minSize?: number): string;

}

export interface Level0ImageServiceResource extends BaseImageResource {

  readonly type: 'level0';

  readonly majorVersion: number;

  readonly service: ImageService2 | ImageService3;

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