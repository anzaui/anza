# Scheduler

The platform scheduler provides prioritized task execution and cooperative yielding. It uses the native `scheduler` API when available, falling back to a microtask/macrotask polyfill.

---

## Priorities

| Priority | Latency | Use Case |
| ---------- | --------- | ---------- |
| `user-blocking` | Immediate | Critical UI, user input response |
| `user-visible` | ~16ms | Standard UI updates, API calls |
| `background` | `requestIdleCallback` | Telemetry, prefetch, logging |

---

## Posting Tasks

```javascript
import { guard } from '@anzaui/anza/platform';

const scheduler = await guard.scheduler();

// Critical path
scheduler.postTask(() => {
  renderInteractiveButton();
}, { priority: 'user-blocking' });

// Standard work
scheduler.postTask(() => {
  fetchDashboardData();
}, { priority: 'user-visible' });

// Background sync
scheduler.postTask(() => {
  flushAnalyticsQueue();
}, { priority: 'background' });
```

---

## Delayed Tasks

```javascript
scheduler.postTask(() => {
  showTooltip();
}, { delay: 200 });
```

---

## Task Cancellation

```javascript
const controller = new AbortController();

scheduler.postTask(() => {
  console.log('This may not run');
}, { signal: controller.signal });

// Cancel before it executes
controller.abort();
```

---

## Yielding

```javascript
import { guard } from '@anzaui/anza/platform';

async function processItems(items) {
  for (const item of items) {
    render(item);
    await guard.yield(); // let the browser paint
  }
}
```

`guard.yield()` returns a promise that resolves after yielding to the event loop. On browsers with `scheduler.yield()`, it uses the native API. Otherwise it falls back to `setTimeout(..., 0)`.

---

## Chunking Heavy Work

```javascript
async function buildIndex(records) {
  const index = new Map();
  for (let i = 0; i < records.length; i++) {
    index.set(records[i].id, records[i]);
    if (i % 100 === 0) {
      await guard.yield();
    }
  }
  return index;
}
```

Processing 100 records, then yielding, keeps the UI responsive even with thousands of items.
