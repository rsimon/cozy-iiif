import type { Canvas, Collection, Manifest, Range } from '@iiif/presentation-3';
import { convertPresentation2  } from '@iiif/parser/presentation-2';
import { Traverse } from '@iiif/parser';
import { 
  getImages, 
  getLabel, 
  getMetadata, 
  getPropertyValue, 
  getTableOfContents,
  getThumbnailURL, 
  normalizeServiceUrl, 
  parseImageService 
} from './core';
import type { 
  CozyCanvas, 
  CozyCollection, 
  CozyCollectionItem, 
  CozyManifest, 
  CozyParseResult, 
  CozyRange, 
  ImageServiceResource 
} from './types';

const parseURL = async (input: string): Promise<CozyParseResult> => {
  try {
    new URL(input);
  } catch {
    return {
      type: 'error',
      code: 'INVALID_URL',
      message: 'The provided input is not a valid URL'
    };
  }

  let response: Response;

  try {
    response = await fetch(input);
    if (!response.ok) {
      return {
        type: 'error',
        code: 'INVALID_HTTP_RESPONSE',
        message: `Server responded: HTTP ${response.status} ${response.statusText ? `(${response.statusText})` : ''}`
      }
    }
  } catch (error) {
    return {
      type: 'error',
      code: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch resource'
    };
  }

  const contentType = response.headers.get('content-type');
  
  if (contentType?.startsWith('image/')) {
    return {
      type: 'plain-image',
      url: input
    };
  }

  if (contentType?.includes('text/html')) {
    return {
      type: 'webpage',
      url: input
    };
  }

  try {
    const json = await response.json();
    return parse(json, input);
  } catch {
    return {
      type: 'error',
      code: 'UNSUPPORTED_FORMAT',
      message: 'Could not parse resource'
    };
  }
}

const parse = (json: any, url?: string): CozyParseResult => {
  const context = Array.isArray(json['@context'])
    ? json['@context'].find(str => str.includes('iiif.io/api/'))
    : json['@context'];

  if (!context) {
    return {
      type: 'error',
      code: 'INVALID_MANIFEST', 
      message: 'Missing @context'
    }
  };

  const id = getPropertyValue<string>(json, 'id');

  if (!id) {
    return { 
      type: 'error',
      code: 'INVALID_MANIFEST', 
      message: 'Missing id property' 
    }
  }

  if (context.includes('presentation/2') || context.includes('presentation/3')) {
    const majorVersion = context.includes('presentation/2') ? 2 : 3;

    const type = getPropertyValue(json, 'type');

    return type.includes('Collection') ? {
      type: 'collection',
      url: url || id,
      resource: parseCollectionResource(json, majorVersion)
    } : {
      type: 'manifest',
      url: url || id,
      resource: parseManifestResource(json, majorVersion)
    };
  }
  
  if (context.includes('image/2') || context.includes('image/3')) {
    const resource = parseImageResource(json);
    return resource ? {
      type: 'iiif-image',
      url: url || id,
      resource
    } : {
      type: 'error',
      code: 'INVALID_MANIFEST',
      message: 'Invalid image service definition'
    }
  }

  return {
    type: 'error',
    code: 'INVALID_MANIFEST',
    message: 'JSON resource is not a recognized IIIF format'
  };
}

const parseCollectionResource = (resource: any, majorVersion: number): CozyCollection => {

  const parseV3 = (collection: Collection) => {
    const items: any[] = [];

    const modelBuilder = new Traverse({
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
    source: v3,
    id: v3.id,
    majorVersion,
    items,
    getLabel: getLabel(v3),
    getMetadata: getMetadata(v3)
  };
}

const parseManifestResource = (resource: any, majorVersion: number): CozyManifest => {

  const parseV3 = (manifest: Manifest) => {
    const sourceCanvases: Canvas[] = [];
    const sourceRanges: Range[] = [];

    const modelBuilder = new Traverse({
      canvas: [canvas => { if (canvas.items) sourceCanvases.push(canvas) }],
      range: [range => { if (range.type === 'Range') sourceRanges.push(range) }]
    });
  
    modelBuilder.traverseManifest(manifest);
    
    const canvases = sourceCanvases.map((c: Canvas) => {
      const images = getImages(c);
      return {
        source: c,
        id: c.id,
        width: c.width,
        height: c.height,
        images,
        annotations: (c.annotations || []),
        getLabel: getLabel(c),
        getMetadata: getMetadata(c),
        getThumbnailURL: getThumbnailURL(c, images)
      } as CozyCanvas;
    });

    const toRange = (source: Range): CozyRange => {
      const items = source.items || [];

      const nestedCanvases: CozyCanvas[] = items
        .filter((item: any) => item.type === 'Canvas')
        .map((item: any) => canvases.find(c => c.id === item.id)!)
        .filter(Boolean);

      const nestedRanges = items
        .filter((item: any) => item.type === 'Range')
        .map((item: any) => toRange(item));

      const nestedItems = [...nestedCanvases, ...nestedRanges];
        
      return {
        source,
        id: source.id,
        // Maintain original order
        items: items.map((i: any) => nestedItems.find(cozy => cozy.id === i.id)),
        canvases: nestedCanvases,
        ranges: nestedRanges,
        getLabel: getLabel(source)
      } as CozyRange;
    }

    const ranges = sourceRanges.map((source: Range) => toRange(source));
    return { canvases, ranges };
  }

  const v3: Manifest = majorVersion === 2 ? convertPresentation2(resource) : resource;

  const { canvases, ranges } = parseV3(v3);

  return {
    source: v3,
    id: v3.id,
    majorVersion,
    canvases,
    structure: ranges,
    getLabel: getLabel(v3),
    getMetadata: getMetadata(v3),
    getTableOfContents: getTableOfContents(ranges)
  }
}

const parseImageResource = (resource: any) => {
  const { width, height } = resource;

  const service = parseImageService(resource);
  if (service) {
    return {
      type: service.profileLevel === 0 ? 'level0' : 'dynamic',
      service: resource,
      width,
      height,
      majorVersion: service.majorVersion,
      serviceUrl: normalizeServiceUrl(getPropertyValue<string>(resource, 'id'))
    } as ImageServiceResource;
  }
}

export const Cozy = { parse, parseURL };