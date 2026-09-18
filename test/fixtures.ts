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


export const CROPPED_IMAGES = {
  '@context': 'http://iiif.io/api/presentation/3/context.json',
  type: 'Manifest',
  id: 'https://iiif-workbench.rainersimon.io/manifest/0001',
  label: {
    en: [
      'Reconstructed Manuscript'
    ]
  },
  items: [
    {
      id: 'https://iiif-workbench.rainersimon.io/manifest/0001/canvas/659737bc-fab6-4b8d-bf37-563811a7289e',
      type: 'Canvas',
      label: {
        en: [
          'DRA_0069-70_MG_3130'
        ]
      },
      width: 2395,
      height: 2771,
      items: [
        {
          id: 'https://iiif-workbench.rainersimon.io/manifest/0001/canvas/659737bc-fab6-4b8d-bf37-563811a7289e/page/1',
          type: 'AnnotationPage',
          items: [
            {
              id: 'https://iiif-workbench.rainersimon.io/manifest/0001/canvas/659737bc-fab6-4b8d-bf37-563811a7289e/annotation/b3f83ac2-83a8-416e-ac4b-7dd5778c7237',
              type: 'Annotation',
              motivation: 'painting',
              body: {
                id: 'https://iiif-workbench.rainersimon.io/manifest/0001/specific-resource/206cb2b0-b6e5-4fed-aae9-bf463c327817',
                type: 'SpecificResource',
                source: {
                  id: 'https://melod.uib.no/iiif/dra/DRA_0069/DRA_0069-70_MG_3130/full/max/0/default.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                  width: 2395,
                  height: 2771,
                  service: [
                    {
                      'id': 'https://melod.uib.no/iiif/dra/DRA_0069/DRA_0069-70_MG_3130',
                      'type': 'ImageService3',
                      'profile': 'level2'
                    }
                  ]
                },
                selector: {
                  type: 'ImageApiSelector',
                  region: '888,848,554,1369'
                }
              },
              target: 'https://iiif-workbench.rainersimon.io/manifest/0001/canvas/659737bc-fab6-4b8d-bf37-563811a7289e#xywh=1376,500,638,1577'
            },
            {
              id: 'https://iiif-workbench.rainersimon.io/manifest/0001/canvas/659737bc-fab6-4b8d-bf37-563811a7289e/annotation/bf5511a8-4b27-46e5-afe7-b7ece3d36367',
              type: 'Annotation',
              motivation: 'painting',
              body: {
                id: 'https://iiif-workbench.rainersimon.io/manifest/0001/specific-resource/2c09ccbe-f91a-4e49-b1c2-53450e128cf4',
                type: 'SpecificResource',
                source: {
                  id: 'https://melod.uib.no/iiif/dra/DRA_0069/DRA_0069-70_MG_3131/full/max/0/default.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                  width: 2375,
                  height: 2639,
                  service: [
                    {
                      id: 'https://melod.uib.no/iiif/dra/DRA_0069/DRA_0069-70_MG_3131',
                      type: 'ImageService3',
                      profile: 'level2'
                    }
                  ],
                },
                selector: {
                  type: 'ImageApiSelector',
                  region: '201,793,450,1418'
                }
              },
              target: 'https://iiif-workbench.rainersimon.io/manifest/0001/canvas/659737bc-fab6-4b8d-bf37-563811a7289e#xywh=404,365,561,1767'
            }
          ]
        }
      ]
    }
  ]
}