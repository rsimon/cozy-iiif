import { describe, it, expect } from 'vitest';
import { 
  Cozy, 
  CozyCanvas, 
  CozyCollection, 
  CozyManifest, 
  DynamicImageServiceResource 
} from '../src';

import { 
  // Collection manifest
  COLLECTION_V2,

  // Presentaiton manifests
  MANIFEST_SHARED_CANVAS,
  MANIFEST_V2_MULTI_IMAGE_CANVAS,
  MANIFEST_V3_LEVEL_0,
  MANIFEST_V3_CROPPED_IMAGES,
  MANIFEST_V4,

  // Image info.json
  INFO_V3_LEVEL_1,

  // Other
  CANVAS_WITH_SPECIFIC_RESOURCE,
} from './fixtures';

describe('Cozy', () => {

  it('should parse collection manifests correctly', async () => {
    const result = await Cozy.parseURL(COLLECTION_V2);
    expect(result.type).toBe('collection');

    const collection = (result as any).resource as CozyCollection;
    expect(collection.items.length).toBe(16);
  });

  it('should parse (deprecated) shared-canvas manifests', async () => {
    const result = await Cozy.parseURL(MANIFEST_SHARED_CANVAS);
    expect(result.type).toBe('manifest');
  }),

  it('should parse a v2 manifest correctly (incl. multi-image canvas)', () => {
    const result = Cozy.parse(MANIFEST_V2_MULTI_IMAGE_CANVAS);
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

  it('should parse a v3 manifest with Level 0 services correctly', () => {
    const result = Cozy.parse(MANIFEST_V3_LEVEL_0);
    expect(result.type).toBe('manifest');

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.canvases.length).toBe(1);

    const images = manifest.canvases[0].images;
    expect(images.length).toBe(1);

    const image = images[0];
    expect(image.type).toBe('level0');
  })

   it('should parse a v3 manifest correctly (incl. cropped images)', () => {
    const result = Cozy.parse(MANIFEST_V3_CROPPED_IMAGES);
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

  it('should parse a v4 manifest correctly', async () => {
    const result = await Cozy.parseURL(MANIFEST_V4);
    expect(result.type).toBe('manifest');

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.canvases.length).toBe(1);

    const canvas = manifest.canvases[0];
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(1800);
    expect(canvas.images.length).toBe(1);

    const image = canvas.images[0];
    expect(image.type).toBe('static');
    expect(image.getImageURL()).toBe('https://iiif.io/api/presentation/2.1/example/fixtures/resources/page1-full.png');
  });

  it('should parse a v3 info.json correctly', async () => {
    const result = await Cozy.parseURL(INFO_V3_LEVEL_1);
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

  it('should parse a canvas resource with a SpecificResource annotation correctly', () => {
    const result = Cozy.parse(CANVAS_WITH_SPECIFIC_RESOURCE);
    expect(result.type).toBe('canvas');

    const canvas = (result as any).resource as CozyCanvas;
    expect(canvas.images.length).toBe(1);
  });

});

