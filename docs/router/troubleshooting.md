# Troubleshooting

Common problems and their solutions.

## Hard refresh shows a blank page

**Cause:** The initial route match fired before custom elements were defined.

**Fix:** Use `page()` instead of manual `router.register()` + `ui.element()`. `page()` automatically gates the boot sequence on element definition.

```javascript
// Correct
page('/', { tag: 'page-home', via: ['main'] });

// Problematic (old pattern)
ui.element('page-home', { url: '/' }); // may race
```

## Container not found

**Error:** `Target container "main" not found in DOM`

**Cause:** The dock has not connected yet, or the name does not match.

**Fix:**

1. Ensure the dock tag matches the name: `dock('main')` creates `<dock-main>`
2. Use `via` chains so the cascade creates missing containers
3. Check for typos in the container name between `via` and `dock()`

```javascript
// Correct
dock('main');
page('/', { tag: 'page-home', via: ['main'] });

// Wrong — 'main' vs 'main-content'
dock('main-content');
page('/', { tag: 'page-home', via: ['main'] }); // mismatch
```

## Singleton violation

**Error:** `ContainerError: Singleton violation — 'main' is already mounted`

**Cause:** Two elements with the same container name are in the DOM at once.

**Fix:** Ensure only one instance of each dock exists. If using conditional rendering, unmount the old instance before mounting the new one.

## Guard redirect not working in Safari

**Cause:** Safari ignores `precommitHandler`.

**Fix:** The router already handles this. Your guard will run post-commit and the router performs a silent replace. No code change needed.

## View transitions not running

**Cause:** Missing VT API, reduced motion, or an explicit opt-out.

**Fix:** Soft-nav still swaps synchronously — no broken UX. Check:

1. Chrome 147+ for **dock** leaf swaps (`Element.prototype.startViewTransition` / `supports.elementViewTransitions`). Docks never fall back to `document.startViewTransition`.
2. Chrome 111+ for document morphs (`ui.transition` / `transitions.run` / `supports.viewTransitions`)
3. `prefers-reduced-motion: reduce`, `transition: false`, or `configureTransitions({ enabled: false })` force a direct swap

See [router/transitions.md](transitions.md) and [ui/transitions.md](../ui/transitions.md).

## Cascade fails on deep link

**Error:** `CascadeError: no path 'body' → 'sidebar'`

**Cause:** The graph does not have a path from the current root to the target.

**Fix:** Ensure every intermediate dock declares its parent:

```javascript
dock('main');
dock('sidebar', { parent: 'main' });     // missing this causes the error
dock('content', { parent: 'sidebar' });
```

## Route not matching

**Cause:** Registration order or pattern specificity.

**Fix:** Check that a more specific static route is not shadowing your parameterized route:

```javascript
router.register('/members/new', 'page-new');   // static — higher specificity
router.register('/members/:id', 'page-member');  // param — lower specificity
// /members/new matches the first route
```

This is correct behavior. Use the match result to debug:

```javascript
const result = await router.match('/members/new');
console.log(result.route.patternStr);
```

## Query params not mapped to properties

**Cause:** Missing or misconfigured `query` contract array in the page or dock config.

**Fix:**

```javascript
page('/search', {
  tag: 'page-search',
  via: ['main'],
  query: [
    { name: 'q', type: String }
  ]
});
```

Without the `query` contract array, the router does not map `?q=hello` onto the element. Make sure the type is defined (e.g. `String` or `Number` for casting).

## Tabs not syncing

**Cause:** `BroadcastChannel` or `window.navigation` is unavailable.

**Fix:** Check browser support. Both are required. The router falls back silently when either is missing.

## Memory leaks in tests

**Cause:** Event listeners and containers persist between tests.

**Fix:** Tear down the router between tests:

```javascript
afterEach(() => {
  router.destroy();
  router.clear();
  router.clearContainers();
  router.guards.clear();
  router.miss.clear();
});
```

## File templates not loading

**Cause:** Missing `import.meta.url` as the third argument.

**Fix:**

```javascript
// Correct
page('/', {
  template: { html: './home.html', css: './home.css' }
}, import.meta.url);

// Wrong — paths cannot be resolved
page('/', {
  template: { html: './home.html', css: './home.css' }
}); // no base
```

## Still stuck?

Check the internal state:

```javascript
// See all routes
console.log(router.getRoutes());

// See if boot has fired
import { ready } from '@anzaui/anza/router';
console.log(ready());

// See the container graph
import { get } from '@anzaui/anza/router';
console.log(get('main'));
```
