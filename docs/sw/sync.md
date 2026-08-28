# Sync

Background Sync queues failed requests and replays them when the browser comes back online.

## How It Works

1. The main thread queues a task via `offline.queue.push()`
2. The browser fires a `sync` event when connectivity returns
3. The Service Worker replays all queued requests in order
4. Successful tasks are removed; failed tasks are retried or moved to a dead-letter queue

## Queue a Task from the Main Thread

```javascript
import { offline } from '@anzaui/anza/offline';

await offline.queue.push({
  url: '/api/posts',
  method: 'POST',
  body: JSON.stringify({ title: 'Hello' }),
  headers: { 'content-type': 'application/json' }
});
```

`offline.queue.push()` serializes the request and stores it in IndexedDB. It returns a Promise that resolves when the store write completes.

## Replay in the Service Worker

```javascript
import { replayQueue } from '@anzaui/anza/sw';

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(replayQueue());
  }
});
```

`replayQueue()` reads all stored tasks, replays them as `fetch()` calls, and removes the ones that succeed. Failed tasks stay in the queue for the next sync event.

## Register the Sync Event

The browser does not fire `sync` events unless you request them. Use the main thread bridge:

```javascript
import { offline } from '@anzaui/anza/offline';

async function registerSync() {
  const reg = await navigator.serviceWorker.ready;
  await reg.sync.register('sync-tasks');
}
```

Call `registerSync()` after any mutation that should survive going offline.

## Dead Letter Queue

After a configurable number of retries, failed tasks move to a dead-letter queue where they wait for manual inspection.

```javascript
import { requeueFailed } from '@anzaui/anza/sw';

// After 3 failed attempts, move to dead letter
await requeueFailed({ maxAttempts: 3 });
```

## Request Serialization

The queue stores standard `Request` objects as plain objects. Two helpers handle the conversion:

```javascript
import { serializeRequest, deserializeRequest } from '@anzaui/anza/sw';

const payload = await serializeRequest(request);
const restored = await deserializeRequest(payload);
```

`serializeRequest` reads the body as a blob and extracts headers. `deserializeRequest` rebuilds a standard `Request` from the stored payload.
