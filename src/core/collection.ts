import type { Collection } from '@iiif/presentation-3';
import { Traverse } from '@iiif/parser';
import { convertPresentation2 } from '@iiif/parser/presentation-2';
import type { CozyCollection, CozyCollectionItem } from '../types';
import { getLabel, getMetadata, getPropertyValue } from './resource';

export const parseCollectionResource = (resource: any, majorVersion: number): CozyCollection => {

  const parseV3 = (collection: Collection) => {
    const items: any[] = [];

    const modelBuilder = new Traverse({
      // The model builder fires on the collection ITSELF - we don't want that, but want
      // to collect sub-collections
      collection: [item => item.id !== getPropertyValue(resource, 'id') && items.push(item)],
      manifest: [item => items.push(item)]
    });

    modelBuilder.traverseCollection(collection);

    return items.map(source => ({
      id: source.id,
      type: source.type,
      getLabel: getLabel(source),
      source
    }) as CozyCollectionItem);
  }

  const v3: Collection = majorVersion === 2 ? convertPresentation2(resource) : resource;

  const items = parseV3(v3);

  return {
    type: 'Collection',
    source: v3,
    id: v3.id,
    majorVersion,
    items,
    getLabel: getLabel(v3),
    getMetadata: getMetadata(v3)
  };
}