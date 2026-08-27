/**
 * tests/core/offline/queue.test.js
 *
 * Core offline journal queue execution test suite.
 *
 * Source: plan.md Phase 6-A, core/offline/queue.js
 */

import { queue } from '@anzaui/anza/offline';
import { deserializeRequest } from '../../../src/sw/queue.js';

describe('Offline Journal Queue', () => {
  beforeEach(async () => {
    await queue.clear();
  });

  afterEach(async () => {
    await queue.clear();
  });

  it('should support enqueuing and listing tasks in chronological order', async () => {
    const id1 = await queue.push('user:update', { name: 'A' }, { idempotencyKey: 'id-1' });
    // Artificially delay second push slightly to guarantee strict timestamp sequencing
    await new Promise((resolve) => setTimeout(resolve, 5));
    const id2 = await queue.push('user:update', { name: 'B' }, { idempotencyKey: 'id-2' });

    if (id1 !== 'id-1' || id2 !== 'id-2') {
      throw new Error('Custom idempotency keys were not applied properly');
    }

    const tasks = await queue.list();
    if (tasks.length !== 2) {
      throw new Error(`Expected 2 enqueued tasks, got ${tasks.length}`);
    }
    if (tasks[0].id !== 'id-1' || tasks[1].id !== 'id-2') {
      throw new Error('Tasks are not sorted chronologically oldest-first');
    }
  });

  it('should support updating task states and evicting processed tasks', async () => {
    await queue.push('post:create', { title: 'First Post' }, { idempotencyKey: 'task-abc' });
    
    const tasks = await queue.list();
    const task = tasks[0];
    task.retries += 1;

    await queue.update(task);
    
    const updatedTasks = await queue.list();
    if (updatedTasks[0].retries !== 1) {
      throw new Error(`Expected retries to be 1, got ${updatedTasks[0].retries}`);
    }

    await queue.delete('task-abc');
    const finalTasks = await queue.list();
    if (finalTasks.length !== 0) {
      throw new Error('Expected task to be completely evicted');
    }
  });

  it('should deserialize a plain object request body to a JSON string if Content-Type is application/json', () => {
    const serialized = {
      url: 'https://api.example.com/submit',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { name: 'Alice', age: 30 }
    };

    const request = deserializeRequest(serialized);
    
    if (request.method !== 'POST') {
      throw new Error(`Expected POST method, got ${request.method}`);
    }
    
    return request.text().then((text) => {
      if (text !== '{"name":"Alice","age":30}') {
        throw new Error(`Expected JSON string body, got: ${text}`);
      }
    });
  });

  it('should preserve standard bodies (e.g. ArrayBuffer) when deserializing', () => {
    const buffer = new TextEncoder().encode('raw buffer content');
    const serialized = {
      url: 'https://api.example.com/binary',
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      body: buffer
    };

    const request = deserializeRequest(serialized);
    return request.arrayBuffer().then((bodyBuffer) => {
      const text = new TextDecoder().decode(bodyBuffer);
      if (text !== 'raw buffer content') {
        throw new Error(`Expected raw buffer content, got: ${text}`);
      }
    });
  });
});
