# Locks

The Web Locks API facade provides named exclusive or shared locks with AbortSignal and timeout support. When the Locks API is unavailable, a same-tab promise-chain fallback ensures serial execution.

## Acquire a Lock

```javascript
import { workers } from '@anzaui/anza/workers';

await workers.lock('db:users', async () => {
  await db.save(user);
});
```

The callback runs while holding the lock. Other tabs calling `lock('db:users')` wait.

## Options

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `mode` | string | `'exclusive'` | `'exclusive'` or `'shared'` |
| `signal` | AbortSignal | — | Abort lock acquisition |
| `timeout` | number | — | Timeout in ms |
| `ifAvailable` | boolean | `false` | Fail if lock is not immediately available |
| `steal` | boolean | `false` | Forcibly take the lock from current holder |

## Timeout

```javascript
await workers.lock('db:users', async () => {
  await db.save(user);
}, { timeout: 3000 });
// Throws if lock not acquired within 3 seconds
```

## Shared Mode

```javascript
await workers.lock('cache:read', async () => {
  return cache.get('data');
}, { mode: 'shared' });
```

Multiple shared locks can coexist. Exclusive locks block all other locks.

## Lock Name Conventions

| Prefix | Use Case |
| -------- | ---------- |
| `idb:{store}` | IndexedDB store access |
| `opfs:{file}` | Origin Private File System |
| `auth:{op}` | Authentication operations |
| `sync:{role}` | Background sync |
| `cache:{name}` | Cache invalidation |

## Fallback

When `navigator.locks` is unavailable, a same-tab promise-chain fallback serializes callbacks per lock name. Cross-tab coordination is not possible in fallback mode.

## Example: Leader Election

```javascript
async function becomeLeader() {
  try {
    await workers.lock('sync:leader', async () => {
      // Only one tab holds this lock at a time
      startBackgroundSync();
      // Hold forever (or until page unloads)
      await new Promise(() => {});
    });
  } catch {
    console.log('Another tab is the leader');
  }
}
```
