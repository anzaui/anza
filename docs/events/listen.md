# Listen

`events.listen` attaches a memory-safe event listener with automatic passive defaults for scroll-critical events. It returns a disposer and supports AbortSignal cleanup.

## Signature

```javascript
listen(target, type, handler, options);
```

| Param | Type | Description |
| ------- | ------ | ------------- |
| `target` | EventTarget | Element, window, document, or bus |
| `type` | string | Event name |
| `handler` | function | Callback |
| `options` | object | `addEventListener` options plus `signal` |

Returns a disposer function.

## Basic Use

```javascript
import { events } from '@anzaui/anza/events';

const dispose = events.listen(
  document.querySelector('.btn'),
  'click',
  (e) => console.log('clicked')
);

dispose(); // remove listener
```

## Automatic Passive Defaults

Touch and wheel events default to `passive: true` to prevent scroll blocking:

| Event | Default Passive |
| ------- | ----------------- |
| `touchstart` | `true` |
| `touchmove` | `true` |
| `wheel` | `true` |
| `mousewheel` | `true` |

Explicit options override the default:

```javascript
events.listen(el, 'touchmove', handler, { passive: false });
```

This is the correct way to opt into blocking behavior when you genuinely need `preventDefault`.

Component `on` uses the **same** passive defaults (touch/wheel only). Click / submit / key handlers are non-passive unless you pass `{ passive: true }`.

## AbortSignal Cleanup

```javascript
const ctrl = new AbortController();

events.listen(window, 'resize', handler, { signal: ctrl.signal });
events.listen(window, 'scroll', handler, { signal: ctrl.signal });

// Remove both at once
ctrl.abort();
```

## Why Use listen Instead of addEventListener?

1. **Automatic passive defaults** — prevents accidental scroll jank
2. **Disposer pattern** — returns a function to remove the listener
3. **AbortSignal support** — native cleanup tied to component lifecycle
4. **Abort guard** — does not attach if the signal is already aborted

## Window and Document Listeners

```javascript
events.listen(window, 'online', () => {
  events.emit(events.names.connectivity.online);
});

events.listen(document, 'visibilitychange', () => {
  console.log('Visible:', !document.hidden);
});
```

## Multiple Listeners, One Disposer

Group listeners under a single AbortController:

```javascript
const ctrl = new AbortController();

events.listen(el, 'mouseenter', onEnter, { signal: ctrl.signal });
events.listen(el, 'mouseleave', onLeave, { signal: ctrl.signal });
events.listen(el, 'click', onClick, { signal: ctrl.signal });

// Cleanup all three
cleanup = () => ctrl.abort();
```
