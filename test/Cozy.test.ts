import { describe, it, expect } from 'vitest';
import { Cozy, CozyManifest } from '../src';

import { COLLECTION, WITH_STRUCTURES } from './fixtures';

describe('Cozy', () => {

  it('should parse collection manifests correctly', async () => {
    const result = await Cozy.parseURL(COLLECTION);
    expect(result.type).toBe('collection');
  });

  it('should parse structures in presentation manifests', async () => {
    const result = await Cozy.parseURL(WITH_STRUCTURES);
    expect(result.type).toBe('manifest');
    expect('resource' in result).toBeTruthy();

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.structure.length > 0).toBeTruthy();

    const tableOfContents = manifest.getTableOfContents();
    expect(tableOfContents.root.length).toBe(1);
    expect(tableOfContents.root[0].children.length).toBe(14);
  });

});

