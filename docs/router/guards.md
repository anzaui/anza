# Guards

> **Not platform feature-gates.** Navigation guards (`router.guard`, `page({ guard })`) block or redirect navigations. For polyfills and capability checks, see [platform/guards.md](../platform/guards.md).

Guards block or redirect navigation before the DOM changes. They run at two points in the navigation lifecycle: pre-commit (before the URL updates) and post-commit (after, as a Safari fallback).

When a guard **throws**, the router emits `error` with `phase: 'guard'` and renders the **error** fallback leaf (shared library built-in, or a dock / `configure` / route override). See [fallbacks.md](fallbacks.md).

---

## Global Guards

Register a guard that runs on every navigation:

```javascript
import { router } from '@anzaui/anza/router';

const dispose = router.guard(async (destination, controller) => {
  if (destination.url.pathname.startsWith('/admin') && !isAdmin()) {
    return '/login';
  }
});
```

Return a URL string to redirect. Return nothing (or `null`) to allow the navigation.

The guard receives:

- `destination` — the Navigation API destination object with `url`, `key`, `index`, and `sameDocument`
- `controller` — the intercept controller; on modern browsers you can call `controller.redirect(url)` for an atomic pre-commit redirect

Guards are evaluated in registration order. The first guard to return a redirect wins; remaining guards are skipped.

---

## Removing a Guard

`router.guard()` returns a disposer function:

```javascript
const dispose = router.guard(checkAdmin);
// later
dispose(); // removes this guard
```

---

## Clearing All Guards

```javascript
router.guards.clear();
```

Useful in tests and during teardown.

---

## Route-Scoped Guards

When using `page()`, you can declare a guard that only runs when its route matches:

```javascript
page('/checkout', {
  tag: 'page-checkout',
  via: ['main'],
  guard: (destination, controller) => {
    if (!cart.hasItems()) {
      return '/cart';
    }
  }
});
```

Route-scoped guards are internally wrapped in a global guard that checks the destination URL against the route pattern first. If the URL does not match, the guard is silently skipped.

---

## Pre-Commit vs Post-Commit

**Pre-commit** (`precommitHandler`) runs before the browser updates the URL. On Chrome and Firefox, a redirect here is atomic — the user never sees the blocked URL in the address bar.

**Post-commit** runs after the URL has already changed. This is the Safari fallback, since Safari currently ignores `precommitHandler`. If a guard triggers post-commit, the router performs a silent `history: 'replace'` to correct the URL without adding a broken history entry.

Your guard function runs in both phases. You do not need to handle the difference yourself.

---

## Guard Best Practices

Keep guards fast. They run on every navigation, including back/forward traversals.

Do not perform side effects inside guards. A guard should only inspect state and decide whether to allow or redirect.

Use `controller.redirect()` when available for atomic redirects. The router falls back automatically when it is not.

---

## Guard API Reference

```javascript
// Add a global guard
const dispose = router.guard(fn);

// Grouped API
router.guards.add(fn);     // same as router.guard(fn)
router.guards.clear();     // remove all guards
```
