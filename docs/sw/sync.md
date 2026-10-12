# Sync

Background Sync queues failed requests and replays them when the browser comes back online.

## How it works

1. The main thread stores a task with `offline.queue.push()`.
2. It asks for a `sync` event with `offline.sync.register()`.
3. When connectivity returns, the browser fires `sync` in the Service Worker.
4. `replayQueue()` replays the stored requests in order. Successful tasks are removed. Failed tasks are retried until they reach their retry limit, then marked as failed.

## Queue a task from the main thread

```javascript
import { offline } from '@anzaui/anza/offline';

const id = await offline.queue.push('create-post', {
  url: '/api/posts',
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: 'Hello' })
});
```

`push(taskName, payload, options)` stores the task in IndexedDB and resolves with its id. `replayQueue()` turns `payload` back into a `Request`, so it must have the shape `{ url, method, headers, body }` (the shape `serializeRequest` returns).

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `idempotencyKey` | string | random UUID | Task id. Pushing the same key again overwrites the task |
| `maxRetries` | number | `5` | Failed attempts before the task is marked as failed |

`push` throws a `QuotaExceededError` when storage use is above 80%.

## Request the sync event

The browser fires `sync` only for a registered tag:

```javascript
import { offline } from '@anzaui/anza/offline';

await offline.sync.register('sync-tasks');
```

Without Background Sync support (Safari, Firefox), `register` waits for the window's `online` event and dispatches a `core:sync-fallback` event with `detail.tag`.

## Replay in the Service Worker

```javascript
import { replayQueue } from '@anzaui/anza/sw';

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(replayQueue());
  }
});
```

`replayQueue()` reads the queue in order and `fetch`es each task:

- **OK response**: the task is removed and every client gets `{ type: 'sync-success', id, task }`.
- **Non-OK response**: the retry count goes up and replay continues with the next task.
- **Network error**: the retry count goes up and replay stops (the promise rejects), so later tasks keep their order. The browser retries the sync later.

Tasks already marked as failed are skipped.

## Failed tasks

`requeueFailed(entry, error)` is what `replayQueue` calls after a failed attempt. It increments `entry.retries`. When `retries` reaches `entry.maxRetries` (default 5), it sets `entry.failed = true`, stores `error.message` in `entry.error`, and posts `{ type: 'sync-failed', id, task, error }` to every client. Failed tasks stay in IndexedDB until you remove them with `offline.queue.delete(id)`.

## Request serialization

```javascript
import { serializeRequest, deserializeRequest } from '@anzaui/anza/sw';

const payload = await serializeRequest(request);
const restored = deserializeRequest(payload);
```

`serializeRequest` is async. It copies the URL, method and headers, and reads the body as an `ArrayBuffer` (`GET` and `HEAD` have no body). `deserializeRequest` is synchronous and returns a new `Request`.
