# Sync

Cross-tab state synchronization via `BroadcastChannel`. When a store key changes in one tab, it is replicated to all other active tabs listening on the same channel.

## Setup

```javascript
import { state } from '@anzaui/anza/state';

const store = state.create({ theme: 'light' });

// Sync the 'theme' key across tabs
store.broadcast('app-sync', ['theme']);
```

## How It Works

1. When `store.set('theme', 'dark')` is called, the sync listener sees the mutation with source `'local'`
2. It posts `{ key: 'theme', value: 'dark' }` to the BroadcastChannel
3. Other tabs receive the message and call `store.set('theme', 'dark', 'broadcast')`
4. The `'broadcast'` source prevents the originating tab from echoing the change back

## Whitelist

Only specified keys are synchronized. An empty array syncs all keys:

```javascript
store.broadcast('app-sync', ['theme', 'language']);
store.broadcast('app-sync', []); // sync all keys
```

## Manual Sync

```javascript
import { sync } from '@anzaui/anza/state';

const dispose = sync(store, ['count'], 'counter-channel');

dispose(); // close the BroadcastChannel
```

## Fallback

If `BroadcastChannel` is unavailable (older browsers, private mode), sync returns a no-op disposer and logs nothing.

## Example: Theme Sync

```javascript
const store = state.create({ theme: 'light' });
store.broadcast('theme-sync', ['theme']);

// In tab A
store.set('theme', 'dark');

// In tab B, the store automatically updates to 'dark'
store.subscribe('theme', (val) => {
  document.body.className = val;
});
```
