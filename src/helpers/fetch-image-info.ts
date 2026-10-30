import { parseImageInfo } from '../core';
import type { CozyImageInfo } from '../types/info';

const infoCache = new Map<string, Promise<CozyImageInfo | undefined>>();

/**
 * Simple helper with built-in caching.
 */
export const fetchImageInfoWithCaching = (url: string) => {
  if (!infoCache.has(url))
    infoCache.set(url, fetch(url)
      .then((res) => res.json())
      .then(parseImageInfo)
      .catch(() => undefined));

  return infoCache.get(url)!;
}