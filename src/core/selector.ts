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