// https://iiif.io/api/cookbook/recipe/0021-tagging/
export const ANNOTATION = {
  id: 'https://iiif.io/api/cookbook/recipe/0021-tagging/annotation/p0002-tag',
  type: 'Annotation',
  motivation: 'tagging',
  body: {
    type: 'TextualBody',
    value: 'Gänseliesel-Brunnen',
    language: 'de',
    format: 'text/plain'
  },
  target: 'https://iiif.io/api/cookbook/recipe/0021-tagging/canvas/p1#xywh=265,661,1260,1239'
}

// https://iiif.io/api/cookbook/recipe/0001-mvm-image/
export const SINGLE_CANVAS_NO_ANNOTATIONS = {
  '@context': 'http://iiif.io/api/presentation/3/context.json',
  id: 'https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json',
  type: 'Manifest',
  label: {
    en: [
      'Single Image Example'
    ]
  },
  items: [
    {
      id: 'https://iiif.io/api/cookbook/recipe/0001-mvm-image/canvas/p1',
      type: 'Canvas',
      height: 1800,
      width: 1200,
      items: [
        {
          id: 'https://iiif.io/api/cookbook/recipe/0001-mvm-image/page/p1/1',
          type: 'AnnotationPage',
          items: [
            {
              id: 'https://iiif.io/api/cookbook/recipe/0001-mvm-image/annotation/p0001-image',
              type: 'Annotation',
              motivation: 'painting',
              body: {
                id: 'http://iiif.io/api/presentation/2.1/example/fixtures/resources/page1-full.png',
                type: 'Image',
                format: 'image/png',
                height: 1800,
                width: 1200
              },
              target: 'https://iiif.io/api/cookbook/recipe/0001-mvm-image/canvas/p1'
            }
          ]
        }
      ]
    }
  ]
}