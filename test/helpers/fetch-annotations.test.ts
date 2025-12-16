import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { Cozy, CozyManifest } from '../../src';
import { fetchAnnotations } from '../../src/helpers';

import { 
  HAS_BROKEN_ANNOTATION_LIST
} from './fixtures';

describe('fetch-annotations', () => {

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fail gracefully on HTTP errors', { timeout: 20000 }, async () => {
    const result = await Cozy.parseURL(HAS_BROKEN_ANNOTATION_LIST);

    expect(result.type).toBe('manifest');

    const manifest = (result as any).resource as CozyManifest;

    // At the time of writing this test, the manifest had 8 canvases
    const annotations = await manifest.canvases.reduce((promise, canvas) => promise.then(all => {
      return fetchAnnotations(canvas).then(data => {
        return [...all, ...data];
      });
    }), Promise.resolve<any[]>([]));

    expect(annotations.length).toBe(0);
  });

});