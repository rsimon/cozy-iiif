import type { Selector } from '@iiif/presentation-3';
import type { Bounds } from '../types';

const MAX_FRAGMENT_LENGTH = 512; // ReDoS guard

const number = '-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?';

export const parseFragmentSelector = (fragment: string): Bounds => {
  if (fragment.length > MAX_FRAGMENT_LENGTH) throw new Error('Fragment too long: ' + fragment);

  const regex = new RegExp(
    `(xywh)=((?:pixel|percent))?:?(${number}),(${number}),(${number}),(${number})$`,
  );
  
  const matches = regex.exec(fragment);

  if (!matches) throw new Error('Not a MediaFragment: ' + fragment);

  const [_, prefix, unit, a, b, c, d] = matches;

  if (prefix !== 'xywh') throw new Error('Unsupported MediaFragment: ' + fragment);

  if (unit && unit !== 'pixel') throw new Error(`Unsupported MediaFragment unit: ${unit}`);

  const [x, y, w, h] = [a, b, c, d].map(parseFloat);
  return { x, y, w, h };
}

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
  const parseBounds = (xywh: string): Bounds | undefined => {
    const coords = xywh.replace('xywh=', '').split(',').map(Number);
    if (coords.length === 4 && coords.every(n => !isNaN(n))) {
      const [x, y, w, h] = coords;
      return { x, y, w, h };
    }
  }

  // SpecificResource object with FragmentSelector
  if (target && typeof target === 'object') {
    const selector = Array.isArray(target.selector) 
      ? target.selector.find((s: any) => s.type === 'FragmentSelector')
      : target.selector?.type === 'FragmentSelector' ? target.selector : null;

    if (selector?.value)
      return parseBounds(selector.value);
  }

  // Plain string, with or without #xywh fragment
  if (typeof target === 'string') {
    const hash = target.split('#')[1];
    if (hash?.startsWith('xywh='))
      return parseBounds(hash);
  }
}
