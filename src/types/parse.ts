import type { CozyImageResource } from './image';
import type { CozyCanvas, CozyCollection, CozyManifest } from './presentation';

export type CozyParseResult = 
  | { type: 'collection', url: string, resource: CozyCollection }
  | { type: 'manifest'; url: string, resource: CozyManifest }
  | { type: 'iiif-image'; url: string, resource: CozyImageResource }
  | { type: 'canvas', resource: CozyCanvas }
  | { type: 'plain-image'; url: string }
  | { type: 'webpage'; url: string }
  | { 
      type: 'error';
      code: 'INVALID_URL' | 'INVALID_HTTP_RESPONSE' | 'FETCH_ERROR' | 'INVALID_MANIFEST' | 'UNSUPPORTED_FORMAT';
      message: string;
    };
