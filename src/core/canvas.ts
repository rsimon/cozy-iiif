import type { Canvas, IIIFExternalWebResource, SpecificResource } from '@iiif/presentation-3';
import { Traverse, type AnyMotivation } from '@iiif/parser';
import type { CozyCanvas, CozyImageResource } from '../types';
import { getLabel, getMetadata } from './resource';
import { parseTarget } from './selector';
import { 
  getImageURL,
  getMinSizeDimensions, 
  isImageService,
  parseImageResource
 } from './image';

/**
 * Parse raw JSON presentation API Canvas into a CozyCanvas.
 */
export const parseCanvas = (canvas: Canvas): CozyCanvas => {
  const images = getImages(canvas);

  return {
    source: canvas,
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    images,
    annotations: (canvas.annotations || []),
    getImageURL: images.length > 0 ? images[0].getImageURL : () => undefined,
    getLabel: getLabel(canvas),
    getMetadata: getMetadata(canvas),
    getThumbnailURL: getThumbnailURL(canvas, images)
  } as CozyCanvas;
}

/**
 * From a raw JSON presentation API Canvas, get each
 * image 'painting' annotation as a CozyImageResouce.
 */
export const getImages = (canvas: Canvas): CozyImageResource[] => {
  const images: CozyImageResource[] = [];

  const isPainting = (arg?: AnyMotivation | AnyMotivation[]) => 
    arg ? Array.isArray(arg) ? arg.includes('painting') : arg === 'painting' : true;

  const builder = new Traverse({
    annotation: [anno => {
      if (isPainting(anno.motivation)) {
        const bodies = anno.body ? 
          Array.isArray(anno.body) ? anno.body : [anno.body] 
          : [];
        
        const target = parseTarget(anno.target);

        const imageBodies = bodies.filter(b => 
          (b as IIIFExternalWebResource).type === 'Image' || 
          (b as SpecificResource).type === 'SpecificResource' && (b as SpecificResource).source?.type === 'Image');

        images.push(...imageBodies.map(body => parseImageResource(body as IIIFExternalWebResource, target)));
      }
    }]
  });

  builder.traverseCanvas(canvas);

  return images;
}

/**
 * Returns a thumbnail URL for the given (raw JSON) presentation API 
 * Canvas. Prefers the `thumbnail` property on the canvas, if available, 
 * or picks the first available image resource on the Canvas. (Optionally,
 * provide a list of CozyImageResources to override.)
 */
export const getThumbnailURL = (
  canvas: Canvas, 
  images: CozyImageResource[] = getImages(canvas)
) => (minSize = 400): string | undefined => {
  const { width, height } = canvas;
  if (!width || !height) return;

  const { w, h } = getMinSizeDimensions(width, height, minSize);

  if (canvas.thumbnail && canvas.thumbnail.length > 0) {
    const thumbnail = canvas.thumbnail[0];

    if ('service' in thumbnail && Array.isArray(thumbnail.service)) {
      const service = thumbnail.service.find(s => isImageService(s));
      if (service)
        return getImageURL(w, h, service)();
    }

    if ('id' in thumbnail) return thumbnail.id;
  }

  for (const image of images) {
    if (image.type === 'dynamic' || image.type === 'level0') {
      return getImageURL(w, h, image.service)();
    } else if (image.type === 'static') {
      return image.url;
    }    
  }
}

