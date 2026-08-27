# API Reference

Complete reference for the workers facade and internal classes.

---

## Facade

```javascript
import { workers } from '@anzaui/anza/workers';
```

### `workers.run(script, task, opts)`

Run a task in a worker pool. Returns `Promise<result>`.

### `workers.dedicated(script)`

Create a raw `Dedicated` worker. Returns `Dedicated` instance.

### `workers.shared(script, name)`

Create a `Shared` connection. Falls back to dedicated worker.

### `workers.lock(name, fn, opts)`

Acquire a Web Lock. Returns `Promise<fn_result>`.

### `workers.broadcast(name, payload)`

Send to a BroadcastChannel. No-op if unsupported.

### `workers.subscribe(name, fn, signal)`

Subscribe to a BroadcastChannel. Returns disposer.

### `workers.offscreen(canvas, script, opts)`

Transfer canvas to worker. Returns `Promise<Offscreen>`.

### `workers.close(script)`

Terminate the pool for one script URL.

### `workers.clear()`

Terminate all pools and close all broadcast channels.

---

## Feature Detection

```javascript
import { has } from '@anzaui/anza/workers';
```

| Flag | Detects |
| ------ | --------- |
| `has.worker` | `Worker` |
| `has.shared` | `SharedWorker` |
| `has.channel` | `BroadcastChannel` |
| `has.locks` | `navigator.locks` |
| `has.offscreen` | `OffscreenCanvas` |
| `has.isolated` | `crossOriginIsolated` |

---

## Pool Options

```javascript
workers.run(script, task, {
  payload,        // data for worker
  transferables,  // Transferable[]
  signal,         // AbortSignal
  timeout,        // ms
  priority,       // 'user-blocking' | 'user-visible' | 'background'
  idempotent,     // boolean
  meta            // arbitrary metadata
});
```

---

## Dedicated

```javascript
import { Dedicated } from '@anzaui/anza/workers';

const worker = new Dedicated('/worker.js');
const result = await worker.run('task', { payload, signal, timeout });
worker.terminate();
```

---

## Shared

```javascript
import { Shared } from '@anzaui/anza/workers';

const conn = new Shared('/worker.js', 'name');
conn.connect();
conn.send(message, transferables);
const off = conn.subscribe(fn, signal);
conn.close();
```

---

## Offscreen

```javascript
import { Offscreen } from '@anzaui/anza/workers';

const handle = new Offscreen(canvas, '/worker.js', { onError, onResize });
await handle.open();
handle.send(payload);
handle.resize({ width, height, dpr });
handle.close();
```

---

## Lock Options

```javascript
workers.lock(name, fn, {
  mode: 'exclusive',  // or 'shared'
  signal,            // AbortSignal
  timeout,           // ms
  ifAvailable,       // boolean
  steal              // boolean
});
```
