import { describe, it, expect } from 'vitest';
import { Cozy, CozyManifest } from '../../src';

import { STATIC_IMAGE, WITH_DIFFERENT_CANVAS_DIMENSIONS } from './fixtures';

describe('canvas', () => {

  it('should determine correct pixel size for image service', async () => {
    const result = await Cozy.parseURL(WITH_DIFFERENT_CANVAS_DIMENSIONS);
    expect(result.type).toBe('manifest');
    expect('resource' in result).toBeTruthy();

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.canvases.length).toBe(66);

    const page2 = manifest.canvases[1];
    expect(page2.getLabel()).toBe('Page 2');
    expect(page2.images.length).toBe(1);

    const image = page2.images[0];
    const { width, height } = await image.getPixelSize();
    expect(width).toBe(3796);
    expect(height).toBe(5910);
  });

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