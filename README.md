# cozy-iiif

A developer-friendly API for working with IIIF resources. Built on top of the IIIF Commons [@iiif/presentation-3](https://github.com/IIIF-Commons/presentation-3-types) and [@iiif/parser](https://github.com/IIIF-Commons/parser) libraries.

## Features

- Resource identification for any URL: IIIF collection and presentation manifests, image services, static image, and more.
- Developer-friendly TypeScript API for parsing and working with IIIF resources.
- Seamless upgrade from IIIF Presentation API v2 to v3 (using `@iiif/parser` under the hood).
- Preserves access to underlying `@iiif/presentation-3` types.
- Helpers for stitching thumbnails and cropping regions from IIIF Level 0 tilesets.
- Helpers for adding annotations to Canvases and Presentation manifests.

## Installation

```bash
npm install cozy-iiif
```

## Basic Usage

Identify and parse a URL:

```ts
import { Cozy } from 'cozy-iiif';

const parsed = await Cozy.parseURL('https://www.example.com/manifest.json');

if (parsed.type === 'manifest') {
  const manifest = parsed.resource; // CozyManifest
  console.log(`Presentation API ${manifest.majorVersion}`);
} else if (parsed.type === 'collection') {
  const collection = parsed.resource; // CozyCollection
  console.log(`Collection, Presentation API ${collection.majorVersion}`);
} else if (parsed.type === 'iiif-image') {
  const image = parsed.resource; // CozyImageResource
  console.log(`Image API ${image.majorVersion}`);
} else if (parsed.type === 'plain-image') {
  console.log('Plaing (JPEG or PNG) image');
} else if (parsed.type === 'webpage') {
  console.log('URL points to a web page!');
} else if (parsed.type === 'error') {
  console.log('Error:', parsed.code, parsed.message);
}
```

Alternatively, you can parse an existing JSON object.

```ts
const json = await fetch('https://www.example.com/manifest.json').then(res => res.json());
Cozy.parse(json);
```

Cozy provides normalized utility types for key IIIF entities: **CozyManifest**, 
**CozyCanvas**, **CozyRange**, **CozyImageResource**, **CozyCollection**, etc. Each
utility type provides helpers to simplify common access operations (e.g. metadata, 
labels in different locales, etc.) and retains the original source data
as a `source` field.

```ts
// Parsed CozyManifest
const manifest = parsed.resource;

// Default
console.log(manifest.getLabel()); 

// For locale (with fallback)
console.log(manifest.getLabel('de'));

// Metadata as normalized CozyMetada[]
console.log(manifest.getMetadata());

// The raw source data, @iiif/presentation-3 typed
console.log(manifest.source);
```

### Thumbnail Helper

CozyCanvas has a simple helper for getting a Thumbnail URL. The URL
will use the `thumbnail` property of the original resource if available, or the image service
otherwise.

```ts
const firstCanvas = manifest.canvases[0];

// With default size (400px smallest dimension)
console.log(firstCanvas.getThumbnailURL());

// With custom minimum smallest dimension
console.log(firstCanvas.getThumbnailURL(600));
```

### Table of Contents Helper

cozy-iiif includes a utility to easily get a table of contents for a Presentation manifest,
based on the manifest's `structures` property.

```ts
// Returns a list of CozyTOCNode objects.
const toc = manifest.getTableOfContents(); 

const logTOCNode = (node: CozyTOCNode) => {
  console.log(node.getLabel());
  node.children.forEach(logTOCNode);
}
    
root.forEach(logTOCNode.root);
```

### Image Types and Levels

The **CozyImageResource** provides a helper properties that identify the type and level of 
an image.

```ts
const firstCanvas = manifest.canvases[0];
const image = firstCanvas.images[0];

console.log(image.type); // 'static', 'dynamic' or 'level0';
```

Dynamic images are served from an image server and have helpers to retrieve specific region URLs.

```ts
const bounds = {
  x: 100,
  y: 100,
  w: 320,
  h: 240
};

// With default minimum shortest dimension (400px);
console.log(image.getRegionURL(bounds));

// With custom minimum shorted dimension
console.log(image.getRegionURL(bounds, 800));

// Full image with custom minimum shorted dimension
console.log(image.getImageURL(800));

// Resolves the actual image pixel size from the info.json
// or the image file (which may **differ**) from the canvas size!
console.log(image.getPixelSize());
```

## Cozy Helpers

### Stitching and Cropping for Level 0 Tilesets

Working with a Level 0 tileset, but need a thumbnail, or crop a region? The `cozy-iiif/level-0` module 
has you covered! Cozy uses Web workers for background image processing and request throttling when 
harvesting tilesets for stitching. Stitched images are harvested at the smallest possible size, 
to keep things fast and prevent unnecessary downloads.


**Thumbnails**

```ts
import { getThumbnail } from 'cozy-iiif/level-0';

const firstImage = canvas.images[0];
if (firstImage.type !== 'level0') {
  // Normal thumbnail URL (string)
  console.log(canvas.getThumbnailURL());
} else {
  getThumbnail(firstImage).then(blob => {
    // Creates a data URL you can use as `src` for an image
    console.log(URL.createObjectURL(blob));
  });
}
```

**Regions**

```ts
import { cropRegion } from 'cozy-iiif/level-0';

const firstImage = canvas.images[0];

const bounds = {
  x: 100,
  y: 100,
  w: 320,
  h: 240
};

if (firstImage.type === 'level0') {
  cropRegion(firstImage, bounds).then(blob => {
    console.log(URL.createObjectURL(blob));
  });
}
```

### Annotation Helpers

Utilities for working with annotations on on Canvases.

```ts
import type { Annotation } from '@iiif/presentation-3';
import { importAnnotations } from 'cozy-iiif/helpers';

const annotations: Annotation[] = [{
  id: 'https://iiif.io/api/cookbook/recipe/0021-tagging/annotation/p0002-tag',
  type: 'Annotation',
  motivation: 'tagging',
  body: {
    type: 'TextualBody',
    value: 'Gänseliesel-Brunnen',
    language: 'de',
    format: "text/plain"
  },
  target: 'https://iiif.io/api/cookbook/recipe/0021-tagging/canvas/p1#xywh=265,661,1260,1239'
}]

// Generates a new CozyManifest with annotations from an original CozyManifest.
const updated = importAnnotations(original, annotations);

// The source field has the raw manifest JSON (annotations included!)
console.log(updated.source);
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.
