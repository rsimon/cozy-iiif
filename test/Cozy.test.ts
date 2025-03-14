import { describe, it, expect } from 'vitest';
import { Cozy } from '../src';

import { COLLECTION } from './fixtures';

describe('Cozy', () => {

  it('should parse collection manifests correctly', async () => {
    const result = await Cozy.parseURL(COLLECTION)
    expect(result.type).toBe('collection');
  })

});
