# Scheduler

The platform scheduler provides prioritized task execution and cooperative yielding. It uses the native `scheduler` API when available, falling back to a microtask/macrotask polyfill.

## Priorities

| Priority | Polyfill runs it as | Use Case |
| ---------- | --------- | ---------- |
| `user-blocking` | Microtask | Critical UI, user input response |
| `user-visible` (default) | `MessageChannel` task | Standard UI updates, API calls |
| `background` | `requestIdleCallback` (2 s timeout), else `setTimeout(0)` | Telemetry, prefetch, logging |

The native scheduler uses the browser's own task queues. Tasks run one at a time, highest priority first.

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

## Delayed Tasks

```javascript
scheduler.postTask(() => {
  showTooltip();
}, { delay: 200 });
```

## Task Cancellation

```javascript
const controller = new AbortController();

scheduler.postTask(() => {
  console.log('This may not run');
}, { signal: controller.signal });

// Cancel before it executes
controller.abort();
```

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

`guard.yield()` calls `scheduler.yield()` on the native scheduler or the polyfill. The polyfill resumes in a new task at the current priority (`user-visible` outside a task). Inside a `user-blocking` polyfill task it resumes in a microtask, which does not let the browser paint. Browsers with a native `scheduler.postTask` but no `scheduler.yield` do not get the polyfill, so `guard.yield()` throws there.

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
