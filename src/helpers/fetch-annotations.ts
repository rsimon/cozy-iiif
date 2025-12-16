import type { Annotation, AnnotationPage } from '@iiif/presentation-3';
import pThrottle from 'p-throttle';
import type { CozyCanvas } from '../types';

const throttle = pThrottle({
	limit: 4,
	interval: 1000
});

const fetchAnnotationPage = (page: AnnotationPage, canvasId?: string): Promise<Annotation[]> => {
  if (page.items) {
    // Embedded
    return Promise.resolve(page.items as Annotation[]);
  } else if (page.partOf) {
    // Annotation collection
    const fetchRecursive = throttle((url: string, annotations: Annotation[] = []): Promise<Annotation[]> => 
      fetch(url).then(res => res.json()).then(data => {
        const all = [...annotations, ...(data.items || [])];
        if (data.next) {
          return fetchRecursive(data.next, all);
        } else {
          return all;
        }
      }));

    if (!Array.isArray(page.partOf)) throw new Error('Referenced annotation collection is invalid');

    if (page.partOf.length === 0) {
      console.warn('Annotation page references 0 collections');
      return Promise.resolve([]);
    }

    return page.partOf.reduce<Promise<Annotation[]>>((promise, page) => promise.then(all => {
      if (typeof page.first === 'string') {
        return fetchRecursive(page.first).then(a => ([...all, ...a]));
      } else {
        console.warn('Unsupported `first` arg', page.first);
        return all;
      }
    }), Promise.resolve([]))
      // Note that collections will list all annotations, not just those on this canvas!
      .then(all => all.filter(a => isOnThisCanvas(a, canvasId)));
  } else {
    // Referenced
    return fetch(page.id)
      .then(res => res.json())
      .then(data => ((data.items || []) as Annotation[]).filter(a => isOnThisCanvas(a, canvasId)))
      .catch(error => {
        console.error(error);
        console.warn(`Could not resolve referenced annotation page: ${page.id}`)
        return [];
      });
  }
}

const isOnThisCanvas = (annotation: Annotation, canvasId?: string) => {
  if (!canvasId || !annotation.target) return true;

  const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
  return targets.some((target: any) => {
    if (!('source' in target)) return true;
    
    if (typeof target.source === 'string') {
      return target.source === canvasId;
    } else {
      return target.source.id === canvasId;
    }
  });
}

export const fetchAnnotations = (arg: CozyCanvas | AnnotationPage): Promise<Annotation[]> => {
  if ('type' in arg && arg.type === 'AnnotationPage') {
    return fetchAnnotationPage(arg);
  } else {
    return (arg as CozyCanvas).annotations.reduce<Promise<Annotation[]>>((promise, page) => promise.then(all => {
      return fetchAnnotationPage(page, arg.id).then(onThisPage => ([...all, ...onThisPage]));
    }), Promise.resolve([]));
  }
}