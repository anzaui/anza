---
title: "API"
order: 9
---

# API

The Anza API layer is an HTTP client built on `fetch`. Requests from `get`, `post`, `put`, `patch` and `delete` go through a pipeline that handles prefix routing, caching, retries with backoff, telemetry events and error normalization.

Transient failures are retried, cache entries can be deleted by glob pattern, uploads report progress, and streams parse NDJSON.

## What You Get

- **HTTP methods** — `get`, `post`, `put`, `patch`, `delete` with automatic JSON body serialization and response parsing
- **Prefix routing** — register base URLs once, reference endpoints by short path
- **TTL caching** — per-request expiry with `cache-first`, `network-first`, and `stale-while-revalidate` strategies
- **Cache invalidation** — delete by exact URL or glob pattern (`*/user/*`)
- **Telemetry events** — subscribe to `error`, `failed`, `timeout`, `status:xxx`, `type:json`, and per-request scoped events
- **Streaming** — NDJSON async iterables with chunk-level event hooks
- **Upload progress** — progress tracking via XMLHttpRequest
- **Retry with jitter** — exponential backoff for transient errors (timeouts, 5xx), instant fail for 4xx
- **Error normalization** — request and upload failures are `PlatformError`s with `code`, `message`, `context`, and `recoverable`

## Package

```javascript
import { api } from '@anzaui/anza/api';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [Quick Start](quickstart.md) | Your first request in five minutes |
| [Requests](requests.md) | HTTP methods, options, body serialization, signals |
| [Prefixes](prefixes.md) | Base URL routing and path resolution |
| [Caching](caching.md) | TTL caching, strategies, invalidation |
| [Events](events.md) | Telemetry events, global and request-scoped listeners |
| [Streaming](streaming.md) | NDJSON streams and chunk parsing |
| [Uploads](uploads.md) | File uploads with progress tracking |
| [Pipeline](pipeline.md) | Outbound and inbound interceptors |
| [Errors](errors.md) | PlatformError, codes, recovery patterns |
| [Advanced Topics](advanced.md) | Retry internals, AbortSignal composition, scheduler integration |
| [API Reference](api.md) | Complete API reference |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

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
api.on('error', (e) => {
  if (e.detail.error?.context?.status === 401) redirectToLogin();
});

// Stream NDJSON
for await (const chunk of api.stream('/logs')) {
  console.log(chunk);
}
```

## Next Steps

- New to the API layer? Start with [Quick Start](quickstart.md).
- Want caching? Read [Caching](caching.md) and [Prefixes](prefixes.md).
- Need real-time data? [Streaming](streaming.md) and [Uploads](uploads.md).
- Building middleware? [Pipeline](pipeline.md) and [Events](events.md).
- Prefer a single reference page? [API Reference](api.md).
