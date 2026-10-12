---
title: "Observers"
order: 9
description: "Observer factories in the Anza UI layer: resize, intersection, mutation and performance observers that disconnect when an AbortSignal aborts."
---

# Observers

Wrappers around the browser observer APIs. Each one takes an `AbortSignal` and disconnects when it aborts. Pass `ctrl.signal` from a hook to tie the observer to the element.

## resize

```javascript
import { observe } from '@anzaui/anza/ui';
import { view } from '@anzaui/anza/defs';

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

Default options: `{ childList: true, subtree: false }`. `attributes: true` without `attributeFilter` logs a warning. Inside a component prefer `watch`; use `observe.mutation` for raw records on a root you choose.

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

// Records whose target matches the selector, inside a shadow root (document/body refused)
observe.mutation.scoped(el.shadowRoot, '.row', (matched) => {
  console.log(matched.length, 'row-related records');
}, ctrl.signal);
```

Do not observe `document` with `subtree: true` from a page. Without `ctrl.signal` the observer outlives a soft navigation, and even with it every mutation on the page reaches the callback. Use `watch`, a parent dock or events instead.

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

Calling it after the signal aborted is harmless.

## Signal Already Aborted

If the signal is already aborted when the observer is created, the factory returns a no-op disposer and the observer is never started:

```javascript
const controller = new AbortController();
controller.abort();

const dispose = observe.resize(el, handler, controller.signal);
// returns () => {} — observer never started
```

## Error Handling

Errors thrown by a callback are caught and logged; the observer keeps running:

```text
Error in ResizeObserver callback: ...
```
