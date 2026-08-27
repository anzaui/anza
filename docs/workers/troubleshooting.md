# Troubleshooting

Common problems and their solutions.

---

## Pool task never resolves

**Cause:** Worker script not found, or worker does not respond with `{ ok, value }`.

**Fix:** Ensure the worker script exists and uses the correct message contract:

```javascript
// Worker must respond via port
self.onmessage = (e) => {
  const { task, payload, port } = e.data;
  const result = process(payload);
  port.postMessage({ ok: true, value: result });
};
```

---

## Shared worker not sharing

**Cause:** `SharedWorker` unavailable, so fallback to dedicated is used. Dedicated workers do not share state across tabs.

**Fix:** Check `has.shared`:

```javascript
import { has } from '@anzaui/anza/workers';

if (!has.shared) {
  console.warn('SharedWorker not supported — using dedicated fallback');
}
```

---

## Broadcast not received

**Cause:** Subscribing after the broadcast was sent, or different channel names.

**Fix:** Subscribe before broadcasting:

```javascript
const off = workers.subscribe('channel', handler);
workers.broadcast('channel', data); // subscriber receives this
```

Also check that all tabs use the same channel name.

---

## Lock times out

**Cause:** Another tab holds the lock and does not release it.

**Fix:** Use `ifAvailable` to avoid waiting:

```javascript
try {
  await workers.lock('db', fn, { ifAvailable: true });
} catch {
  console.log('Lock busy, skipping');
}
```

Or use `steal` to preempt (use cautiously):

```javascript
await workers.lock('db', fn, { steal: true });
```

---

## OffscreenCanvas fails

**Cause:** Not supported, or canvas already has a context.

**Fix:** Check support and ensure no 2d/webgl context was created on the main thread:

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.offscreenCanvas) {
  // Must transfer BEFORE getting context
  const handle = await workers.offscreen(canvas, '/worker.js');
}
```

---

## Worker pool grows too large

**Cause:** Many concurrent tasks, or `max` not set.

**Fix:** The default max is `hardwareConcurrency - 1`. If you need fewer:

```javascript
workers.run('/worker.js', 'task', {
  // These configure the pool on first use
  max: 2,
  idle: 10000  // reclaim after 10s
});
```

---

## Memory leak with workers

**Cause:** Workers never terminated, or pools not closed.

**Fix:** Call `workers.clear()` on app shutdown:

```javascript
window.addEventListener('pagehide', () => {
  workers.clear();
});
```

Pools auto-terminate on `pagehide`, but explicit cleanup is safer.

---

## Still stuck?

Check feature support:

```javascript
import { has } from '@anzaui/anza/workers';
console.log(has);

// Inspect pool state
console.log('Pool size:', workers.dedicated('/worker.js').size);
```
