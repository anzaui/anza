# Routes

URLPattern-based routing inside the Service Worker. Matches incoming `fetch` events against registered patterns and dispatches them to the appropriate caching strategy.

---

## Create a Router

```javascript
import { router } from '@adukiorg/anza/sw';

const r = router();
```

`router()` is a factory that returns a new `Router` instance.

---

## Register Patterns

```javascript
r.register('*', new CacheFirst('shell-v1'));
r.register('/api/users/:id', new NetworkFirst('api-v1'));
r.register('*', new NetworkOnly());
```

Patterns are matched in order. The first match wins and `event.respondWith()` is called synchronously.

| Pattern | Matches |
| ------ | ------- |
| `'*'` | Every request |
| `'/*'` | Any path under the site root |
| `'/api/users/:id'` | `/api/users/42`, `/api/users/abc` |
| `{ pathname: '/items/:id', search: '?tab=*' }` | Object patterns forwarded to `URLPattern` |

---

## Handle Fetch Events

```javascript
self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

`r.handle(e)` returns `true` if a route matched and `event.respondWith()` was called. Return early to avoid the fallback. Return `false` to let the event fall through to your own handler.

---

## Advanced Patterns

Use `URLPattern` objects directly for complex matching:

```javascript
r.register(
  { pathname: '/api/:version/*', baseURL: self.location.origin },
  new NetworkFirst('api-v1', { timeout: 2000 })
);
```

The `Router` class normalizes strings into `URLPattern` instances automatically.

---

## Router API

### `router.register(pattern, strategy)`

Add a route. `pattern` can be a string or `URLPatternInit` object. `strategy` is any object with a `handle(request)` method that returns a `Response` or Promise.

### `router.handle(event)`

Test the event request against all registered routes in order. Returns `true` if matched, `false` otherwise.

### `new Router()`

Construct a router instance directly if you need multiple routers for different scopes.
