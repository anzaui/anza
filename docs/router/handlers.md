# Handlers

A route handler tells the router what to render when a URL matches. There are exactly six supported shapes. The router never invokes a handler twice — it resolves the tag during matching and runs callbacks during interception.

## The Six Shapes

| Shape | What It Means | Example |
|-------|---------------|---------|
| String | Static custom element tag | `'page-home'` |
| Zero-arg function | Lazy tag factory | `async () => 'page-home'` |
| Function with arguments | Callback handler | `(params, event) => { ... }` |
| `{ tag: string }` | Static tag (object form) | `{ tag: 'page-home' }` |
| `{ load: fn }` | Lazy tag factory (object form) | `{ load: async () => 'page-home' }` |
| `{ handler: fn }` | Callback (object form) | `{ handler: (params, event) => { ... } }` |

## Static Tag

The simplest and most common handler.

```javascript
router.register('/', 'page-home');
```

When `/` matches, the router creates `<page-home>` and mounts it.

## Lazy Tag Factory

Useful for code-splitting: the tag is resolved asynchronously when the route is first matched.

```javascript
router.register('/reports', async () => {
  await import('./pages/reports.js');
  return 'page-reports';
});
```

The factory is called once per match. If it returns a promise, the router awaits it before emitting `found`.

Object form:

```javascript
router.register('/reports', {
  load: async () => {
    await import('./pages/reports.js');
    return 'page-reports';
  }
});
```

## Callback Handler

For routes that need full control over rendering. The callback receives the raw route parameters map (key-value strings) and the Navigation API event.

```javascript
router.register('/external/:url', (params, event) => {
  // params is the raw params map object, e.g. { url: 'https%3A%2F%2Fgoogle.com' }
  window.location.href = decodeURIComponent(params.url);
});
```

Callbacks are never invoked during `match()`. They run only inside the navigation interceptor, wrapped in the view transition.

Object form:

```javascript
router.register('/external/:url', {
  handler: (params, event) => {
    window.location.href = decodeURIComponent(params.url);
  }
});
```

*(Note: While callback handlers receive raw key-value string mappings, `page` and `dock` lifecycle hooks receive cast, ordered parameter and query accessor arrays per their declared contracts).*

## Choosing a Shape

Use a **string** for routes whose element is already defined or will be defined before first match.

Use a **lazy factory** for code-split routes. The router awaits the factory, so the element definition can happen inside the imported module.

Use a **callback** when you need side effects, redirects, or custom rendering logic that does not produce a custom element.

## Internal Resolution

The router resolves handlers in two phases:

1. **Match phase** (`match()`) — resolves tag strings and lazy factories. Callbacks return `null` for the tag since they do not produce an element.
2. **Intercept phase** (`handler()`) — runs callbacks. Tag-based handlers are rendered by the orchestrator.

This separation prevents a callback from running twice.

## Handler Helpers

For advanced use, the internal handler contract is exposed:

```javascript
import { isCallback, resolveTag, runCallback } from '@anzaui/anza/router';

const handler = { load: async () => 'page-home' };

if (isCallback(handler)) {
  // This is a callback — do not try to resolve a tag
} else {
  const tag = await resolveTag(handler);
  // tag === 'page-home'
}
```

These are rarely needed in application code but are useful for middleware and test utilities.
