# Broadcast

Cross-tab messaging via `BroadcastChannel`. Channels are reference-counted: opened on first subscriber, closed when the last subscriber leaves.

## Send

```javascript
import { workers } from '@anzaui/anza/workers';

workers.broadcast('app-event', { type: 'theme-changed', value: 'dark' });
```

Messages are sent from a short-lived peer channel so all subscribers (including in the same tab) receive them.

## Subscribe

```javascript
const off = workers.subscribe('app-event', (data) => {
  console.log('Received:', data);
});

// Later
off();
```

Returns a disposer. The channel auto-closes when the last subscriber disposes.

## AbortSignal Cleanup

```javascript
const ctrl = new AbortController();

workers.subscribe('app-event', handler, ctrl.signal);

// Auto-unsubscribe on abort
ctrl.abort();
```

## Close All

```javascript
workers.clear(); // closes all broadcast channels and terminates all pools
```

## Fallback

If `BroadcastChannel` is unavailable, `broadcast` silently does nothing and `subscribe` returns a no-op disposer.

## Example: Logout All Tabs

```javascript
// In auth module
function logout() {
  workers.broadcast('auth', { action: 'logout' });
}

// In every tab
workers.subscribe('auth', (data) => {
  if (data.action === 'logout') {
    redirectToLogin();
  }
});
```
