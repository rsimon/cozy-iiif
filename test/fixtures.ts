export const COLLECTION =
  'https://www.davidrumsey.com/luna/servlet/iiif/collection/s/1k986a';

export const WITH_STRUCTURES =
  'https://lib.is/IE19255085/manifest';

export const INFO_JSON_V3 =
  'https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/info.json';

export const SHARED_CANVAS =
  'https://ids.si.edu/ids/manifest/FS-8106_06';

export const WITH_MULTI_IMAGE = {
  '@context': 'http://iiif.io/api/presentation/2/context.json',
  '@type': 'sc:Manifest',
  '@id': 'https://www.example.com/manifest/0001',
  label: 'Multi-Image Canvas Example',
  sequences: [
    {
      '@id': 'http://localhost:4321/manifest/0001/sequence/default',
      '@type': 'sc:Sequence',
      canvases: [
        {
          '@id': 'http://www.example.com/manifest/0001/canvas/1',
          '@type': 'sc:Canvas',
          label: 'A Multi-Image Canvas',
          width: 5040,
          height: 7520,
          images: [
            {
              '@type': 'oa:Annotation',
              motivation: 'sc:painting',
              resource: {
                '@id': 'https://iiif.bodleian.ox.ac.uk/iiif/image/79bf8325-22fa-4696-afe5-7d827d84f393',
                '@type': 'dctypes:Image',
                format: 'image/jpeg',
                width: 5040,
                height: 7520,
                service: {
                  '@context': 'http://iiif.io/api/image/2/context.json',
                  '@id': 'https://iiif.bodleian.ox.ac.uk/iiif/image/79bf8325-22fa-4696-afe5-7d827d84f393',
                  profile: 'http://iiif.io/api/image/2/level2.json'
                }
              },
              on: 'http://www.example.com/manifest/0001/canvas/1'
            },
            {
              '@type': 'oa:Annotation',
              motivation: 'sc:painting',
              resource: {
                '@id': 'https://iiif.bodleian.ox.ac.uk/iiif/image/7b1ffeeb-bf85-48ce-aea8-cf3e67d00f28',
                '@type': 'dctypes:Image',
                format: 'image/jpeg',
                width: 5050,
                height: 7520,
                service: {
                  '@context': 'http://iiif.io/api/image/2/context.json',
                  '@id': 'https://iiif.bodleian.ox.ac.uk/iiif/image/7b1ffeeb-bf85-48ce-aea8-cf3e67d00f28',
                  profile: 'http://iiif.io/api/image/2/level2.json'
                }
              },
              on: 'http://www.example.com/manifest/0001/canvas/1#xywh=1307,2609,1967,2929'
            }
          ]
        }
      ]
    }
  ]
}