# Offline & Background Capabilities Usage Guide

The Native Offline layer provides tools for building local-first, network-resilient web applications. It encapsulates reactive connectivity state tracking, crash-resilient IndexedDB task queuing with write-ahead journaling, Web Lock-coordinated manual sync fallbacks, direct Service Worker bridge communication, and monotonic logical Lamport clocks for conflict-free replication.

Import from the offline entry point:

```javascript
import { offline } from '@anzaui/anza/offline';
```

Or import individual components directly:

```javascript
import { check, subscribe, queue, sync, bridge, state, clock } from '@anzaui/anza/offline';
```

---

## 1. Choosing an API

| Need | Use |
| --- | --- |
| Query network connectivity | `check` |
| Subscribe to network status events | `subscribe` |
| Get current network/queue state | `state.get` or `state.snapshot` |
| Subscribe to reactive state updates | `state.subscribe` |
| Enqueue a background sync task | `queue.push` |
| List chronological tasks in the queue | `queue.list` |
| Update task status or retry count | `queue.update` |
| Evict a resolved task from the queue | `queue.delete` |
| Clear the entire offline queue | `queue.clear` |
| Register background sync tags | `sync.register` |
| Coordinate manual fallback sync | `sync.onSyncFallback` |
| Send messages to Service Worker | `bridge.send` or `offline.send` |
| Retrieve client persistent actor ID | `clock.actor` |
| Monotonically tick local clock counter | `clock.tick` |
| Sync local clock against remote time | `clock.sync` |
| Generate logical clock stamp | `clock.stamp` |

---

## 2. Connectivity & State Tracking

The connectivity module handles network status monitoring and reachability checks.

### Checking Connectivity

The `check(force?)` function checks network reachability. It automatically rate-limits HEAD probes to `/favicon.ico` (cached for 10 seconds) to avoid thrashing the network. Pass `true` to bypass throttling.

```javascript
// Perform a throttled connectivity check
const online = await check();

// Force an immediate probe, bypassing the 10s throttling window
const absoluteOnline = await check(true);
```

### Event Subscriptions

Use `subscribe(callback, signal?)` to listen to connectivity status changes. You can pass an optional `AbortSignal` for automated unsubscription.

```javascript
const controller = new AbortController();

const dispose = subscribe((online) => {
  console.log(online ? 'Connected' : 'Disconnected');
}, controller.signal);

// Unsubscribe manually
dispose();

// Or automatically clean up by aborting the controller
controller.abort();
```

### Reactive State Store

The `state` store is a fine-grained `ReactiveStore` keeping track of network connectivity metrics and task queue length:

* `online` (boolean): Whether the client is currently online.
* `status` (string): `'online' | 'offline' | 'unknown'`.
* `pending` (number): Monitored count of uncompleted tasks in the queue.

```javascript
// Subscribe to reactive key mutations
state.subscribe('pending', (count) => {
  console.log(`Pending offline tasks: ${count}`);
});

// Access current state snapshot
const snapshot = state.snapshot();
console.log(`Status: ${snapshot.status}, Online: ${snapshot.online}`);
```

---

## 3. Persistent Task Queue (`OfflineQueue`)

The offline queue is backed by IndexedDB (`platform-offline-queue` / `tasks`). It preserves causal chronological sequencing (FIFO) and is protected by write-ahead journaling.

### Enqueuing Tasks

Use `queue.push(taskName, payload?, options?)` to add tasks to the offline queue. If local client storage usage exceeds 80%, the write is blocked and throws a `QuotaExceededError`.

```javascript
try {
  const taskId = await queue.push(
    'order:submit',
    { itemId: 42, quantity: 2 },
    {
      idempotencyKey: 'order-c104', // Optional: defaults to a random UUID
      maxRetries: 3                  // Optional: defaults to 5
    }
  );
  console.log('Task buffered with ID:', taskId);
} catch (err) {
  if (err.name === 'QuotaExceededError') {
    console.error('Storage full. Clear space before enqueuing.');
  }
}
```

### Managing Tasks

Retrieve, update, and delete tasks from the queue as they are processed:

