# Quick Start

Get working with events in five minutes.

## 1. Global Pub/Sub

```javascript
import { events } from '@anzaui/anza/events';

// Subscribe
const off = events.on('user:login', (e) => {
  console.log('User logged in:', e.detail);
});

// Publish
events.emit('user:login', { id: 42, name: 'Alice' });

// Unsubscribe
off();
```

The event bus is a global singleton. Any module can emit. Any module can listen.

## 2. Per-Request Scoped Listeners

For listeners tied to a component lifecycle, pass an `AbortSignal`:

```javascript
const controller = new AbortController();

events.on('notification', handler, controller.signal);

// Later, when the component unmounts
controller.abort(); // all listeners bound to this signal are removed
```

## 3. Memory-Safe DOM Listener

```javascript
const dispose = events.listen(
  document.querySelector('.btn'),
  'click',
  (e) => console.log('clicked')
);

// Remove manually
dispose();
```

`events.listen` defaults `touchstart`, `touchmove`, `wheel`, and `mousewheel` to `passive: true` automatically. This prevents scroll-blocking and protects INP performance.

## 4. Promise-Wrapped Single Event

```javascript
// Wait for one click, then proceed
const click = await events.once(document.body, 'click');
console.log('Clicked element:', click.target);
```

Useful for one-off interactions: "wait for the user to confirm, then continue."

## 5. Event Delegation

Handle clicks on dynamically added elements:

```javascript
const dispose = events.delegate(
  document.body,
  '.item',
  'click',
  (event, target) => {
    console.log('Item clicked:', target.textContent);
  }
);
```

One listener on `document.body` handles all `.item` clicks, even elements added after the listener is registered. The delegation traverses `composedPath()` so it works through shadow DOM boundaries.

## 6. Use System Event Names

```javascript
import { events } from '@anzaui/anza/events';

events.on(events.names.auth.signedin, (e) => {
  console.log('Auth token refreshed');
});

events.on(events.names.connectivity.offline, () => {
  showToast('You are offline');
});
```

System event names prevent typos and give IDE autocomplete.

## Complete Working Example

```javascript
import { events } from '@anzaui/anza/events';

// Global notifications
events.on('notification', (e) => {
  showToast(e.detail.message);
});

// Auth state
events.on(events.names.auth.signedin, (e) => {
  events.emit('notification', { message: `Welcome, ${e.detail.name}` });
});

// Offline detection
events.listen(window, 'offline', () => {
  events.emit(events.names.connectivity.offline);
});

// One-off confirmation dialog
async function confirmAction() {
  events.emit('notification', { message: 'Are you sure? Click to confirm.' });
  const click = await events.once(document.body, 'click');
  return click.target.matches('.confirm');
}
```
