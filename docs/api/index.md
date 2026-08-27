# API

The Anza API layer is a baseline-native HTTP client built on `fetch`. It wraps every request in a composable pipeline that handles prefix routing, TTL caching, exponential backoff retries, telemetry events, and graceful error normalization.

It is designed for production: transient network failures self-heal, caches invalidate by glob pattern, uploads report real-time progress, and streams parse NDJSON while preserving backpressure.

---

## What You Get

- **HTTP methods** — `get`, `post`, `put`, `patch`, `delete` with automatic JSON body serialization and response parsing
- **Prefix routing** — register base URLs once, reference endpoints by short path
- **TTL caching** — per-request expiry with `cache-first`, `network-first`, and `stale-while-revalidate` strategies
- **Cache invalidation** — delete by exact URL or glob pattern (`*/user/*`)
- **Telemetry events** — subscribe to `error`, `failed`, `timeout`, `status:xxx`, `type:json`, and per-request scoped events
- **Streaming** — NDJSON async iterables with chunk-level event hooks
- **Upload progress** — precise progress tracking via XMLHttpRequest
- **Retry with jitter** — exponential backoff for transient errors (timeouts, 5xx), instant fail for 4xx
- **Error normalization** — every failure is a `PlatformError` with `code`, `message`, `context`, and `recoverable`

---

## Package

```javascript
import { api } from '@anzaui/anza/api';
```

---

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first request in five minutes |
| [requests.md](requests.md) | HTTP methods, options, body serialization, signals |
| [prefixes.md](prefixes.md) | Base URL routing and path resolution |
| [caching.md](caching.md) | TTL caching, strategies, invalidation |
| [events.md](events.md) | Telemetry events, global and request-scoped listeners |
| [streaming.md](streaming.md) | NDJSON streams and chunk parsing |
| [uploads.md](uploads.md) | File uploads with progress tracking |
| [pipeline.md](pipeline.md) | Outbound and inbound interceptors |
| [errors.md](errors.md) | PlatformError, codes, recovery patterns |
| [advanced.md](advanced.md) | Retry internals, AbortSignal composition, scheduler integration |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

---

## One-File Example

```javascript
import { api } from '@anzaui/anza/api';

// Register a prefix once at bootstrap
api.prefix.add('default', 'https://api.example.com');

// GET with TTL caching
const user = await api.get('/user/profile', { expiry: 60000 });

// POST with JSON body
const post = await api.post('/posts', { title: 'Hello' });

// Listen for 401s globally
api.on('status:401', () => redirectToLogin());

// Stream NDJSON
for await (const chunk of api.stream('/logs')) {
  console.log(chunk);
}
```

---

## Next Steps

- New to the API layer? Start with [quickstart.md](quickstart.md).
- Want caching? Read [caching.md](caching.md) and [prefixes.md](prefixes.md).
- Need real-time data? [streaming.md](streaming.md) and [uploads.md](uploads.md).
- Building middleware? [pipeline.md](pipeline.md) and [events.md](events.md).
- Prefer a single reference page? [api.md](api.md).
