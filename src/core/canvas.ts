import type { Canvas, IIIFExternalWebResource } from '@iiif/presentation-3';
import { Traverse } from '@iiif/parser';
import { getPropertyValue } from './resource';
import { 
  getImageURL, 
  getImageURLFromService, 
  getPixelSizeFromServiceUrl, 
  getRegionURL, 
  getStaticImagePixelSize, 
  isImageService, 
  normalizeServiceUrl, 
  parseImageService 
} from './image-service';
import type { 
  Bounds,
  CozyImageResource, 
  DynamicImageServiceResource, 
  ImageServiceResource, 
  Level0ImageServiceResource, 
  StaticImageResource 
} from '../types';

export const getThumbnailURL = (canvas: Canvas, images: CozyImageResource[] = []) => (minSize = 400) => {
  const { width, height } = canvas;

  if (!width || !height) return;

  const aspect = width / height;
  const isPortrait = aspect < 1;
  
  const h = Math.ceil(isPortrait ? minSize / aspect : minSize);
  const w = Math.ceil(isPortrait ? minSize : minSize / aspect);

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

const toCozyImageResource = (resource: IIIFExternalWebResource, target?: Bounds) => {
  const { format, height, width } = resource;

  const id = getPropertyValue(resource, 'id');

  const imageService = (resource.service || []).find(isImageService);

  const service = imageService ? parseImageService(imageService) : undefined; 

  if (imageService && service) {
    const serviceUrl = normalizeServiceUrl(getPropertyValue<string>(imageService, 'id'));

    const image = {
      source: resource,
      type: service.profileLevel === 0 ? 'level0' : 'dynamic',
      service: imageService,
      width,
      height,
      majorVersion: service.majorVersion,
      serviceUrl,
      target,
      getImageURL: getImageURL(width, height, imageService),
      getPixelSize: getPixelSizeFromServiceUrl(serviceUrl)
    } as ImageServiceResource;

    if (service.profileLevel === 0) {
      return image as Level0ImageServiceResource;
    } else {
      return {
        ...image,
        getRegionURL: getRegionURL(image)
      } as DynamicImageServiceResource;
    }
  } else {
    return {
      source: resource,
      type: 'static',
      width,
      height,
      url: id,
      format,
      getImageURL: () => id,
      getPixelSize: getStaticImagePixelSize(id)
    } as StaticImageResource;
  }
} 

const toCanvasTarget = (target: any): Bounds | undefined => {
  const parseBounds = (xywh: string): Bounds | undefined => {
    const coords = xywh.replace('xywh=', '').split(',').map(Number);
    if (coords.length === 4 && coords.every(n => !isNaN(n))) {
      const [x, y, w, h] = coords;
      return { x, y, w, h };
    }
  }

  // SpecificResource object with FragmentSelector
  if (target && typeof target === 'object') {
    const selector = Array.isArray(target.selector) 
      ? target.selector.find((s: any) => s.type === 'FragmentSelector')
      : target.selector?.type === 'FragmentSelector' ? target.selector : null;

    if (selector?.value)
      return parseBounds(selector.value);
  }

  // Plain string, with or without #xywh fragment
  if (typeof target === 'string') {
    const hash = target.split('#')[1];
    if (hash?.startsWith('xywh='))
      return parseBounds(hash);
  }
}

export const getImages = (canvas: Canvas): CozyImageResource[] => {
  const images: CozyImageResource[] = [];

  const builder = new Traverse({
    annotation: [anno => {
      if (anno.motivation === 'painting' || !anno.motivation) {
        const bodies = anno.body ? 
          Array.isArray(anno.body) ? anno.body : [anno.body] 
          : [];

        const target = toCanvasTarget(anno.target);

        const imageBodies = bodies.filter(b => (b as IIIFExternalWebResource).type === 'Image');
        images.push(...imageBodies.map(body => toCozyImageResource(body as IIIFExternalWebResource, target)));
      }
    }]
  });

  builder.traverseCanvas(canvas);

  return images;
}