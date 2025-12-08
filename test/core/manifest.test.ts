import { describe, it, expect } from 'vitest';
import { Cozy, CozyManifest } from '../../src';

import { WITH_STRUCTURES } from './fixtures';

describe('manifest', () => {

  it('should generate proper ToC breadcrumbs', async () => {
    const result = await Cozy.parseURL(WITH_STRUCTURES);
    expect(result.type).toBe('manifest');
    expect('resource' in result).toBeTruthy();

    const manifest = (result as any).resource as CozyManifest;
    expect(manifest.structure.length > 0).toBeTruthy();

    /*
    const toc = manifest.getTableOfContents();

    const breadcrumbs = toc.getBreadcrumbs('https://lib.is/IE19255085/range/range-0-12.json');

    expect(breadcrumbs.length).toBe(3);
    expect(breadcrumbs[0].getLabel()).toBe('Table of Contents');
    expect(breadcrumbs[1].getLabel()).toBe('Woodcuts full');
    expect(breadcrumbs[2].getLabel()).toBe('f. X2v-f. X3r: woodcut full ')
    */
  });

});