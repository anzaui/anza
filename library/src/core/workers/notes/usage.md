# Native Workers Usage Guide

The Native Workers layer provides a small browser-native concurrency facade for Dedicated Workers, pooled task execution, SharedWorker connections, BroadcastChannel events, Web Locks, and OffscreenCanvas rendering.

Status: this guide documents the implemented public Workers contract: `workers.run`, `workers.dedicated`, `workers.shared`, `workers.lock`, `workers.broadcast`, `workers.subscribe`, `workers.offscreen`, `workers.close`, `workers.clear`, feature detection, request/response messages, transferables, and lifecycle cleanup.

Import from the workers entry point:

```javascript
import { workers, has } from '@anzaui/anza/workers';
```

## 1. Feature Detection

Use `has` when behavior depends on a browser primitive.

```javascript
if (!has.worker) {
  throw new Error('This feature needs Web Worker support');
}

if (has.isolated) {
  // SharedArrayBuffer paths may be enabled here.
}
```

Flags:

```javascript
has.worker
has.shared
has.channel
has.locks
has.offscreen
has.isolated
```

Rules:

- `has.worker` gates Dedicated Workers and pools.
- `has.shared` only tells whether native SharedWorker is available; `workers.shared` can still fall back to a Dedicated Worker.
- `has.channel` gates BroadcastChannel messaging.
- `has.locks` gates native cross-context Web Locks; `workers.lock` has a same-tab fallback.
- `has.offscreen` gates OffscreenCanvas.
- `has.isolated` is required before using SharedArrayBuffer.

## 2. Message Contract

Worker request/response messages use structured-clone-safe plain data.

Request sent to a task worker:

```javascript
{
  task,
  payload,
  meta,
  port
}
```

Response sent back through `port`:

```javascript
{ ok: true, value }
{ ok: false, error }
```

Worker script:

```javascript
const tasks = {
  async double(payload) {
    return payload * 2;
  },

  async sum(payload) {
    return payload.reduce((total, value) => total + value, 0);
  }
};

self.onmessage = async ({ data }) => {
  const { task, payload, port } = data;

  try {
    const run = tasks[task];
    if (!run) throw new Error(`Unknown task: ${task}`);

    const value = await run(payload);
    port.postMessage({ ok: true, value });
  } catch (err) {
    port.postMessage({ ok: false, error: err.message });
  } finally {
    port.close();
  }
};
```

Rules:

- Pass plain objects, arrays, Maps, Sets, typed arrays, primitives, Blobs, Files, and other structured-clone-safe values.
- Do not pass DOM nodes, functions, class instances with methods, symbols, WeakMaps, WeakSets, or WeakRefs.
- Validate `task` names inside worker scripts.
- Treat worker messages as untrusted input.
- Keep worker scripts as module workers.

## 3. Transferables

Use transferables for large binary data so ownership moves instead of bytes being copied.

```javascript
const buffer = new ArrayBuffer(1024 * 1024);

const result = await workers.run('/workers/bytes.js', 'hash', {
  payload: buffer,
  transferables: [buffer]
});
```

After transfer, the sender loses access to the transferred object.

Common transferables:

- `ArrayBuffer`
- `MessagePort`
- `ReadableStream`
- `WritableStream`
- `TransformStream`
- `ImageBitmap`
- `OffscreenCanvas`
- `AudioData`
- `VideoFrame`

## 4. `workers.run`

Use `workers.run` for CPU-bound tasks that should execute in a lazily allocated pool.

```javascript
const value = await workers.run('/workers/math.js', 'sum', {
  payload: [1, 2, 3],
  priority: 'user-visible',
  timeout: 3000
});
```

With cancellation:

```javascript
const ctrl = new AbortController();

const task = workers.run('/workers/search.js', 'index', {
  payload: records,
  signal: ctrl.signal,
  timeout: 5000,
  priority: 'background'
});

ctrl.abort();

await task;
```

Priority values:

```javascript
'user-blocking'
'user-visible'
'background'
```

Use priorities like this:

- `user-blocking`: input-triggered work needed before the next visible response.
- `user-visible`: normal work the user is waiting on.
- `background`: indexing, warming, cleanup, sync, and telemetry work.

Pool options are read when the pool for a script is first created:

```javascript
await workers.run('/workers/image.js', 'resize', {
  payload: image,
  size: 2,
  max: 4,
  idle: 15000
});
```

Use `idempotent` only when retrying the task is safe:

