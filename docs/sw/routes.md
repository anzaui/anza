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

| Pattern | Matches |
| ------ | ------- |
| `'*'` | Every request |
| `'/*'` | Any path under the site root |
| `'/api/users/:id'` | `/api/users/42`, `/api/users/abc` |
| `{ pathname: '/items/:id', search: '?tab=*' }` | Object patterns forwarded to `URLPattern` |

## Handle Fetch Events

```javascript
self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

`r.handle(e)` returns `true` if a route matched and `event.respondWith()` was called. Return early to avoid the fallback. Return `false` to let the event fall through to your own handler.

## Advanced Patterns

Use `URLPattern` objects directly for complex matching:

```javascript
r.register(
  { pathname: '/api/:version/*', baseURL: self.location.origin },
  new NetworkFirst('api-v1', { timeout: 2000 })
);
```

The `Router` class normalizes strings into `URLPattern` instances automatically.

## Router API

### `router.register(pattern, strategy)`

Add a route. `pattern` can be a string or `URLPatternInit` object. `strategy` is any object with a `handle(request, event)` method that returns a `Response` or Promise; the router passes the `FetchEvent` so background cache writes can use `event.waitUntil()`.

### `router.handle(event)`

Picks the most specific route matching the request and calls `event.respondWith()`. Returns `true` if matched, `false` otherwise (including non-GET/HEAD requests and event streams).

### `new Router()`

Construct a router instance directly if you need multiple routers for different scopes.
