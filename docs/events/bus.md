# Bus

The global event bus is a singleton `EventBus` instance built on the native `EventTarget`. It provides typed `emit` and `on` methods for application-wide publish/subscribe.

## Global Bus

```javascript
import { events } from '@anzaui/anza/events';

// Subscribe
const off = events.on('app:theme', (e) => {
  console.log('Theme changed to', e.detail.theme);
});

// Publish
events.emit('app:theme', { theme: 'dark' });

// Unsubscribe
off();
```

## EventBus Class

Create isolated buses for scoped communication:

```javascript
import { EventBus } from '@anzaui/anza/events';

const moduleBus = new EventBus();

moduleBus.on('update', handler);
moduleBus.emit('update', data);
```

Each `EventBus` is an independent `EventTarget`. Events do not leak between instances.

## Event Payload

Listeners receive a `CustomEvent` with `type` and `detail`:

```javascript
events.on('user:action', (e) => {
  console.log(e.type);     // 'user:action'
  console.log(e.detail);   // { action: 'save' }
});
```

## AbortSignal Cleanup

```javascript
const ctrl = new AbortController();

events.on('update', handler, ctrl.signal);

// Later — all listeners on this signal are removed
ctrl.abort();
```

This is the recommended pattern for component-scoped listeners. The bus uses the native `addEventListener({ signal })` API, so cleanup is handled by the browser.

## Manual Disposal

`events.on` returns a disposer function:

```javascript
const off = events.on('update', handler);
off(); // removes just this listener
```

## Using Native EventTarget Methods

The bus is a full `EventTarget`. Use native methods directly if needed:

```javascript
bus.addEventListener('custom', handler);
bus.dispatchEvent(new CustomEvent('custom', { detail: {} }));
bus.removeEventListener('custom', handler);
```

## Listener Order

Listeners fire in registration order. There is no priority system. If order matters, register in the correct sequence.

## Error Handling

Listener errors are not caught by the bus. Wrap handlers to prevent one listener from breaking others:

```javascript
events.on('update', (e) => {
  try {
    process(e.detail);
  } catch (err) {
    console.error('Handler failed:', err);
  }
});
```
