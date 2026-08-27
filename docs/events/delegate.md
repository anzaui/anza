# Delegate

Event delegation registers one listener on an ancestor element to handle events from matching descendants. It traverses `composedPath()` so it works through shadow DOM boundaries. Component `on` uses the same matcher inside the shadow root ([context](../ui/context.md#on)).

---

## Signature

```javascript
delegate(root, selector, type, handler, options);
```

| Param | Type | Description |
| ------- | ------ | ------------- |
| `root` | EventTarget | The ancestor to listen on |
| `selector` | string | CSS selector for descendant matching |
| `type` | string | Event type |
| `handler` | function | Callback receives `(event, matchedElement)`; `this` is the match |
| `options` | object | `addEventListener` options plus `signal`, `attrs`, `not`, `key`, `scope` |

Returns a disposer function.

---

## Simple

```javascript
import { events } from '@anzaui/anza/events';

const dispose = events.delegate(
  document.body,
  '.btn',
  'click',
  (event, target) => {
    console.log('Button clicked:', target.textContent);
  }
);

dispose();
```

One listener on `document.body` handles all `.btn` clicks, including buttons added dynamically after registration.

### Shadow DOM traversal

```javascript
events.delegate(
  document.body,
  'my-component .action',
  'click',
  (event, target) => {
    // target may be inside a shadow root
  }
);
```

The path stops at the `root` element. Selectors outside the root are not evaluated. Default scope for `events.delegate` is `'path'` (any node in `composedPath()` before `root`).

---

## Advanced

### Precision options

```javascript
events.delegate(root, '.btn', 'click', handler, {
  capture: true,
  signal: controller.signal,
  attrs: {
    'data-action': 'save', // must equal
    'aria-disabled': null  // must be absent
  },
  not: '.ignore',          // skip if match.closest('.ignore') within root
  key: 'toolbar-save',     // second add with same key replaces the first
  scope: 'assigned'        // also match light-DOM nodes assigned into a slot under root
});
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `attrs` | — | Attribute predicates on the matched element |
| `not` | — | Skip when `match.closest(not)` is contained by `root` |
| `key` | — | Dedupe on `(root, type, capture, key)` — replaces prior disposer |
| `scope` | `'path'` | `'path'` = any path node before root; `'assigned'` = also require assigned-slot relationship when used with containment-style matching |

Component `on` defaults `scope` to `'shadow'` (must be inside the shadow tree). Pass `scope: 'assigned'` on `on` when you need slotted light-DOM clicks. Prefer `events.delegate(document, …)` when the root must be the document — do not widen component `on` to `document`.

### AbortSignal cleanup

```javascript
const ctrl = new AbortController();

events.delegate(document.body, '.btn', 'click', handler, {
  signal: ctrl.signal
});

ctrl.abort(); // removes the delegated listener
```

### Handler binding

```javascript
events.delegate(container, '.item', 'click', function (event) {
  console.log(this.textContent); // matched .item
});

events.delegate(container, '.item', 'click', (event, target) => {
  console.log(target.textContent);
});
```

### Selector matching cache

`element.matches()` results are cached in a two-level `WeakMap` shared with component `on`, so repeated events on the same node + selector avoid redundant selector work.

---

## Soft-nav

Always pass `{ signal: ctrl.signal }` (or call the disposer from `unmount`) when registering from a page leaf. Soft-nav aborts only the detached leaf — see [Orphan listeners after soft-nav](troubleshooting.md#orphan-listeners-after-soft-nav).
