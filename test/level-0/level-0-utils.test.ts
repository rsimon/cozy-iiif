import { describe, expect, it } from 'vitest';
import { Level0ImageInfo } from '../../src/types';
import {
  calculateRenderedSize,
  fitRegion,
  getLevel0TilesForRegion
} from '../../src/level-0/utils';

const imageInfo = {
  id: 'https://example.org/iiif/image',
  majorVersion: 3,
  profileLevel: 0,
  type: 'level0',
  width: 500,
  height: 300,
  tiles: [{ width: 256, height: 256, scaleFactors: [1, 2] }],
  sizes: [],
  serviceUrl: 'https://example.org/iiif/image/info.json',
  source: { type: 'Image' },
  getImageURL: () => ''
} as Level0ImageInfo;

describe('Level-0 utilities', () => {
  it('center-crops a region to the requested cover aspect ratio', () => {
    expect(fitRegion(
      { x: 100, y: 50, w: 400, h: 200 },
      { w: 500, h: 300 },
      { size: { w: 100, h: 100 }, fit: 'cover' }
    )).toEqual({ x: 200, y: 50, w: 200, h: 200 });
  });

  it('preserves aspect ratio and does not upscale rendered output', () => {
    expect(calculateRenderedSize(
      { x: 0, y: 0, w: 1000, h: 500 },
      { size: 400 }
    )).toEqual({ w: 400, h: 200 });

    expect(calculateRenderedSize(
      { x: 0, y: 0, w: 100, h: 50 },
      { size: 400 }
    )).toEqual({ w: 100, h: 50 });
  });

  it('returns intersecting tiles and clips tiles at the image edge', () => {
    const tiles = getLevel0TilesForRegion(
      imageInfo,
      { x: 0, y: 0, w: 500, h: 300 },
      1
    );

    expect(tiles).toHaveLength(4);
    
    expect(tiles[3]).toEqual({
      x: 256,
      y: 256,
      width: 244,
      height: 44,
      // Note: last tile in the sequence (not square!)
      url: 'https://example.org/iiif/image/256,256,244,44/244,44/0/default.jpg'
    });
  });

  it('uses the width-only size syntax for Image API v2 tiles', () => {
    const imageInfoV2 = { ...imageInfo, majorVersion: 2 } as Level0ImageInfo;
    const tiles = getLevel0TilesForRegion(
      imageInfoV2,
      { x: 0, y: 0, w: 500, h: 300 },
      1
    );

    expect(tiles[3].url).toBe(
      'https://example.org/iiif/image/256,256,244,44/244,/0/default.jpg'
    );
  });
});
