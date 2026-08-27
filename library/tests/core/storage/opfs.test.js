/**
 * tests/core/storage/opfs.test.js
 *
 * OPFS Gateway Adapter execution test suite.
 */

import { storage } from '@anzaui/anza/storage';
import { opfs } from '../../../src/core/storage/opfs.js';

describe('OPFS Storage Gateway Adapter', () => {
  beforeEach(async () => {
    await storage.clear('opfs');
  });

  afterEach(async () => {
    await storage.clear('opfs');
  });

  it('should write, read, delete and list entries in OPFS', async () => {
    const listBefore = await storage.list('opfs');
    if (listBefore.length !== 0) {
      throw new Error(`Expected 0 elements, got ${listBefore.length}`);
    }

    const testObject = { message: 'hello from opfs' };
    await storage.set('test-file.json', testObject, 'opfs');

    const retrieved = await storage.get('test-file.json', 'opfs');
    if (!retrieved || retrieved.message !== 'hello from opfs') {
      throw new Error(`Expected testObject, got ${JSON.stringify(retrieved)}`);
    }

    const listAfter = await storage.list('opfs');
    if (listAfter.length !== 1 || listAfter[0] !== 'test-file.json') {
      throw new Error(`Expected ["test-file.json"], got ${JSON.stringify(listAfter)}`);
    }

    await storage.delete('test-file.json', 'opfs');
    const retrievedAfterDelete = await storage.get('test-file.json', 'opfs');
    if (retrievedAfterDelete !== null) {
      throw new Error('Expected file to be deleted');
    }
  });

  it('should broadcast invalidation messages on set and delete', async () => {
    const testChannel = new BroadcastChannel('core:opfs-invalidation');
    const received = [];

    testChannel.onmessage = (event) => {
      received.push(event.data);
    };

    try {
      await storage.set('broadcast-file.json', { a: 1 }, 'opfs');
      await storage.delete('broadcast-file.json', 'opfs');

      // Wait for BroadcastChannel async propagation
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (received.length !== 2) {
        throw new Error(`Expected 2 events, got ${received.length}`);
      }
      if (received[0].op !== 'set' || received[0].key !== 'broadcast-file.json') {
        throw new Error(`Expected set invalidation, got ${JSON.stringify(received[0])}`);
      }
      if (received[1].op !== 'delete' || received[1].key !== 'broadcast-file.json') {
        throw new Error(`Expected delete invalidation, got ${JSON.stringify(received[1])}`);
      }
    } finally {
      testChannel.close();
    }
  });

  it('should support change invalidation notifications from other contexts', async () => {
    let triggered = false;
    let eventData = null;

    const dispose = opfs.onChange((data) => {
      triggered = true;
      eventData = data;
    });

    const senderChannel = new BroadcastChannel('core:opfs-invalidation');

    try {
      // Simulate another tab/context broadcasting an invalidation
      senderChannel.postMessage({ op: 'set', key: 'invalidation-file.json' });

      // Wait for BroadcastChannel asynchronous postMessage
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!triggered || !eventData || eventData.op !== 'set' || eventData.key !== 'invalidation-file.json') {
        throw new Error(`Invalidation did not trigger correctly: ${JSON.stringify(eventData)}`);
      }
    } finally {
      dispose();
      senderChannel.close();
    }
  });

  it('should verify concurrent operations serialize through Web Locks', async () => {
    const promises = [];
    // Start multiple sets in parallel to trigger Web Locks serialization
    for (let i = 0; i < 5; i++) {
      promises.push(storage.set('lock-test.json', { val: i }, 'opfs'));
    }
    await Promise.all(promises);

    const val = await storage.get('lock-test.json', 'opfs');
    if (val === null || typeof val.val !== 'number') {
      throw new Error('Lock serialization verification failed');
    }
  });
});
