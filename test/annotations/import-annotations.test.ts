import { describe, it, expect } from 'vitest';
import { Annotation } from '@iiif/presentation-3';
import { Cozy, CozyManifest } from '../../src';

import { ANNOTATION, SINGLE_CANVAS_NO_ANNOTATIONS,  } from './fixtures';

describe('import-annotations', () => {

  it('should insert a new page into a manifest with no annotatinos', async () => {
    const result = Cozy.parse(SINGLE_CANVAS_NO_ANNOTATIONS);

    expect(result.type).toBe('manifest');
    const manifest = (result as any).resource as CozyManifest;

    expect(manifest.canvases.length).toBe(1);
    const firstCanvas = manifest.canvases[0];

    const annotations = [ANNOTATION as Annotation];

    const modified = Cozy.Helpers.importAnnotations(firstCanvas, annotations)
    expect(modified.annotations.length).toBe(1);
  });

});

