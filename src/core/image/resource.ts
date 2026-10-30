import type { IIIFExternalWebResource, SpecificResource } from '@iiif/presentation-3';
import type { Size } from '../../types';
import { getPropertyValue } from '../resource';
import { parseRegion } from '../selector';
import { normalizeServiceUrl } from './info';
import { isImageService, parseImageService } from './service';
import { getImageURL, getRegionURL } from './urls';
import type { 
  Bounds, 
  CozyImageResource, 
  DynamicImageServiceResource, 
  ImageServiceResource, 
  Level0ImageServiceResource,
  StaticImageResource 
} from '../../types';

/**
 * Parses a raw JSON IIIF image resource in a manifest into a CozyImageResource.
 * Depending on the type of resource, this method will return:
 * - `StaticImageResource` for plain images
 * - `ImageServiceResource` for image services - either `Level0ServiceImageServiceResource`
 *   for pre-rendered tiles, or `DynamicImageServiceResource` otherwise. 
 */
export const parseImageResource = (
  resource: IIIFExternalWebResource | SpecificResource,
  target?: Bounds
): CozyImageResource => {
  const image = resource.type === 'SpecificResource' ? resource.source : resource;
  
  const selector = resource.type === 'SpecificResource' ? parseRegion(resource.selector) : undefined;

  const { format, height, width } = image;

  const id = getPropertyValue(resource, 'id');

  const imageService = (image.service || []).find(isImageService);

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
      selector,
      getImageURL: getImageURL(width, height, imageService)
    } as ImageServiceResource;

    if (service.profileLevel === 0) {
      return image as Level0ImageServiceResource;
    } else {
      return {
        ...image,
        getRegionURL: getRegionURL(image.service)
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
      selector,
      getImageURL: () => id,
      getPixelSize: getStaticImagePixelSize(id)
    } as StaticImageResource;
  }
}

const getStaticImagePixelSize = (url: string) => (): Promise<Size> => {
  const isBrowser = typeof window !== 'undefined';

  return fetch(url).then(res => res.blob()).then(blob => {
    if (isBrowser) {
      return createImageBitmap(blob).then(bitmap => {
        const { width, height } = bitmap;
        bitmap.close(); 
        return { width, height }
      });
    } else {
      throw new Error('Not implemented');
    }
  });
}



