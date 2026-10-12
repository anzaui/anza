---
title: "Scheduling"
order: 8
description: "Cooperative scheduling in the Anza UI layer: schedule, scheduleFrame and yield, with AbortSignal support for soft navigation."
---

# Scheduling

Helpers that split work into tasks so the main thread stays responsive. A soft navigation aborts the old page's `ctrl`: pass that signal to these helpers so pending work does not run on a detached tree.

Related: [Transitions](transitions.md), [Lifecycle](lifecycle.md#soft-navigation), [Guards](../platform/guards.md).

## schedule

```javascript
import { ui } from '@anzaui/anza/ui';

ui.schedule(() => {
  renderChunk();
}, ui.Priority.VISIBLE);
```

The second argument is a priority, or `{ priority, signal, delay }`:

| Priority | Fallback latency | Use case |
| -------- | ---------------- | -------- |
| `BLOCKING` / `ui.Priority.BLOCKING` | 0ms | Critical path work |
| `VISIBLE` / `ui.Priority.VISIBLE` | ~16ms | UI updates |
| `BACKGROUND` / `ui.Priority.BACKGROUND` | `requestIdleCallback` | Offscreen / analytics |

Uses `window.scheduler.postTask` when it exists. Otherwise it falls back to `setTimeout` (0 ms for `BLOCKING`, 16 ms for `VISIBLE`) or `requestIdleCallback` (`BACKGROUND`). A `delay` option (ms) is passed through.

Pass an `AbortSignal` so pending work is cancelled when the element disconnects:

```javascript
await ui.schedule(() => indexChunk(), {
  priority: ui.Priority.VISIBLE,
  signal: ctrl.signal
});
```

Already-aborted signals reject with `AbortError` immediately.

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

Returns a promise that resolves with the callback's return value. Pass `{ signal }` to cancel the pending frame on abort.

## yield

Yield control to the browser mid-task:

```javascript
import { ui } from '@anzaui/anza/ui';

async function processLargeDataset(rows, { signal } = {}) {
  for (let i = 0; i < rows.length; i++) {
    process(rows[i]);
    if (i % 100 === 0) {
      await ui.yield({ signal }); // let the browser handle input; rejects on abort
    }
  }
}
```

Uses `window.scheduler.yield()` when it exists, otherwise `setTimeout(..., 0)`. Already-aborted signals reject with `AbortError`.

Platform equivalent without the UI facade: `await guard.yield()` from `@anzaui/anza/platform`.

## When to use each

| Helper | Prefer for |
| ------ | ---------- |
| `schedule()` | Defer non-critical work: analytics, logging, non-urgent rendering |
| `scheduleFrame()` | Layout measurement, animation frame work, visual updates |
| `yield()` | Chunk heavy computation inside loops |

From a page, always pass a signal to unbounded work. Otherwise it keeps running after a soft navigation.

## Soft navigation and AbortSignal

```javascript
import { ui } from '@anzaui/anza/ui';
import { page } from '@anzaui/anza/defs';

page('/reports', {
  tag: 'page-reports',
  via: ['main'],
  template: '<table><tbody ref="body"></tbody></table>',
  on: {
    async load({ refs, ctrl }) {
      const res = await fetch('/api/reports', { signal: ctrl.signal });
      const rows = await res.json();
      for (let i = 0; i < rows.length; i += 50) {
        await ui.schedule(() => {
          for (const row of rows.slice(i, i + 50)) {
            refs.body.insertRow().insertCell().textContent = row.title;
          }
        }, { priority: ui.Priority.BACKGROUND, signal: ctrl.signal });
      }
    }
  }
});
```

When a soft navigation replaces this page, `ctrl.abort()` rejects the pending `schedule`, `scheduleFrame` or `yield` with an `AbortError`. The rejection ends `load`, and the error is logged. Catch it only if you need to clean up.

## Example: chunked rendering

```javascript
import { ui } from '@anzaui/anza/ui';
import { view } from '@anzaui/anza/defs';

function createRow(row) {
  const li = document.createElement('li');
  li.textContent = row.title;
  return li;
}

view('data-grid', {
  props: {
    rows: { type: Array, default: null, reflect: false }
  },
  template: '<ul ref="body"></ul>',
  on: {
    async change({ name, val, refs, ctrl }) {
      if (name !== 'rows' || !val) return;

      refs.body.replaceChildren();
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

The grid renders 50 rows at a time and yields between chunks. Set `grid.rows = [...]` to render. Object and array props need `reflect: false`; see [Props](props.md#attributes).
