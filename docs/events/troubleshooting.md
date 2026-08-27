# Troubleshooting

Common problems and their solutions.

---

## Listener not firing

**Cause:** Wrong event name, or listener attached after emit.

**Fix:** Check spelling and registration order:

```javascript
// Correct — listen first, emit second
events.on('update', handler);
events.emit('update', data);

// Wrong — emit before listener is registered
events.emit('update', data);
events.on('update', handler); // missed it
```

---

## Memory leak with global listeners

**Cause:** Listeners registered without cleanup.

**Fix:** Use disposers or AbortSignal:

```javascript
// Manual cleanup
const off = events.on('update', handler);
off();

// Auto-cleanup
const ctrl = new AbortController();
events.on('update', handler, ctrl.signal);
ctrl.abort();
```

---

## Delegation not matching shadow DOM elements

**Cause:** The selector does not match any element in `composedPath()`.

**Fix:** Ensure the selector targets the actual event target or an ancestor in the path. The delegation stops at the root element.

```javascript
// If the click happens on <span> inside <my-el> inside <body>
// composedPath() is [span, my-el, body, html, document, window]

events.delegate(document.body, 'span', 'click', handler); // matches
events.delegate(document.body, 'my-el', 'click', handler);   // matches
events.delegate(document.body, 'div', 'click', handler);    // no match
```

---

## Passive event warning

**Warning:** `Unable to preventDefault inside passive event listener`

**Cause:** `touchstart`, `touchmove`, `wheel`, or `mousewheel` listener is passive by default (`events.listen` and component `on`).

**Fix:** Override the default explicitly if you need `preventDefault`:

```javascript
events.listen(el, 'touchmove', handler, { passive: false });
on.touchmove('.scroller', handler, { passive: false });
```

Only do this when you genuinely need to block scrolling. Default passive is correct for most use cases. Click / submit / key handlers are non-passive by default.

---

## Orphan listeners after soft-nav

**Cause:** Leaf page attached `document.addEventListener` or a `MutationObserver` without `{ signal: ctrl.signal }` (or a disposer called from `unmount`). Soft-nav swaps the leaf via `replaceChildren` / `swapView`; only `disconnectedCallback` → `ctrl.abort()` tears down leaf-owned work.

**Fix:** Prefer component `on` / `watch`, or pass `ctrl.signal` to `events.listen` / `events.delegate` / `ui.observe.*`. Do not observe `document` / `body` from a leaf for component concerns.

Framework-owned document attachments are registered in the internal `globals` registry (`router.nav-click`, `router.container-mo`, `popover.*`). Soft-nav must not grow that set — `globals.count()` stays stable across leaf swaps.

For overlay kit ownership (in-tree top-layer vs toast body portal): [Overlay patterns](../elements/overlay.md).

---

## MutationObserver thrash

**Cause:** `watch.tree` or `watch.attr(..., '*')` on a busy subtree, or one shared observer that used to coarsen all registrations.

**Fix:** Prefer `watch.attr(ref, 'open', …)` / `watch.kids(list, …)` with named filters. Observers are bucketed by fingerprint so a wide watch cannot drop `attributeFilter` on a neighbor. Avoid `ui.observe.mutation(document, …, { subtree: true })` — use a scoped root.

---

## once() promise never resolves

**Cause:** Event never fires, or signal aborted.

**Fix:** Check that the event can actually fire on the target:

```javascript
// Correct — document receives click events
await events.once(document, 'click');

// Wrong — a detached element never receives events
const el = document.createElement('div');
await events.once(el, 'click'); // never resolves
```

---

## AbortSignal not cleaning up

**Cause:** Signal was created but never aborted.

**Fix:** Ensure the signal aborts when the component unmounts:

```javascript
// Correct
mount({ ctrl }) {
  events.on('update', handler, ctrl.signal);
}
// ctrl.abort() called on unmount

// Wrong — signal never aborted
const ctrl = new AbortController();
events.on('update', handler, ctrl.signal);
// ctrl.abort() never called
```

---

## EventBus events leaking between modules

**Cause:** Using the global bus for module-scoped communication.

**Fix:** Create isolated buses for module scope:

```javascript
import { EventBus } from '@anzaui/anza/events';

const moduleBus = new EventBus();
moduleBus.on('internal', handler);
```

Only use `events.emit` and `events.on` for truly global events.

---

## Still stuck?

Debug the event flow:

```javascript
// Log every event on the bus
events.on('*', (e) => {
  console.log('Event:', e.type, e.detail);
});

// Check active listeners (not exposed — use native methods)
bus.addEventListener('debug', (e) => console.log(e));
```
