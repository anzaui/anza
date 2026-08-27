# Scheduling

Cooperative task scheduling for main-thread-friendly work. Prevents long tasks that hurt Interaction to Next Paint (INP). Soft-nav aborts the leaf’s `ctrl` — pass that signal into schedule helpers so pending work does not run on a detached tree.

Related: [transitions.md](transitions.md) (VT + `AbortSignal`), [lifecycle.md](lifecycle.md) (soft-nav abort contract), platform [`guard.scheduler` / `guard.yield`](../platform/guards.md).

---

## schedule

```javascript
import { ui } from '@anzaui/anza/ui';

ui.schedule(() => {
  renderChunk();
}, ui.Priority.VISIBLE);
```

Priorities (also accepted as `{ priority, signal }`):

| Priority | Fallback latency | Use case |
| -------- | ---------------- | -------- |
| `BLOCKING` / `ui.Priority.BLOCKING` | 0ms | Critical path work |
| `VISIBLE` / `ui.Priority.VISIBLE` | ~16ms | UI updates |
| `BACKGROUND` / `ui.Priority.BACKGROUND` | `requestIdleCallback` | Offscreen / analytics |

Uses `scheduler.postTask` when available (via platform guard), falling back to `setTimeout` or `requestIdleCallback`.

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
import { ui } from '@anzaui/anza/ui';

async function processLargeDataset(rows, { signal } = {}) {
  for (let i = 0; i < rows.length; i++) {
    process(rows[i]);
    if (i % 100 === 0) {
      await ui.yield({ signal }); // let the browser breathe; abort on soft-nav
    }
  }
}
```

Uses `scheduler.yield()` when available, falling back to `setTimeout(..., 0)`. Already-aborted signals reject with `AbortError`.

Platform equivalent without the UI facade: `await guard.yield()` from `@anzaui/anza/platform`.

---

## When to use each

| Helper | Prefer for |
| ------ | ---------- |
| `schedule()` | Defer non-critical work: analytics, logging, non-urgent rendering |
| `scheduleFrame()` | Layout measurement, animation frame work, visual updates |
| `yield()` | Chunk heavy computation inside loops |

Do **not** schedule unbounded work without a signal from a page leaf — soft-nav will leave orphan tasks otherwise.

---

## Soft-nav + AbortSignal (advanced)

```javascript
page('/reports', {
  tag: 'page-reports',
  via: ['main'],
  on: {
    async load({ el, ctrl }) {
      await ui.schedule(() => buildIndex(el.rows), {
        priority: ui.Priority.BACKGROUND,
        signal: ctrl.signal
      });
    },
    async change({ name, val, refs, ctrl }) {
      if (name !== 'rows') return;
      refs.body.replaceChildren();
      for (let i = 0; i < val.length; i += 50) {
        refs.body.append(...val.slice(i, i + 50).map(createRow));
        await ui.yield({ signal: ctrl.signal });
      }
    }
  }
});
```

When soft-nav swaps this leaf, `ctrl.abort()` rejects pending `schedule` / `scheduleFrame` / `yield` with `AbortError`. Catch only if you need cleanup; otherwise let it fail closed.

---

## Example: chunked rendering

```javascript
view('data-grid', {
  props: {
    rows: { type: Array, default: [] }
  },
  on: {
    async change({ name, val, refs, ctrl }) {
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
        await ui.yield({ signal: ctrl.signal });
      }
    }
  }
});
```

The grid renders in chunks, yielding between each so the browser stays responsive — and soft-nav abort stops mid-chunk.
