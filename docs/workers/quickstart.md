# Quick Start

Get a worker running in five minutes.

## 1. Run a Task in a Pool

```javascript
import { workers } from '@anzaui/anza/workers';

const result = await workers.run('/workers/calc.js', 'fibonacci', {
  payload: { n: 40 },
  priority: 'user-visible'
});

console.log(result); // 102334155
```

The pool lazily creates workers (default: `hardwareConcurrency - 1`). Tasks are scheduled by priority.

## 2. Priority Scheduling

```javascript
// Critical path — runs first
workers.run('/workers/calc.js', 'render', {
  payload: data,
  priority: 'user-blocking'
});

// Background sync — lowest priority
workers.run('/workers/calc.js', 'sync', {
  payload: data,
  priority: 'background'
});
```

| Priority | Level | Use Case |
| ---------- | ------- | ---------- |
| `user-blocking` | 2 | Critical UI, must run immediately |
| `user-visible` | 1 | Standard work, default |
| `background` | 0 | Telemetry, logging, prefetch |

The pool promotes background tasks after 20 higher-priority tasks to prevent starvation.

## 3. Cancel a Task

```javascript
const ctrl = new AbortController();

workers.run('/workers/calc.js', 'heavy', {
  payload: data,
  signal: ctrl.signal,
  timeout: 5000
});

// Cancel after 3 seconds
setTimeout(() => ctrl.abort(), 3000);
```

## 4. Cross-Tab Messaging

```javascript
// Send
workers.broadcast('app-event', { type: 'logout' });

// Receive
const off = workers.subscribe('app-event', (data) => {
  console.log('Received:', data);
});

off(); // unsubscribe
```

## 5. Web Lock

```javascript
await workers.lock('db:write', async () => {
  await db.put('key', value);
}, { timeout: 3000 });
```

Other tabs calling `lock('db:write')` will wait until this callback completes.

## 6. Feature Detection

```javascript
import { has } from '@anzaui/anza/workers';

if (has.worker)   console.log('Web Workers supported');
if (has.shared)   console.log('SharedWorker supported');
if (has.channel)  console.log('BroadcastChannel supported');
if (has.locks)    console.log('Web Locks API supported');
if (has.offscreen) console.log('OffscreenCanvas supported');
```

## Complete Working Example

```javascript
import { workers } from '@anzaui/anza/workers';

// Process data in background
async function processChunk(data) {
  const result = await workers.run('/workers/process.js', 'transform', {
    payload: data,
    priority: 'background',
    timeout: 10000
  });
  return result;
}

// Sync state across tabs
workers.subscribe('data-update', (payload) => {
  updateUI(payload);
});

// Exclusive DB write
async function saveRecord(record) {
  await workers.lock('db:records', async () => {
    await db.save(record);
  });
}
```