```javascript
// List all queued tasks sorted chronologically (oldest first)
const tasks = await queue.list();

for (const task of tasks) {
  if (task.failed) {
    console.warn(`Task permanently failed: ${task.error}`);
    await queue.delete(task.id); // Evict from queue
    continue;
  }

  try {
    // Process the task...
    await queue.delete(task.id);
  } catch (err) {
    task.retries++;
    if (task.retries >= task.maxRetries) {
      task.failed = true;
      task.error = err.message;
    }
    await queue.update(task); // Persist updated state
  }
}

// Clear the entire queue
await queue.clear();
```

---

## 4. Background Sync & Fallbacks

The `sync` manager coordinates queue replays using native browser Background Sync or event-driven fallbacks.

### Registering Sync Events

Register sync tags with the Service Worker Background Sync API. On browsers without Background Sync support (e.g. Safari, Firefox), the manager registers a custom window-level online fallback listener.

```javascript
const registered = await sync.register('pending');
if (registered) {
  console.log('Native service worker background sync registered.');
} else {
  console.log('Safari/Firefox fallback online listener registered.');
}
```

### Web Lock Coordinated Fallback

When a fallback online event fires in multi-tab sessions, all tabs simultaneously receive the event. To prevent concurrent database access and duplicate HTTP requests, the callback is automatically coordinated under an exclusive Web Lock named `"offline:sync"`.

Only one active tab will acquire the lock and execute the sync handler:

```javascript
const controller = new AbortController();

const dispose = sync.onSyncFallback(async (tag) => {
  // Awaiting Web Lock 'offline:sync' is handled internally
  console.log(`Replaying queue for tag: ${tag}`);
  
  // Replay tasks chronologically...
}, controller.signal);
```

---

## 5. Service Worker Bridge

The `bridge` facilitates direct message dispatch to the active Service Worker controller using native `MessageChannel` instances for response routing.

```javascript
// Dispatch a task to the service worker and wait for a response
try {
  const result = await bridge.send('cache:precache', {
    urls: ['/index.html', '/styles.css']
  });
  console.log('Precached files successfully:', result);
} catch (err) {
  console.error('Service worker message failed:', err.message);
}

// Shorthand syntax using the offline facade
await offline.send('sync:force');
```

---

## 6. Logical Lamport Clocks

Distributed local-first applications cannot rely on physical clocks due to device clock drift. The `clock` manager implements logical Lamport clocks to stamp offline mutations, ensuring Last-Write-Wins (LWW) resolution is perfectly deterministic.

```javascript
import { clock } from '@anzaui/anza/offline';

// 1. Retrieve the local client's persistent actor UUID
const clientUUID = await clock.actor();

// 2. Monotonically increment and get the local logical clock
const time = await clock.tick();

// 3. Sync the local clock when observing a remote logical counter (e.g. from server response headers)
// Automatically advances the local clock to be greater than the observed remote counter
const syncedTime = await clock.sync(120);

// 4. Generate a combined logical stamp tuple
const stamp = await clock.stamp();
// Returns: { actor: "b9a2-...", clock: 121 }
```

### Deterministic LWW Resolution

Compare logical stamps during data conflict merges:

* The stamp with the higher `clock` counter wins.
* If `clock` counters are equal, the lexicographically greater `actor` UUID acts as the tiebreaker.

---

## 7. Web Component Integration

The offline modules integrate seamlessly with the declarative `@anzaui/anza` UI elements framework. The component's `mount` hook receives an `AbortController` (`ctrl`) that is automatically aborted when the element is disconnected from the DOM, resolving all subscriber memory safety concerns.

```javascript
import { ui } from '@anzaui/anza/ui';
import { check, queue, sync, state } from '@anzaui/anza/offline';

ui.element('offline-status-banner', {
  template: `
    <div class="banner">
      <span class="message"></span>
      <span class="count"></span>
    </div>
  `,
  style: `
    .banner { display: none; padding: 1rem; text-align: center; }
    .banner.active { display: block; }
  `,

  mount({ el, ctrl }) {
    const { signal } = ctrl;
    const container = el.shadowRoot.querySelector('.banner');
    const message = el.shadowRoot.querySelector('.message');
    const countSpan = el.shadowRoot.querySelector('.count');

    // Subscribe to connectivity status changes reactively
    state.subscribe('online', (online) => {
      container.classList.toggle('active', !online);
      message.textContent = online ? '' : 'You are working offline.';
    }, signal);

    // Track pending queue count reactively
    state.subscribe('pending', (count) => {
      countSpan.textContent = count > 0 ? `(${count} changes pending)` : '';
    }, signal);
  }
});
```
