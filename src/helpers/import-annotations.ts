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

export const importAnnotations = (canvas: CozyCanvas, annotations: Annotation[], namespace?: string) => {
  const page = {
    id: getAnnotationPageId(canvas, namespace),
    type: 'AnnotationPage',
    items: annotations
  }

  return {
    source: canvas.source,
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