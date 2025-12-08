import { describe, it, expect } from 'vitest';
import { Cozy, CozyImageResource, CozyManifest, DynamicImageServiceResource } from '../src';

import { COLLECTION, WITH_STRUCTURES, INFO_JSON_V3 } from './fixtures';

describe('Cozy', () => {

  it('should parse collection manifests correctly', async () => {
    const result = await Cozy.parseURL(COLLECTION);
    expect(result.type).toBe('collection');
  });

  it('should parse structures in presentation manifests', async () => {
    const result = await Cozy.parseURL(WITH_STRUCTURES);
    expect(result.type).toBe('manifest');
    expect('resource' in result).toBeTruthy();

    /*
    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.structure.length > 0).toBeTruthy();

    const tableOfContents = manifest.getTableOfContents();
    expect(tableOfContents.root.length).toBe(1);
    expect(tableOfContents.root[0].children.length).toBe(14);
    */
  });

  it('should parse the v3 info.json correctly', async () => {
    const result = await Cozy.parseURL(INFO_JSON_V3);
    expect(result.type).toBe('iiif-image');

    const resource = (result as any).resource as DynamicImageServiceResource;

    expect(resource.width).toBe(4032);
    expect(resource.height).toBe(3024);
    expect(resource.type).toBe('dynamic');
    expect(resource.serviceUrl).toBe('https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/info.json')

    const regionURL = resource.getRegionURL({ x: 10, y: 10, w: 100, h: 100 });
    expect(regionURL).toBe(
      'https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/10,10,100,100/!400,400/0/default.jpg')

    const imageURL = resource.getImageURL(800);
    expect(imageURL).toBe(
      'https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/full/!600,800/0/default.jpg')
  });

});