```javascript
await workers.run('/workers/sync.js', 'replay', {
  payload: item,
  idempotent: true
});
```

## 5. `workers.dedicated`

Use `workers.dedicated` when one caller needs direct control of a single long-lived Dedicated Worker.

```javascript
const worker = workers.dedicated('/workers/parser.js');

const parsed = await worker.run('json', {
  payload: text,
  timeout: 2000
});

worker.terminate();
```

Direct Dedicated Workers are useful for:

- A long-lived parser.
- A persistent crypto worker.
- A custom protocol worker.
- A workflow that should not share a pool with other work.

## 6. `Pool`

Use `Pool` directly when you need a reusable pool instance with explicit lifetime.

```javascript
import { Pool } from '@anzaui/anza/workers';

const pool = new Pool('/workers/image.js', {
  max: 3,
  idle: 30000
});

const thumbnail = await pool.run('thumbnail', {
  payload: file,
  priority: 'user-visible'
});

pool.terminate();
```

Use the facade for most app code. Use `Pool` directly when a module owns its own worker lifetime.

## 7. `Shared`

Use `workers.shared` when multiple same-origin tabs need one shared background resource.

```javascript
const socket = workers.shared('/workers/socket.js', 'socket');

const stop = socket.subscribe((message) => {
  console.log(message);
});

socket.send({
  type: 'subscribe',
  topic: 'prices'
});

stop();
socket.close();
```

Shared workers are best for:

- One WebSocket shared across tabs.
- One auth refresh coordinator.
- One same-origin rate limiter.
- One shared state coordinator.

When native SharedWorker is unavailable, the implementation falls back to a Dedicated Worker with the same `send` and `subscribe` shape.

Compatibility aliases:

```javascript
socket.postMessage(message);
socket.onMessage(handler);
```

Prefer:

```javascript
socket.send(message);
socket.subscribe(handler);
```

## 8. Shared Worker Script

A SharedWorker script receives ports through `onconnect`.

```javascript
const ports = new Set();

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = ({ data }) => {
    if (data.type === 'subscribe') {
      port.postMessage({ type: 'subscribed', topic: data.topic });
    }
  };

  port.start();
};

function publish(message) {
  for (const port of ports) {
    port.postMessage(message);
  }
}
```

For the Dedicated Worker fallback, support normal `self.onmessage` too if the script needs to run in both modes.

```javascript
self.onmessage = ({ data }) => {
  self.postMessage({ type: 'received', value: data });
};
```

## 9. `workers.broadcast`

Use BroadcastChannel for stateless cross-tab events.

```javascript
const stop = workers.subscribe('sync:done', (payload) => {
  console.log('synced at', payload.at);
});

workers.broadcast('sync:done', {
  at: Date.now()
});

stop();
```

With `AbortSignal` cleanup:

```javascript
const ctrl = new AbortController();

workers.subscribe('profile:changed', refresh, ctrl.signal);

ctrl.abort();
```

Use BroadcastChannel for:

- Cache invalidation.
- Sync completion.
- State refresh notices.
- Lightweight tab-to-tab notifications.

Use SharedWorker instead when state must persist or when only one connection should exist.

## 10. Broadcast Manager

The named `broadcast` export exposes direct channel controls.

```javascript
import { broadcast } from '@anzaui/anza/workers';

const stop = broadcast.subscribe('cache:avatar', clearAvatar);

broadcast.broadcast('cache:avatar', { user: '123' });

stop();
broadcast.close('cache:avatar');
broadcast.clear();
```

`broadcast.clear()` closes every managed channel.

## 11. `workers.lock`

Use Web Locks for cross-tab mutual exclusion.

```javascript
await workers.lock('idb:records', async () => {
  await saveRecord(record);
});
```

With options:

```javascript
await workers.lock('auth:refresh', refreshToken, {
  mode: 'exclusive',
  timeout: 5000,
  signal: ctrl.signal,
  ifAvailable: false,
  steal: false
});
```

Shared mode:

```javascript
await workers.lock('opfs:report', readReport, {
  mode: 'shared'
});
```

Try-lock behavior:

```javascript
try {
  await workers.lock('sync:leader', lead, {
    ifAvailable: true
  });
} catch (err) {
  // Another tab is already leading.
}
```

Lock naming:

| Pattern | Use |
|---|---|
| `idb:<store>` | IndexedDB store access |
| `opfs:<file>` | OPFS file access |
| `auth:<op>` | Auth operations |
| `sync:<role>` | Sync leader or sync phase |
| `cache:<name>` | Cache invalidation |

