import type { CozyParseResult } from './types';
import {
  getPropertyValue, 
  parseCanvas, 
  parseCollectionResource,
  parseImageResource,
  parseManifestResource 
} from './core';

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
  if (json.type === 'Canvas')
    return {
      type: 'canvas',
      resource: parseCanvas(json)
    };

  const context: string = Array.isArray(json['@context'])
    ? json['@context'].find(str => 
        str.includes('iiif.io/api/presentation') || 
        str.includes('iiif.io/api/image') ||
        str.includes('shared-canvas'))
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

  if (
    context.includes('presentation/2') || 
    context.includes('presentation/3') ||
    context.includes('presentation/4') ||
    context.includes('shared-canvas')
  ) {
    const majorVersion = 
      context.includes('presentation/4') ? 4 :
      context.includes('presentation/3') ? 3 : 2;

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

export const Cozy = { parse, parseURL };