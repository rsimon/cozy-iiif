import type { ImageService2, ImageService3, Service } from '@iiif/presentation-3';
import { getPropertyValue } from '../resource';

type ImageService = ImageService2 | ImageService3;

/**
 * Tests if the given raw JSON represents a IIIF Image Service
 */
export const isImageService = (data: any): data is ImageService => {
  const t = getPropertyValue<string>(data, 'type');

  return t?.startsWith('ImageService') || (
    data.profile?.toString().includes('iiif.io/api/image/')
  );
}

const getProfileLevel = (profile: any) => {
  const labels = ['level0', 'level1', 'level2'];
  const profiles = Array.isArray(profile) ? profile : profile ? [profile] : [];
  
  const levels = profiles
    .map(p => {
      // Coerce safely to string just in case a v3 profile comes in as an object
      const str = typeof p === 'object' && p !== null && 'id' in p 
        ? String((p as any).id) 
        : String(p ?? '');
        
      return labels.findIndex(level => str.toLowerCase().includes(level));
    })
    .filter(l => l > -1)
    .sort((a, b) => b - a); 

  return levels.length > 0 ? levels[0] : undefined;
}

/**
 * Parses the raw JSON IIIF Image Service, returning major API version and
 * profile level.
 */
export const parseImageService = (service: Service) => {
  const t = getPropertyValue<string>(service, 'type');
  const context = getPropertyValue<string>(service, 'context');

  const s = service as ImageService;
  const p = getPropertyValue<any>(s, 'profile');
  const profileLevel = getProfileLevel(p);
  
  if (t === 'ImageService2' || context?.includes('image/2'))
    return { majorVersion: 2, profileLevel };
  
  if (t === 'ImageService3' || context?.includes('image/3'))
    return { majorVersion: 3, profileLevel };

  // Fallback / future-proofing for newer contexts (e.g., image/4)
  if (context?.includes('image/')) {
    const match = context.match(/image\/(\d+)/);
    const majorVersion = match ? parseInt(match[1], 10) : 3;
    return { majorVersion, profileLevel };
  }

  return { majorVersion: 3, profileLevel };
}

// export const getProfileLevel = (service: Service): 0 | 1 | 2 | undefined; 
// export const isLevel0 = (service: Service): boolean;


