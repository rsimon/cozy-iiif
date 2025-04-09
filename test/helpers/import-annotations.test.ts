import { describe, it, expect } from 'vitest';
import { Annotation } from '@iiif/presentation-3';
import { Cozy, CozyManifest } from '../../src';
import { importAnnotations } from '../../src/helpers';

import { 
  ANNOTATIONS, 
  SINGLE_CANVAS_NO_ANNOTATIONS,
  TWO_CANVASES_NO_ANNOTATIONS
} from './fixtures';

describe('import-annotations', () => {

  it('should insert a new page into a canvas with no annotatinos', () => {
    const result = Cozy.parse(SINGLE_CANVAS_NO_ANNOTATIONS);

    expect(result.type).toBe('manifest');
    const manifest = (result as any).resource as CozyManifest;

    expect(manifest.canvases.length).toBe(1);
    const firstCanvas = manifest.canvases[0];

    const annotations = ANNOTATIONS as Annotation[];

    const modified = importAnnotations(firstCanvas, annotations)
    expect(modified.annotations.length).toBe(1);
  });

  it('should correctly insert annotation pages into the test manifest', () => {
    const result = Cozy.parse(TWO_CANVASES_NO_ANNOTATIONS);

    expect(result.type).toBe('manifest');
    const manifest = (result as any).resource as CozyManifest;

    expect(manifest.canvases.length).toBe(2);
    expect(manifest.canvases[0].annotations.length).toBe(0);
    expect(manifest.canvases[1].annotations.length).toBe(0);

    const annotations = ANNOTATIONS as Annotation[];

    const modified = importAnnotations(manifest, annotations, 'cozy');
    expect(modified.canvases[0].annotations.length).toBe(1);
    expect(modified.canvases[1].annotations.length).toBe(1);
  });

});

