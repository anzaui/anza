/**
 * tests/core/api/stream.test.js
 *
 * Core NDJSON streams progressive parsing test suite.
 *
 * Source: plan.md Phase 6-A, core/api/stream.js
 */

import { createNDJSONTransform, stream } from '@anzaui/anza/api';

describe('progressive Streams API', () => {
  it('should parse NDJSON chunk streams correctly across boundary segments', async () => {
    const transform = createNDJSONTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    // Write chunk split across standard lines boundaries (without awaiting to prevent backpressure deadlock)
    writer.write('{"id": 1}\n{"id');
    writer.write('": 2}\n');
    writer.close();

    const first = await reader.read();
    const second = await reader.read();
    const third = await reader.read();

    if (first.done || first.value.id !== 1) {
      throw new Error(`Expected first value {id: 1}, got ${JSON.stringify(first.value)}`);
    }
    if (second.done || second.value.id !== 2) {
      throw new Error(`Expected second value {id: 2}, got ${JSON.stringify(second.value)}`);
    }
    if (!third.done) {
      throw new Error('Expected reader stream to be completed');
    }
  });

  it('should asynchronously stream parsed items from readable response bodies', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('{"val": "a"}\n'));
          controller.enqueue(encoder.encode('{"val": "b"}\n'));
          controller.close();
        }
      });

      return {
        ok: true,
        body: stream
      };
    };

    try {
      const results = [];
      for await (const item of stream('/api/ndjson')) {
        results.push(item);
      }

      if (results.length !== 2) {
        throw new Error(`Expected 2 streamed items, got ${results.length}`);
      }
      if (results[0].val !== 'a' || results[1].val !== 'b') {
        throw new Error(`Expected values "a" and "b", got ${JSON.stringify(results)}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should support request-scoped chunk events with auto-cleanup', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => {
      const streamInstance = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('{"item": "first"}\n'));
          controller.enqueue(encoder.encode('{"item": "second"}\n'));
          controller.close();
        }
      });

      return {
        ok: true,
        body: streamInstance
      };
    };

    try {
      const receivedChunks = [];
      const streamIterable = stream('/api/chunks', {
        on: {
          chunk: (e) => {
            receivedChunks.push(e.detail.chunk);
          }
        }
      });

      for await (const chunk of streamIterable) {
        // consume stream
      }

      if (receivedChunks.length !== 2) {
        throw new Error(`Expected 2 events to trigger chunk callback, got ${receivedChunks.length}`);
      }
      if (receivedChunks[0].item !== 'first' || receivedChunks[1].item !== 'second') {
        throw new Error(`Expected first and second chunks, got ${JSON.stringify(receivedChunks)}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
