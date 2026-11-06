import { getPropertyValue } from '../resource';
import { parseImageService } from './service';
import { getImageURL, getRegionURL } from './urls';
import type { 
  CozyImageInfo, 
  DynamicImageInfo, 
  Level0ImageInfo, 
  Size 
} from '../../types';

/**
 * Ensures the service URL properly ends with `info.json`.
 */
export const normalizeServiceUrl = (url: string) =>
  url.endsWith('/info.json') ? url : `${url.endsWith('/') ? url : `${url}/`}info.json`;

export const parseImageInfo = (resource: any): CozyImageInfo => {
  const id = getPropertyValue<string>(resource, 'id');
  const { width, height } = resource;

  const service = parseImageService(resource);

  if (!id || !width || !height || !service) {
    console.error(resource);
    throw new Error('Could not parse image info');
  }

  const serviceUrl = normalizeServiceUrl(id);

  const image = {
    type: service.profileLevel === 0 ? 'level0' : 'dynamic',
    id: id.replace(/\/$/, ''),
    majorVersion: service.majorVersion,
    profileLevel: service.profileLevel,
    width,
    height,
    tiles: (resource.tiles || []).map((t: any) => ({
      width: t.width,
      height: t.height || t.width,
      scaleFactors: t.scaleFactors || [],
    })),
    sizes: resource.sizes || [],
    serviceUrl,
    source: resource,
    getImageURL: getImageURL(width, height, service)
  } as CozyImageInfo;

  if (service.profileLevel === 0) {
    return image as Level0ImageInfo;
  } else {
    return {
      ...image,
      getRegionURL: getRegionURL(service, width, height)
    } as DynamicImageInfo;
  }
}

export const fetchTrueSizeFromServiceUrl = (serviceUrl: string) => (): Promise<Size> =>
  fetch(serviceUrl).then(res => res.json()).then(data => {
    const w: number = data.width;
    const h: number = data.height;
    return (w !== undefined && h !== undefined) ? { w, h } : { w: NaN, h: NaN };
  });
