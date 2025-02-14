import { getPropertyValue } from '../core';
import type { Level0ImageServiceResource } from '../types';
import type { ImageInfo } from './types';

const toImageInfo = (resource: any) => {
  const id = getPropertyValue(resource, 'id');
  return { id, ...resource };
}

export const fetchImageInfo = (resource: Level0ImageServiceResource): Promise<ImageInfo> =>
  fetch(resource.serviceUrl).then(res => res.json()).then(toImageInfo);