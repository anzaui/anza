# Sync

Keep duplicate browser tabs in navigation sync. When the user navigates in one tab, all other same-origin tabs follow automatically.

## How It Works

The router uses `BroadcastChannel` (`native-router-sync`) to broadcast navigation events. When a `navigatesuccess` fires locally, the current URL and state are posted to the channel. Other tabs receive the message and call `router.navigate()` to follow.

A loop guard prevents echo: the tab that initiated the navigation ignores its own broadcast.

## Auto-Start

Cross-tab sync starts automatically when the module loads, provided `BroadcastChannel` and `window.navigation` are available.

```javascript
// Already running if the APIs exist
if (router.sync.active()) {
  console.log('sync is active');
}
```

## Manual Controls

```javascript
// Start explicitly (idempotent)
router.sync.start();

// Pause broadcasting and listening
router.sync.stop();

// Resume
router.sync.start();

// Stop and close the channel entirely
router.sync.close();
```

## State Synchronization

History state is included in the broadcast:

```javascript
router.navigate('/settings', { state: { tab: 'profile' } });
```

Receiving tabs restore the state along with the URL.

## Echo Guard

A one-macrotask delay prevents the echo guard from clearing too early when a guard-triggered redirect changes the URL:

```javascript
// Tab A navigates to /admin
// Guard redirects to /login
// The redirect URL (/login) differs from the original broadcast (/admin)
// Without the delay, tab A would re-broadcast /login, causing an infinite loop
// The delay gives the redirect time to settle before clearing the echo flag
```

## Browser Support

Requires `BroadcastChannel` and `window.navigation`. Falls back silently when unavailable.

## When to Use

- Multi-tab dashboards
- Admin panels
- Applications where the user expects consistent state across tabs
- Forms that should not diverge between tabs

## When to Disable

- Single-page flows where each tab should be independent
- Applications with heavy per-tab state that should not be overridden

```javascript
router.sync.close();
```