Rules:

- Use exclusive locks for writes.
- Use shared locks for reads when supported.
- Keep lock callbacks short.
- Do not wait on user input inside a lock.
- Use `timeout` for locks that should never wait forever.

## 12. `workers.offscreen`

Use OffscreenCanvas for render loops that should not block UI work.

```javascript
const handle = await workers.offscreen(canvas, '/workers/render.js', {
  onError(err) {
    console.error('render failed', err);
  },

  onResize(size) {
    console.log(size.width, size.height, size.dpr);
  }
});

handle.send({
  type: 'frame',
  scene
});

handle.resize();
handle.close();
```

The returned promise resolves after the worker acknowledges readiness.

## 13. Offscreen Worker Script

The render worker receives the canvas and a control port.

```javascript
let ctx;
let port;

self.onmessage = ({ data }) => {
  if (data.canvas && data.port) {
    ctx = data.canvas.getContext('2d');
    port = data.port;
    port.onmessage = oncommand;
    port.postMessage({ ok: true });
  }
};

function oncommand({ data }) {
  if (data.type === 'resize') {
    resize(data);
    return;
  }

  if (data.type === 'frame') {
    draw(data.scene);
  }
}

function resize({ width, height, dpr }) {
  ctx.canvas.width = Math.round(width * dpr);
  ctx.canvas.height = Math.round(height * dpr);
}

function draw(scene) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // draw scene
}
```

Keep the control port open if the main thread will call `handle.send()` or `handle.resize()`.

## 14. Lifecycle

Close what you open.

```javascript
const worker = workers.dedicated('/workers/job.js');
worker.terminate();

const shared = workers.shared('/workers/socket.js');
shared.close();

const stop = workers.subscribe('event', handler);
stop();

const canvas = await workers.offscreen(el, '/workers/render.js');
canvas.close();
```

Pool lifecycle:

```javascript
workers.close('/workers/image.js');
workers.clear();
```

`workers.close(script)` terminates one pool.

`workers.clear()` terminates all pools and clears managed broadcast channels.

## 15. Error Handling

Handle task errors like normal promise errors.

```javascript
try {
  await workers.run('/workers/job.js', 'import', {
    payload: file,
    timeout: 10000
  });
} catch (err) {
  console.error(err);
}
```

Worker-side task failures should return an error response.

```javascript
port.postMessage({
  ok: false,
  error: err.message
});
```

Unhandled worker errors reject pending Dedicated Worker requests.

## 16. Testing Workers

Mock `Worker` when unit testing callers.

```javascript
const original = globalThis.Worker;

globalThis.Worker = class MockWorker {
  addEventListener() {}

  postMessage({ task, payload, port }) {
    port.postMessage({
      ok: true,
      value: `${task}:${payload}`
    });
  }

  terminate() {}
};

try {
  const value = await workers.run('/mock.js', 'ping', {
    payload: 'pong'
  });
} finally {
  globalThis.Worker = original;
}
```

Test these paths:

- Success response.
- `{ ok: false }` response.
- Abort before start.
- Abort while queued.
- Timeout.
- Worker error.
- `messageerror`.
- Transferables.
- Cleanup after `close`, `terminate`, and `clear`.

## 17. Choosing a Primitive

| Need | Use |
|---|---|
| CPU task with scheduling | `workers.run` |
| Single tab-owned worker | `workers.dedicated` |
| Owned pool instance | `new Pool()` |
| Shared socket | `workers.shared` |
| Cross-tab event | `workers.broadcast` |
| Cross-tab subscription | `workers.subscribe` |
| Cross-tab mutex | `workers.lock` |
| Canvas render loop | `workers.offscreen` |

## 18. Checklist

- Use `workers.run` for normal CPU work.
- Use `workers.dedicated` only when direct worker ownership matters.
- Use `workers.shared` for persistent same-origin coordination.
- Use `workers.broadcast` for stateless events.
- Use `workers.lock` for shared resources and leader election.
- Use `workers.offscreen` for expensive canvas rendering.
- Pass `AbortSignal` to cancellable tasks.
- Use `timeout` when a task or lock should not wait forever.
- Pass transferables for large binary values.
- Do not pass DOM nodes, functions, or class instances to workers.
- Validate task names inside worker scripts.
- Close direct workers, shared connections, broadcasts, and offscreen handles.
- Call `workers.clear()` during app-level teardown.
