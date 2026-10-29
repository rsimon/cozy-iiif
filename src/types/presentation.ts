import type { AnnotationPage, Canvas, Collection, Manifest, Range } from '@iiif/presentation-3';
import type { CozyImageResource, Rotation } from './image';

export interface CozyCollection {

  readonly majorVersion: number;

  readonly source: Collection;

  readonly id: string;

  readonly type: 'Collection';

  readonly items: CozyCollectionItem[];

  getLabel(locale?: string): string | undefined;

  getMetadata(locale?: string): CozyMetadata[];

}

export interface CozyCollectionManifestItem {

  readonly id: string;

  readonly type: 'Manifest';

  readonly source: any;

  getLabel(locale?: string): string | undefined;

}

export type CozyCollectionItem = CozyCollectionManifestItem | CozyCollection;

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

  getImageURL(minSize?: number, rotation?: Rotation): string;

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

  getNavParent(canvasId: string): CozyRange | undefined;

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