import type { CozyCanvas } from '../types';
import { 
  getImages, 
  getLabel, 
  getMetadata, 
  getThumbnailURL 
} from '../core';

export const hydrateCanvas = (canvas: CozyCanvas) => {
  const { source } = canvas;
  const images = getImages(source);

  return {
    source,
    id: source.id,
    width: source.width,
    height: source.height,
    images,
    annotations: (source.annotations || []),
    getImageURL: images.length > 0 ? images[0].getImageURL : () => undefined,
    getLabel: getLabel(source),
    getMetadata: getMetadata(source),
    getThumbnailURL: getThumbnailURL(source, images)
  } as CozyCanvas;
}