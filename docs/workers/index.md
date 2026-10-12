---
title: "Workers"
order: 13
---

# Workers

The Anza workers layer provides a unified interface for browser concurrency primitives: dedicated worker pools, shared workers, broadcast channels, web locks, and offscreen canvas. It handles feature detection, graceful degradation, and lifecycle management automatically.

## What You Get

- **Worker pools** — bounded, priority-queued task execution with starvation prevention
- **Dedicated workers** — raw background workers with MessageChannel isolation
- **Shared workers** — cross-tab shared state with dedicated fallback
- **Broadcast channels** — reference-counted cross-tab messaging
- **Web locks** — named exclusive/shared locks with timeout and fallback
- **Offscreen canvas** — main-thread canvas rendering offloaded to a worker
- **Feature detection** — `has.worker`, `has.shared`, `has.channel`, etc.

## Package

```javascript
import { workers } from '@anzaui/anza/workers';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [Quick Start](quickstart.md) | Your first worker task in five minutes |
| [Pool](pool.md) | Dedicated worker pools with priority scheduling |
| [Dedicated](dedicated.md) | Raw dedicated workers with MessageChannel isolation |
| [Shared](shared.md) | SharedWorker connections with fallback |
| [Broadcast](broadcast.md) | Cross-tab BroadcastChannel messaging |
| [Locks](locks.md) | Web Locks API with fallback |
| [Offscreen](offscreen.md) | OffscreenCanvas transfer to workers |
| [API Reference](api.md) | Complete API reference |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

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

## Next Steps

- New to workers? Start with [Quick Start](quickstart.md).
- CPU-bound tasks? Read [Pool](pool.md).
- Cross-tab state? [Shared](shared.md) and [Broadcast](broadcast.md).
- Need synchronization? [Locks](locks.md).
- Canvas rendering? [Offscreen](offscreen.md).
- Prefer a single reference page? [API Reference](api.md).
