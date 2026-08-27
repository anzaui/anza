# Native Events Usage Guide

The events layer is a thin, memory-safe surface over the platform: a global event
bus built on `EventTarget`, Shadow-DOM-aware delegation, a promise-based single
awaiter, a progressive passive listener, and a registry of standard system event
names. Every subscription supports `AbortSignal` cleanup.

Import from the events entry point:

```javascript
import { events } from '@anzaui/anza/events';
```

Named exports are also available:

```javascript
import { bus, EventBus, delegate, once, listen, names } from '@anzaui/anza/events';
```

## 1. Choosing an API

| Need | Use |
|---|---|
| App-wide pub/sub | `events.emit`, `events.on` (or `bus`) |
| Delegate DOM events | `events.delegate` |
| Await a single event | `events.once` |
| Add one passive-safe listener | `events.listen` |
| Standard event name constants | `events.names` |

## 2. Global bus

```javascript
const ctrl = new AbortController();

// Subscribe (auto-cleans up when the signal aborts); returns a disposer too.
const off = events.on('user:purchased', (event) => {
  const { itemId, price } = event.detail;
}, ctrl.signal);

events.emit('user:purchased', { itemId: 42, price: 9.99 });

off();          // manual teardown
ctrl.abort();   // or signal-based teardown
```

`bus` is an `EventBus extends EventTarget`, so `bus.addEventListener` /
`bus.dispatchEvent` work too; `bus.on` / `bus.emit` are convenience wrappers.

## 3. Standard names

Use the `names` registry instead of raw strings to avoid typos. Connectivity
events are emitted automatically by the offline connectivity monitor.

```javascript
import { events } from '@anzaui/anza/events';

events.on(events.names.connectivity.offline, () => showOfflineBanner());
events.on(events.names.connectivity.online,  () => hideOfflineBanner());
events.on(events.names.auth.signedout,       () => redirectToLogin());
```

Available groups: `auth` (`signedin`, `signedout`, `refreshed`),
`connectivity` (`online`, `offline`), `preference` (`changed`),
`sw` (`updated`, `message`).

## 4. Delegation

`delegate(root, selector, type, handler, options)` attaches a single listener to
`root` and dispatches to descendants matching `selector`. The handler receives
`(event, matchedElement)`. Returns a disposer. Crosses Shadow DOM via
`composedPath()`.

```javascript
const list = document.querySelector('.users');

const dispose = delegate(list, '.delete', 'click', (event, btn) => {
  removeUser(btn.dataset.id);
});
```

## 5. Single awaiter

`once(target, type, options)` resolves a promise with the next matching event.

```javascript
await once(dialog, 'close');
const e = await once(img, 'load', { signal: ctrl.signal });
```

## 6. Passive-safe listener

`listen(target, type, handler, options)` registers a listener and returns a
disposer. Scroll-class events (`touchstart`, `touchmove`, `wheel`, `mousewheel`)
default to `{ passive: true }`; pass `{ passive: false }` to call
`preventDefault()`.

```javascript
const stop = listen(window, 'wheel', () => updateParallax());
listen(el, 'touchmove', onZoom, { passive: false });
```

## 7. Rules

- Pass `ctrl.signal` (or call the returned disposer) so listeners clean up.
- Prefer `events.names.*` constants over string literals.
- Use `delegate` for dynamic lists instead of per-item listeners.
- Dispatch outward from components with `composed: true` custom events.
