# Events

The Anza events layer is a thin, memory-safe wrapper around the DOM EventTarget. It provides a global event bus, high-performance delegation through Shadow DOM boundaries, promise-wrapped single-event awaits, automatic passive defaults for scroll-critical events, and a centralized registry of system event names.

Everything is built on the browser's native `EventTarget` and `CustomEvent`. No polyfills, no heavy abstractions.

---

## What You Get

- **Global event bus** — `events.emit` and `events.on` for application-wide pub/sub
- **Shadow-aware delegation** — `events.delegate` traverses `composedPath()` through nested shadow roots (`attrs` / `not` / `key` / `scope`)
- **Memory-safe listening** — `events.listen` with automatic passive defaults (touch/wheel) and AbortSignal cleanup
- **Promise-wrapped single event** — `events.once` for `await` on a single event
- **System event names** — `events.names.auth.signedin`, `events.names.connectivity.online`, and so on
- **Component `on`** — shadow-scoped delegation with the same matcher; empty registries tear down root listeners ([ui/context](../ui/context.md#on))

---

## Package

```javascript
import { events } from '@anzaui/anza/events';
```

---

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first event in five minutes |
| [bus.md](bus.md) | Global event bus — emit, on, and the EventBus class |
| [delegate.md](delegate.md) | High-performance event delegation through shadow DOM |
| [listen.md](listen.md) | Memory-safe listeners with passive defaults |
| [once.md](once.md) | Promise-wrapped single-event awaits |
| [names.md](names.md) | System event name constants |
| [api.md](api.md) | Complete API reference (incl. `matchInComposedPath` / passive helpers) |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

---

## One-File Example

```javascript
import { events } from '@anzaui/anza/events';

// Global pub/sub
const off = events.on('user:login', (e) => {
  console.log('User logged in:', e.detail);
});

events.emit('user:login', { id: 42 });

// Stop listening
off();

// Await a single event
const click = await events.once(document.body, 'click');
console.log('Clicked at', click.clientX, click.clientY);
```

---

## Next Steps

- New to the events layer? Start with [quickstart.md](quickstart.md).
- Building global pub/sub? Read [bus.md](bus.md).
- Working with shadow DOM? [delegate.md](delegate.md) and component [on](../ui/context.md#on) / [watch](../ui/context.md#watch).
- Need memory-safe cleanup? [listen.md](listen.md), [once.md](once.md), and [soft-nav orphans](troubleshooting.md#orphan-listeners-after-soft-nav).
- Prefer a single reference page? [api.md](api.md).
