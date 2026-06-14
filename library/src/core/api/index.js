/**
 * src/core/api/index.js
 *
 * Public networking layer entry point.
 * Composes request mutators through the outbound/inbound pipeline,
 * applying caching strategies, transient error retries, and standard timeout controls.
 *
 * Source: doc 11 — Networking §2, §4
 */

import { pipeline } from './pipeline.js';
import { execute, PlatformError } from './fetch.js';
import { retry } from './retry.js';
import { handle as handleCache } from './cache.js';
import { stream, createNDJSONTransform } from './stream.js';
import { upload } from './upload.js';
import { prefixes } from './prefixes/index.js';
import { events } from './events/index.js';
import { cache as apiCache } from './caches/index.js';

let cache = null;

function sync() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('anza-state');
  if (el) {
    try {
      cache = JSON.parse(el.textContent);
    } catch (_) {
      cache = null;
    }
  } else {
    cache = null;
  }
}

sync();

// Register global telemetry inbound interceptor to emit requests status/errors events
pipeline.inbound((responseOrError) => {
  const requestId = responseOrError?.requestId;

  if (responseOrError instanceof Error) {
    const err = responseOrError;
    const isTimeout = err.code === 'NETWORK_TIMEOUT';
    if (isTimeout) {
      events.emit('timeout', { error: err, requestId });
    }
    events.emit('error', { error: err, requestId });
    events.emit('failed', { error: err, requestId });
  } else {
    const response = responseOrError;
    const status = response.status;
    
    events.emit(`status:${status}`, { response, requestId });

    if (!response.ok) {
      events.emit('failed', { response, requestId });
      events.emit('error', { response, requestId });
    } else {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        events.emit('type:json', { response, requestId });
      } else if (contentType.includes('text/event-stream')) {
        events.emit('type:stream', { response, requestId });
      } else if (contentType.includes('text/')) {
        events.emit('type:text', { response, requestId });
      }
    }
  }
  return responseOrError;
});

/**
 * Normalizes options and routes the request descriptor through the core pipeline.
 */
async function request(url, method, body, opts = {}) {
  const resolvedUrl = prefixes.resolve(url);
  
  if (method === 'GET' && cache && resolvedUrl in cache) {
    return JSON.parse(JSON.stringify(cache[resolvedUrl]));
  }
  
  const headers = new Headers(opts.headers || {});
  
  // Auto-serialize JSON bodies
  let parsedBody = body;
  if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof FormData)) {
    parsedBody = JSON.stringify(body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  // Generate unique request ID to scope request-specific event listeners
  const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const descriptor = {
    requestId,
    url: resolvedUrl,
    method,
    headers,
    body: parsedBody,
    signal: opts.signal,
    priority: opts.priority || 'user-visible',
    timeout: opts.timeout || 10000,
    cache: opts.cache, // cache strategy name: 'cache-first' | 'network-first' | 'stale-while-revalidate'
    retries: opts.retries ?? 3,
    ...opts
  };

  // Register request-specific temporary listeners with automatic scoped cleanup
  const disposes = [];
  if (opts.on && typeof opts.on === 'object') {
    for (const [event, handler] of Object.entries(opts.on)) {
      if (typeof handler === 'function') {
        const dispose = events.on(event, (e) => {
          if (e.detail?.requestId === requestId) {
            handler(e);
          }
        });
        disposes.push(dispose);
      }
    }
  }

  try {
    // Run through pipeline -> cache handler -> retry handler -> fetch executor
    const response = await pipeline.run(descriptor, async (currentDesc) => {
      return handleCache(currentDesc, async (cacheDesc) => {
        return retry(
          () => execute(cacheDesc),
          {
            attempts: cacheDesc.retries,
            signal: cacheDesc.signal
          }
        );
      });
    });

    // Automatically extract response payload if successful
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  } finally {
    // Perform guaranteed automatic cleanup of temporary request-specific listeners
    for (const dispose of disposes) {
      dispose();
    }
  }
}

export const api = {
  get:    (url, opts) => request(url, 'GET', null, opts),
  state:  () => cache ? JSON.parse(JSON.stringify(cache.__route || {})) : {},
  sync,
  post:   (url, body, opts) => request(url, 'POST', body, opts),
  put:    (url, body, opts) => request(url, 'PUT', body, opts),
  patch:  (url, body, opts) => request(url, 'PATCH', body, opts),
  delete: (url, opts) => request(url, 'DELETE', null, opts),
  stream,
  upload,
  pipeline,
  PlatformError,
  
  // Prefix registry singleton APIs
  prefix: prefixes,

  // Cache manager APIs
  cache: apiCache,

  // Event emitter hooks
  on: (event, handler, signal) => events.on(event, handler, signal),
  emit: (event, detail) => events.emit(event, detail)
};

export { pipeline, PlatformError, execute, retry, createNDJSONTransform, stream, upload, prefixes, events, apiCache as cache, sync };


