# Names

The `events.names` object holds string constants for cross-cutting system events. Using them prevents typos.

The library itself emits only the connectivity events (from `@anzaui/anza/offline`, with detail `{ online: boolean }`). The auth, preference and service worker names are reserved constants: your app emits them and chooses the `detail` shape.

## Available Namespaces

### Auth

| Constant | Value |
| ---------- | ------- |
| `events.names.auth.signedin` | `'auth:signedin'` |
| `events.names.auth.signedout` | `'auth:signedout'` |
| `events.names.auth.refreshed` | `'auth:refreshed'` |

```javascript
events.on(events.names.auth.signedin, (e) => {
  console.log('Token:', e.detail.token);
});
```

## Connectivity

| Constant | Value |
| ---------- | ------- |
| `events.names.connectivity.online` | `'connectivity:online'` |
| `events.names.connectivity.offline` | `'connectivity:offline'` |

```javascript
events.on(events.names.connectivity.offline, (e) => {
  showToast('You are offline'); // e.detail is { online: false }
});
```

## Preference

| Constant | Value |
| ---------- | ------- |
| `events.names.preference.changed` | `'preference:changed'` |

```javascript
events.on(events.names.preference.changed, (e) => {
  console.log('Preference changed:', e.detail.key, e.detail.value);
});
```

## Service Worker

| Constant | Value |
| ---------- | ------- |
| `events.names.sw.updated` | `'sw:updated'` |
| `events.names.sw.message` | `'sw:message'` |

```javascript
events.on(events.names.sw.updated, () => {
  showToast('A new version is available. Refresh to update.');
});
```

## Extending

Add your own constants to the registry:

```javascript
export const myNames = {
  cart: {
    added: 'cart:added',
    removed: 'cart:removed'
  }
};
```

Or emit and listen using string literals directly — `events.names` is a convenience, not a requirement.
