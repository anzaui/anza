# Observers

Safe wrappers around browser observer APIs. Each observer is automatically disconnected when the provided `AbortSignal` aborts, preventing memory leaks.

## resize

```javascript
import { observe } from '@anzaui/anza/ui';

view('responsive-box', {
  on: {
    connect({ el, ctrl }) {
      observe.resize(el, (entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          el.classList.toggle('compact', width < 400);
        }
      }, ctrl.signal);
    }
  }
});
```

## intersection

```javascript
view('lazy-image', {
  template: '<img ref="img" data-src="photo.jpg" loading="lazy">',
  on: {
    connect({ refs, ctrl }) {
      observe.intersection(refs.img, (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            refs.img.src = refs.img.dataset.src;
          }
        }
      }, ctrl.signal, { rootMargin: '100px' });
    }
  }
});
```

## mutation

Safe default is `{ childList: true, subtree: false }`. Prefer component `watch.*` inside a shadow; use `observe.mutation` when you need a raw record stream on an explicit root.

### Simple

```javascript
view('live-list', {
  on: {
    connect({ el, ctrl }) {
      observe.mutation(el.shadowRoot, (mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList') {
            console.log('Children changed');
          }
        }
      }, ctrl.signal); // childList only, no subtree
    }
  }
});
```

### Advanced

```javascript
import { observe } from '@anzaui/anza/ui';

// Narrow attribute watch — always pass attributeFilter when attributes: true
observe.mutation(panel, (records) => {
  for (const r of records) {
    if (r.attributeName === 'open') sync(panel);
  }
}, ctrl.signal, {
  attributes: true,
  attributeFilter: ['open'],
  childList: false
});

// Selector filter inside a shadow (refuses document/body)
observe.mutation.scoped(el.shadowRoot, '.row', (matched) => {
  console.log(matched.length, 'row-related records');
}, ctrl.signal);
```

Avoid `observe.mutation(document, …, { subtree: true })` from leaf pages — soft-nav will not clean it up unless you pass `{ signal: ctrl.signal }` (and even then, observing `document` from a leaf is an anti-pattern). Prefer parent docks, events, or `watch`.

## performance

```javascript
view('perf-tracker', {
  on: {
    connect({ ctrl }) {
      observe.performance(['measure', 'navigation'], (list) => {
        for (const entry of list.getEntries()) {
          console.log(entry.name, entry.duration);
        }
      }, ctrl.signal);
    }
  }
});
```

## Return Value

Each observer factory returns a disposer function:

```javascript
const dispose = observe.resize(el, handler, signal);
dispose(); // disconnect manually
```

If the signal aborts first, the disposer is a no-op (no double-disconnect).

## Signal Already Aborted

If the signal is already aborted when the observer is created, the factory returns a no-op disposer and the observer is never started:

```javascript
const controller = new AbortController();
controller.abort();

const dispose = observe.resize(el, handler, controller.signal);
// returns () => {} — observer never started
```

## Error Handling

Observer callbacks are wrapped in try-catch. Errors are logged to console but do not crash the observer:

```text
Error in ResizeObserver callback: ...
```
