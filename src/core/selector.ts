import type { Selector } from '@iiif/presentation-3';
import type { Bounds } from '../types';

const MAX_FRAGMENT_LENGTH = 512; // ReDoS guard

const NUMBER = '-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?';

const XYWH = new RegExp(
  `(xywh)=((?:pixel|percent))?:?(${NUMBER}),(${NUMBER}),(${NUMBER}),(${NUMBER})$`,
);

/**
 * Parses the Bounds from a W3C FragmentSelector fragment string.
 */
export const parseFragmentSelector = (fragment: string): Bounds => {
  if (fragment.length > MAX_FRAGMENT_LENGTH) throw new Error('Fragment too long: ' + fragment);

  const matches = XYWH.exec(fragment);

  if (!matches) throw new Error('Not a MediaFragment: ' + fragment);

  const [_, prefix, unit, a, b, c, d] = matches;

  if (prefix !== 'xywh') throw new Error('Unsupported MediaFragment: ' + fragment);

  if (unit && unit !== 'pixel') throw new Error(`Unsupported MediaFragment unit: ${unit}`);

  const [x, y, w, h] = [a, b, c, d].map(parseFloat);
  return { x, y, w, h };
}

/**
 * Parses a raw JSON IIIF Selector into Bounds.
 */
export const parseRegion = (selector?: Selector | Selector[]): Bounds | undefined => {
  if (!selector) return;
  
  if (Array.isArray(selector)) {
    console.warn('Unsupported selector (array)');
    return;
  }

  // For now, ImageApiSelector and FragmentSelector are the only supported selector types
  if (typeof selector !== 'object') {
    console.warn('Unsuppoted selector', selector);
    return;
  }

  if (selector.type === 'ImageApiSelector' && selector.region) {
    const [x, y, w, h] = selector.region.split(',').map(str => parseFloat(str.trim()));
    return { x, y, w, h };
  } else if (selector.type === 'FragmentSelector') {
    return parseFragmentSelector(selector.value);
  }

  return;
}

export const parseTarget = (target: any): Bounds | undefined => {
  try {
    // SpecificResource object with FragmentSelector
    if (target && typeof target === 'object') {
      const selector = Array.isArray(target.selector) 
        ? target.selector.find((s: any) => s.type === 'FragmentSelector')
        : target.selector?.type === 'FragmentSelector' ? target.selector : null;

      if (selector?.value)
        return parseFragmentSelector(selector.value);
    }

    // Plain string, with or without #xywh fragment
    if (typeof target === 'string') {
      const hash = target.split('#')[1];
      if (hash?.startsWith('xywh='))
        return parseFragmentSelector(hash);
    }
  } catch (error) {
    console.error(error);
  }
}
