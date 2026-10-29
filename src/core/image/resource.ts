import type { IIIFExternalWebResource, Service, SpecificResource } from '@iiif/presentation-3';
import { getPropertyValue } from '../resource';
import { parseRegion } from '../selector';
import { getPixelSizeFromServiceUrl, normalizeServiceUrl } from './info';
import { isImageService, parseImageService } from './service';
import { getImageURLFromService, getRegionURLFromService } from './urls';
import type { 
  Bounds, 
  CozyImageResource, 
  DynamicImageServiceResource, 
  GetRegionURLOpts, 
  ImageServiceResource, 
  Level0ImageServiceResource, 
  Rotation, 
  StaticImageResource 
} from '../../types';

export const parseImageResource = (resource: any) => {
  const { width, height, format } = resource;

  const id = getPropertyValue(resource, 'id');

  const service = parseImageService(resource);

  if (service) {
    const serviceUrl = normalizeServiceUrl(getPropertyValue<string>(resource, 'id'));

    const image = {
      source: resource,
      type: service.profileLevel === 0 ? 'level0' : 'dynamic',
      service: resource,
      width,
      height,
      majorVersion: service.majorVersion,
      serviceUrl,
      getImageURL: getImageURL(width, height, resource),
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

export const createCozyImageResource = (resource: IIIFExternalWebResource | SpecificResource, target?: Bounds) => {
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
      selector,
      getImageURL: () => id,
      getPixelSize: getStaticImagePixelSize(id)
    } as StaticImageResource;
  }
} 

export const getRegionURL = (
  image: CozyImageResource
) => (
  bounds: Bounds,
  rotation: Rotation = 0,
  opts: GetRegionURLOpts = { minSize: 400 }
): string | undefined => {
  if (image.type === 'dynamic') {
    return getRegionURLFromService(image.service, bounds, rotation, opts);
  } else {
    console.error('Level 0 or static image canvas: unsupported');
  }
}

export const getImageURL = (
  width: number | undefined, 
  height: number | undefined, 
  service: Service  
) => (minSize = 800, rotation: Rotation = 0) => {
  if (!width || !height) return;

  const aspect = width / height;
  const isPortrait = aspect < 1;
  
  const h = Math.ceil(isPortrait ? minSize / aspect : minSize);
  const w = Math.ceil(isPortrait ? minSize : minSize / aspect);

  return getImageURLFromService(service!, w, h, rotation);
}

export const getStaticImagePixelSize = (url: string) => () => {
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



