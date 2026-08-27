# Workers

The Anza workers layer provides a unified interface for browser concurrency primitives: dedicated worker pools, shared workers, broadcast channels, web locks, and offscreen canvas. It handles feature detection, graceful degradation, and lifecycle management automatically.

---

## What You Get

- **Worker pools** — bounded, priority-queued task execution with starvation prevention
- **Dedicated workers** — raw background workers with MessageChannel isolation
- **Shared workers** — cross-tab shared state with dedicated fallback
- **Broadcast channels** — reference-counted cross-tab messaging
- **Web locks** — named exclusive/shared locks with timeout and fallback
- **Offscreen canvas** — main-thread canvas rendering offloaded to a worker
- **Feature detection** — `has.worker`, `has.shared`, `has.channel`, etc.

---

## Package

```javascript
import { workers } from '@anzaui/anza/workers';
```

---

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first worker task in five minutes |
| [pool.md](pool.md) | Dedicated worker pools with priority scheduling |
| [dedicated.md](dedicated.md) | Raw dedicated workers with MessageChannel isolation |
| [shared.md](shared.md) | SharedWorker connections with fallback |
| [broadcast.md](broadcast.md) | Cross-tab BroadcastChannel messaging |
| [locks.md](locks.md) | Web Locks API with fallback |
| [offscreen.md](offscreen.md) | OffscreenCanvas transfer to workers |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

---

## One-File Example

```javascript
import { workers } from '@anzaui/anza/workers';

// Run a CPU task in a worker pool
const result = await workers.run('/workers/sort.js', 'sort', {
  payload: { items: [3, 1, 2] },
  priority: 'user-visible'
});

// Cross-tab broadcast
workers.broadcast('app-event', { type: 'theme-changed' });

// Acquire a lock
await workers.lock('db:write', async () => {
  await saveToDatabase();
});
```

---

## Next Steps

- New to workers? Start with [quickstart.md](quickstart.md).
- CPU-bound tasks? Read [pool.md](pool.md).
- Cross-tab state? [shared.md](shared.md) and [broadcast.md](broadcast.md).
- Need synchronization? [locks.md](locks.md).
- Canvas rendering? [offscreen.md](offscreen.md).
- Prefer a single reference page? [api.md](api.md).
