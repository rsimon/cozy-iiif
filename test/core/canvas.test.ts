import { describe, it, expect } from 'vitest';
import { Cozy, CozyManifest } from '../../src';

import { STATIC_IMAGE } from './fixtures';

describe('canvas', () => {

  it('should determine correct pixel size for static image', async () => {
    const result = await Cozy.parseURL(STATIC_IMAGE);
    expect(result.type).toBe('manifest');
    expect('resource' in result).toBeTruthy();

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.canvases.length).toBe(1);

    const image = manifest.canvases[0].images[0];
    expect(image.type).toBe('static');

    const { width, height } = await image.getPixelSize();
    expect(width).toBe(1200);
    expect(height).toBe(1800);
  });

});