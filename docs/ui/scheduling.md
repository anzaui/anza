# Scheduling

Cooperative task scheduling for main-thread-friendly work. Prevents long tasks that hurt Interaction to Next Paint (INP).

---

## schedule

```javascript
import { ui } from '@adukiorg/anza/ui';

ui.schedule(() => {
  renderChunk();
}, ui.Priority.VISIBLE);
```

Priorities:

| Priority | Fallback Latency | Use Case |
| ---------- | ----------------- | ---------- |
| `BLOCKING` | 0ms | Critical path work |
| `VISIBLE` | 16ms | UI updates |
| `BACKGROUND` | `requestIdleCallback` | Offscreen work |

Uses `scheduler.postTask` when available, falling back to `setTimeout` or `requestIdleCallback`.

Pass an `AbortSignal` so soft-nav / leaf teardown cancels pending work:

```javascript
await ui.schedule(() => indexChunk(), {
  priority: ui.Priority.VISIBLE,
  signal: ctrl.signal
});
```

Already-aborted signals reject with `AbortError` immediately.

---

## scheduleFrame

Run during the next `requestAnimationFrame`:

```javascript
ui.scheduleFrame(() => {
  measureLayout();
}).then(() => {
  applyStyles();
});

await ui.scheduleFrame(() => measure(), { signal: ctrl.signal });
```

Returns a promise that resolves with the callback's return value. Pass `{ signal }` so soft-nav abort cancels the pending frame.

---

## yield

Yield control to the browser mid-task:

```javascript
import { ui } from '@adukiorg/anza/ui';

async function processLargeDataset(rows, { signal } = {}) {
  for (const row of rows) {
    process(row);
    if (rows.indexOf(row) % 100 === 0) {
      await ui.yield({ signal }); // let the browser breathe; abort on soft-nav
    }
  }
}
```

Uses `scheduler.yield()` when available, falling back to `setTimeout(..., 0)`. Already-aborted signals reject with `AbortError`.

---

## When to Use Each

- **`schedule()`** — defer non-critical work: analytics, logging, non-urgent rendering
- **`scheduleFrame()`** — layout measurement, animation frame work, visual updates
- **`yield()`** — chunk heavy computation inside loops

---

## Example: Chunked Rendering

```javascript
view('data-grid', {
  props: {
    rows: { type: Array, default: [] }
  },
  on: {
    async change({ name, val, refs }) {
      if (name !== 'rows') return;

      refs.body.innerHTML = '';
      const chunkSize = 50;

      for (let i = 0; i < val.length; i += chunkSize) {
        const chunk = val.slice(i, i + chunkSize);
        const fragment = document.createDocumentFragment();
        for (const row of chunk) {
          fragment.appendChild(createRow(row));
        }
        refs.body.appendChild(fragment);
        await ui.yield();
      }
    }
  }
});
```

The grid renders in chunks, yielding between each so the browser stays responsive.
