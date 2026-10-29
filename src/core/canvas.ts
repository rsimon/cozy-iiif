import type { Canvas, IIIFExternalWebResource, SpecificResource } from '@iiif/presentation-3';
import { Traverse, type AnyMotivation } from '@iiif/parser';
import type { CozyCanvas, CozyImageResource } from '../types';
import { getLabel, getMetadata } from './resource';
import { parseTarget } from './selector';
import { 
  createCozyImageResource, 
  getMinSizeDimensions, 
  getImageURLFromService, 
  isImageService
 } from './image';

export const parseCanvas = (canvas: Canvas) => {
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

const isPainting = (arg?: AnyMotivation | AnyMotivation[]) => 
  arg ? Array.isArray(arg) ? arg.includes('painting') : arg === 'painting' : true;

export const getImages = (canvas: Canvas): CozyImageResource[] => {
  const images: CozyImageResource[] = [];

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

        images.push(...imageBodies.map(body => createCozyImageResource(body as IIIFExternalWebResource, target)));
      }
    }]
  });

  builder.traverseCanvas(canvas);

  return images;
}

export const getThumbnailURL = (canvas: Canvas, images: CozyImageResource[] = []) => (minSize = 400) => {
  const { width, height } = canvas;
  if (!width || !height) return;

  const { w, h } = getMinSizeDimensions(width, height, minSize);

  if (canvas.thumbnail && canvas.thumbnail.length > 0) {
    const thumbnail = canvas.thumbnail[0];

    if ('service' in thumbnail && Array.isArray(thumbnail.service)) {
      const service = thumbnail.service.find(s => isImageService(s));
      if (service)
        return getImageURLFromService(service, w, h);
    }

    if ('id' in thumbnail) return thumbnail.id;
  }

  for (const image of images) {
    if (image.type === 'dynamic' || image.type === 'level0') {
      return getImageURLFromService(image.service, w, h);
    } else if (image.type === 'static') {
      return image.url;
    }    
  }
}

