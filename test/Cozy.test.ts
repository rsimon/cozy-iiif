import { describe, it, expect } from 'vitest';
import { Cozy, CozyCollection, CozyManifest, DynamicImageServiceResource } from '../src';

import { 
  COLLECTION,
  INFO_JSON_V3,
  WITH_MULTI_IMAGE,
  // WITH_STRUCTURES,
  SHARED_CANVAS,
  CROPPED_IMAGES
} from './fixtures';

describe('Cozy', () => {

  it('should parse collection manifests correctly', async () => {
    const result = await Cozy.parseURL(COLLECTION);
    expect(result.type).toBe('collection');

    const collection = (result as any).resource as CozyCollection;
    expect(collection.items.length).toBe(16);
  });
  
  /*
  it('should parse structures in presentation manifests', async () => {
    const result = await Cozy.parseURL(WITH_STRUCTURES);
    expect(result.type).toBe('manifest');
    expect('resource' in result).toBeTruthy();

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.structure.length > 0).toBeTruthy();
    
    const tableOfContents = manifest.getTableOfContents();
    expect(tableOfContents.root.length).toBe(1);
    expect(tableOfContents.root[0].children.length).toBe(14);
  });
  */

  it('should allow (deprecated) shared-canvas manifests', async () => {
    const result = await Cozy.parseURL(SHARED_CANVAS);
    expect(result.type).toBe('manifest');
  }),

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

  it('should parse a multi-image canvas correctly', () => {
    const result = Cozy.parse(WITH_MULTI_IMAGE);
    expect(result.type).toBe('manifest');

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.canvases.length).toBe(1);

    const canvas = manifest.canvases[0];
    expect (canvas.images.length).toBe(2);

    const [fullSizeImage, positionedImage] = canvas.images;
    expect(fullSizeImage.target).toBeUndefined();

    expect(positionedImage.target).toBeDefined();
    expect(positionedImage.target?.x).toBe(1307);
    expect(positionedImage.target?.y).toBe(2609);
    expect(positionedImage.target?.w).toBe(1967);
    expect(positionedImage.target?.h).toBe(2929);
  });

  it('should parse cropped images correctly', () => {
    const result = Cozy.parse(CROPPED_IMAGES);
    expect(result.type).toBe('manifest');

    const manifest = (result as any).resource as CozyManifest;
    
    expect(manifest.canvases.length).toBe(1);

    const canvas = manifest.canvases[0];
    expect(canvas.width).toBe(2395);
    expect(canvas.height).toBe(2771);
    expect(canvas.images.length).toBe(2);

    const [img1, img2] = canvas.images;

    // img1
    expect(img1.width).toBe(2395);
    expect(img1.height).toBe(2771);
    expect(img1.type).toBe('dynamic');
    expect((img1 as DynamicImageServiceResource).serviceUrl).toBe('https://melod.uib.no/iiif/dra/DRA_0069/DRA_0069-70_MG_3130/info.json');

    expect(img1.target?.x).toBe(1376);
    expect(img1.target?.y).toBe(500);
    expect(img1.target?.w).toBe(638);
    expect(img1.target?.h).toBe(1577);

    expect(img1.selector?.x).toBe(888);
    expect(img1.selector?.y).toBe(848);
    expect(img1.selector?.w).toBe(554);
    expect(img1.selector?.h).toBe(1369);

    // img 2
    expect(img2.width).toBe(2375);
    expect(img2.height).toBe(2639);
    expect(img2.type).toBe('dynamic');
    expect((img2 as DynamicImageServiceResource).serviceUrl).toBe('https://melod.uib.no/iiif/dra/DRA_0069/DRA_0069-70_MG_3131/info.json');

    expect(img2.target?.x).toBe(404);
    expect(img2.target?.y).toBe(365);
    expect(img2.target?.w).toBe(561);
    expect(img2.target?.h).toBe(1767);

    expect(img2.selector?.x).toBe(201);
    expect(img2.selector?.y).toBe(793);
    expect(img2.selector?.w).toBe(450);
    expect(img2.selector?.h).toBe(1418);
  });

});

