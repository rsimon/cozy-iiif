import { v4 as uuidv4 } from 'uuid';
import type { Annotation } from '@iiif/presentation-3';
import type { CozyCanvas, CozyManifest } from '../types';

// Helper to escape special characters in strings used in RegExp
const escapeRegExp = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAnnotationPageId = (canvas: CozyCanvas, namespace?: string) => {
  if (namespace) {
    // Use naming convention `{canvas.id}/namespace/page/p{idx}`. This means we need
    // to find the highest index currently in use. (Index starts with 1.)
    const pages = canvas.annotations;
    if (pages.length > 0) {
      const pattern = new RegExp(`${escapeRegExp(canvas.id)}/${escapeRegExp(namespace)}/page/p(\\d+)$`);
      
      const highestIdx = pages.reduce<number>((highest, page) => {
        const match = page.id.match(pattern);
        if (match && match[1]) {
          const thisIndex = parseInt(match[1]);
          return Math.max(highest, thisIndex);
        } else {
          return highest;
        }
      }, 1);

      return `${canvas.id}/${namespace}/annotations/page/p${highestIdx}`;
    } else {
      return `${canvas.id}/${namespace}/annotations/page/p1`;
    }
  } else {
    // Use UUIDs as a fallback naming convention
    return `${canvas.id}/annotations/page/${uuidv4()}`;
  }
}

/** 
 * Will blindy attach the annotations to this canvas.
 */
const importAnnotationsToCanvas = (canvas: CozyCanvas, annotations: Annotation[], namespace?: string) => {
  const page = {
    id: getAnnotationPageId(canvas, namespace),
    type: 'AnnotationPage',
    items: annotations
  }

  return {
    source: {
      ...canvas.source,
      annotations: [...canvas.annotations, page]
    },
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    images: [...canvas.images],
    annotations: [...canvas.annotations, page],
    getLabel: canvas.getLabel,
    getMetadata: canvas.getMetadata,
    getThumbnailURL: canvas.getThumbnailURL
  } as CozyCanvas;
}

/**
 * Will use 'source' information from the annotation targets to associate annotations with the right
 * canvases.
 */
const importAnnotationsToManifest = (manifest: CozyManifest, annotations: Annotation[], namespace?: string) => {
  const getSource = (annotation: Annotation) => {
    const target = annotation.target;
    if (!target) return;

    if (typeof target === 'string')
      return target.substring(0, target.indexOf('#'));
    else
      return (target as any).source; 
  }

  const bySource = annotations.reduce<Record<string, Annotation[]>>((acc, annotation) => {
    const source = getSource(annotation);
    if (!source) return acc;
    
    if (!acc[source]) acc[source] = [];
    acc[source].push(annotation);

    return acc;
  }, {});

  const canvases = manifest.canvases.map(canvas => {
    const toImport = bySource[canvas.id] || [];
    return toImport.length > 0 ? importAnnotationsToCanvas(canvas, toImport, namespace) : canvas;
  });

  return {
    source: {
      ...manifest.source,
      items: canvases.map(c => c.source)
    },
    id: manifest.id,
    majorVersion: manifest.majorVersion,
    canvases,
    structure: manifest.structure,
    getLabel: manifest.getLabel,
    getMetadata: manifest.getMetadata,
    getTableOfContents: manifest.getTableOfContents
  }
}

export const importAnnotations = <T extends CozyManifest | CozyCanvas>(
  resource: T, 
  annotations: Annotation[], 
  namespace?: string
): T extends CozyCanvas ? CozyCanvas : CozyManifest =>
  resource.source.type === 'Canvas' 
    ? importAnnotationsToCanvas(resource as CozyCanvas, annotations, namespace) as T extends CozyCanvas ? CozyCanvas : CozyManifest
    : importAnnotationsToManifest(resource as CozyManifest, annotations, namespace) as T extends CozyCanvas ? CozyCanvas : CozyManifest;
