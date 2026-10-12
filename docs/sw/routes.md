# Routes

URLPattern-based routing inside the Service Worker. Matches incoming `fetch` events against registered patterns and dispatches them to the appropriate caching strategy.

## Create a Router

```javascript
import { router } from '@anzaui/anza/sw';

const r = router();
```

`router()` is a factory that returns a new `Router` instance.

## Register Patterns

```javascript
r.register('/api/users/:id', new NetworkFirst('api-v1'));
r.register('/api/*', new NetworkFirst('api-v1', { timeout: 3000 }));
r.register('*', new StaleRevalidate('shell-v1'));
```

When several patterns match, the **most specific** one wins: catch-alls (`'*'`,
`'/*'`) score lowest, and any other pattern scores by the length of its literal
path, so `/api/users/:id` beats `/api/*`, which beats `'*'`. Ties keep
registration order. `event.respondWith()` is called synchronously.

Only `GET` and `HEAD` requests are routed. Event streams
(`Accept: text/event-stream`) and the dev server's `/hmr` channel are never
intercepted.

## Origins

A pattern matches only requests to the worker's own origin, unless the pattern names an origin. A string pattern never names one, so `'/api/*'` does not match `https://other.example/api/x`. An object pattern names an origin when it has `baseURL`, or a `protocol`, `hostname` or `port` other than `'*'`.

| Pattern | Matches |
| ------ | ------- |
| `'*'` | Every request to the worker's origin |
| `'/*'` | Same as `'*'` |
| `'/api/users/:id'` | `/api/users/42`, `/api/users/abc` on the worker's origin |
| `{ pathname: '/items/:id', search: '?tab=*' }` | Forwarded to `URLPattern`, worker's origin only |
| `{ hostname: 'cdn.example.com', pathname: '/assets/*' }` | `/assets/...` on `cdn.example.com` |

Cross-origin requests that match no route fall through to your own `fetch` handler.

## Handle Fetch Events

```javascript
self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

`r.handle(e)` returns `true` if a route matched and `event.respondWith()` was called. Return early to avoid the fallback. Return `false` to let the event fall through to your own handler.

## Advanced Patterns

Pass a `URLPatternInit` object for complex matching. This one caches a font CDN:

```javascript
r.register(
  { protocol: 'https', hostname: 'fonts.example.com', pathname: '/files/*' },
  new CacheFirst('fonts-v1')
);
```

Strings become `URLPattern({ pathname })`. When `URLPattern` is missing or rejects a pattern, the router uses a small built-in matcher on the path instead, where `*` matches any characters. That matcher checks only the path, not the origin.

Give an origin-naming pattern a path other than `'*'` or `'/*'`. A catch-all path always uses the path-only matcher, so `{ hostname: 'cdn.example.com', pathname: '/*' }` would match every request on every origin.

## Router API

### `router.register(pattern, strategy)`

Add a route. `pattern` can be a string or `URLPatternInit` object. `strategy` is any object with a `handle(request, event)` method that returns a `Response` or Promise; the router passes the `FetchEvent` so background cache writes can use `event.waitUntil()`.

### `router.handle(event)`

Picks the most specific route matching the request and calls `event.respondWith()`. If the strategy throws, the router falls back to `fetch(request)`. Returns `true` if matched, `false` otherwise (including non-GET/HEAD requests, event streams, and cross-origin requests no route names).

### `new Router()`

Construct a router instance directly if you need multiple routers for different scopes.
