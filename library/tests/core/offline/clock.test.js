/**
 * tests/core/offline/clock.test.js
 *
 * Logical Clock execution test suite.
 */

import { clock } from '@anzaui/anza/offline';
import { storage } from '@anzaui/anza/storage';

describe('Logical Clock', () => {
  beforeEach(async () => {
    await storage.delete('offline:actor');
    await storage.delete('offline:clock');
  });

  afterEach(async () => {
    await storage.delete('offline:actor');
    await storage.delete('offline:clock');
  });

  it('should generate and persist a unique actor UUID', async () => {
    const actor1 = await clock.actor();
    const actor2 = await clock.actor();

    if (!actor1 || typeof actor1 !== 'string' || actor1.length < 10) {
      throw new Error('Expected actor to be a valid UUID string');
    }
    if (actor1 !== actor2) {
      throw new Error('Expected actor UUID to be persistent across calls');
    }
  });

  it('should increment clock on tick', async () => {
    const c1 = await clock.tick();
    const c2 = await clock.tick();
    
    if (c2 !== c1 + 1) {
      throw new Error(`Expected clock to increment by 1. Got ${c1} then ${c2}`);
    }
  });

  it('should synchronize with remote clock', async () => {
    // Tick local clock to 1
    await clock.tick();
    
    // Sync with a larger remote clock (should advance)
    const c2 = await clock.sync(10);
    
    if (c2 !== 11) {
      throw new Error(`Expected clock to advance to remote + 1 (11), got: ${c2}`);
    }
  });

  it('should generate logical clock stamp', async () => {
    const stamp = await clock.stamp();
    if (!stamp.actor || typeof stamp.clock !== 'number') {
      throw new Error(`Invalid stamp format: ${JSON.stringify(stamp)}`);
    }
  });
});
