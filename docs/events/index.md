---
title: "Events"
order: 10
---

# Events

The Anza events layer is a thin, memory-safe wrapper around the DOM EventTarget. It provides a global event bus, event delegation through Shadow DOM boundaries, promise-wrapped single-event awaits, automatic passive defaults for scroll-critical events, and a centralized registry of system event names.

Everything is built on the browser's native `EventTarget` and `CustomEvent`. No polyfills.

## What You Get

- **Global event bus** — `events.emit` and `events.on` for application-wide pub/sub
- **Shadow-aware delegation** — `events.delegate` traverses `composedPath()` through nested shadow roots (`attrs` / `not` / `key` / `scope`)
- **Memory-safe listening** — `events.listen` with automatic passive defaults (touch/wheel) and AbortSignal cleanup
- **Promise-wrapped single event** — `events.once` for `await` on a single event
- **System event names** — `events.names.auth.signedin`, `events.names.connectivity.online`, and so on
- **Component `on`** — shadow-scoped delegation with the same matcher; empty registries tear down root listeners ([ui/context](../ui/context.md#on))

## Package

```javascript
import { events } from '@anzaui/anza/events';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [Quick Start](quickstart.md) | Your first event in five minutes |
| [Bus](bus.md) | Global event bus — emit, on, and the EventBus class |
| [Delegate](delegate.md) | High-performance event delegation through shadow DOM |
| [Listen](listen.md) | Memory-safe listeners with passive defaults |
| [Once](once.md) | Promise-wrapped single-event awaits |
| [Names](names.md) | System event name constants |
| [API Reference](api.md) | Complete API reference (incl. `matchInComposedPath` / passive helpers) |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

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

## Next Steps

- New to the events layer? Start with [Quick Start](quickstart.md).
- Building global pub/sub? Read [Bus](bus.md).
- Working with shadow DOM? [Delegate](delegate.md) and component [on](../ui/context.md#on) / [watch](../ui/context.md#watch).
- Need memory-safe cleanup? [Listen](listen.md), [Once](once.md), and [soft-nav orphans](troubleshooting.md#orphan-listeners-after-soft-nav).
- Prefer a single reference page? [API Reference](api.md).
