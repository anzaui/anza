# Routes

A route maps a URL pattern to a handler. The router compiles patterns lazily, sorts them by specificity, and matches against both a fast radix trie and the native URLPattern engine.

---

## Registering a Route

```javascript
import { router } from '@anzaui/anza/router';

router.register('/members/:id', 'page-member');
```

This registers a route that matches `/members/42`, `/members/alice`, and so on. The captured `id` parameter is passed to the matched element as a property.

---

## Route Patterns

The router accepts the following pattern types.

### Static paths

```javascript
router.register('/about', 'page-about');
router.register('/settings/profile', 'page-profile');
```

Static routes have the highest specificity and are checked first.

### Parameters

```javascript
router.register('/members/:id', 'page-member');
router.register('/members/:id/posts/:postId', 'page-post');
```

Parameter values are captured as strings. They can be cast to `Number` by declaring a `params` contract array on the corresponding `page()` or `dock()` definition:

```javascript
page('/members/:id', {
  tag: 'page-member',
  params: [
    { name: 'id', type: Number } // casts to Number automatically
  ]
});
```

### Wildcards

```javascript
router.register('/docs/*', 'page-catchall');
```

A wildcard captures the remainder of the pathname as the `*` parameter.

### Absolute URLs

```javascript
router.register('https://example.com/special', 'page-special');
```

Absolute URL patterns are matched against the full URL rather than just the pathname.

### Modifiers and regex groups

Patterns with optional segments (`:id?`), repeats (`:id+`), or regex groups (`:id(\d+)`) are supported via the URLPattern fallback. They cannot be indexed in the radix trie, so they match via the slower linear scan. For best performance, prefer plain `:param` segments.

---

## Specificity and Ordering

Routes are sorted automatically at registration time:

1. **Static** routes first
2. **Parameterized** routes next
3. **Wildcard** routes last

Within each category, longer patterns win. You do not need to think about registration order.

```javascript
router.register('/members/:id', 'page-member');     // param
router.register('/members/new', 'page-new-member'); // static — wins
router.register('/members/*', 'page-members-list');   // wildcard — fallback
```

A request to `/members/new` matches the static route. A request to `/members/42` matches the parameterized route. A request to `/members/42/posts` matches the wildcard.

---

## The Meta Object

Every route carries a `meta` object that the router uses for layout resolution and parent chains.

```javascript
router.register('/settings/profile', 'page-profile', {
  container: 'main',
  parent: '/settings'
});
```

| Field | Purpose |
|-------|---------|
| `container` | The target container key for the orchestrator to render into |
| `parent` | The parent route pattern; used to build the layout chain |
| `via` | Ordered container chain (root-to-leaf); used by `page()` |

The `meta` object is also available in match results and event payloads.

---

## Parent Chains

Routes can declare a parent to build a nested layout chain. When a route matches, the router walks the parent chain and includes every ancestor in the match result.

```javascript
router.register('/dashboard', 'page-dashboard', {
  container: 'main'
});

router.register('/dashboard/settings', 'page-settings', {
  container: 'main',
  parent: '/dashboard'
});
```

A match for `/dashboard/settings` yields:

```javascript
{
  tag: 'page-settings',
  params: {},
  chain: [
    { route: { ... }, tag: 'page-dashboard', params: {} },
    { route: { ... }, tag: 'page-settings', params: {} }
  ]
}
```

The chain is cycle-guarded. If route A declares parent B and route B declares parent A, the walk stops after the first duplicate instead of looping forever.

---

## Bulk Loading

Register many routes at once from JSON:

```javascript
router.load([
  { pattern: '/', handler: 'page-home', meta: { container: 'main' } },
  { pattern: '/about', handler: 'page-about', meta: { container: 'main' } },
  { pattern: '/user/:id', handler: 'page-user', meta: { container: 'main' } }
]);
```

This is useful for server-generated route manifests and build-time extraction.

---

## Clearing Routes

```javascript
router.clear(); // Removes all registered routes
```

Useful in tests and during teardown.

---

## Inspecting Routes

```javascript
const allRoutes = router.getRoutes();
```

Returns the internal route array. Each entry has `patternStr`, `handler`, `meta`, and `pattern` (the compiled URLPattern, if already resolved).

---

## Manual Matching

You can match a URL without triggering navigation:

```javascript
const result = await router.match('/members/42');
if (result) {
  console.log(result.tag);     // 'page-member'
  console.log(result.params);  // { id: '42' }
  console.log(result.query);   // { search: 'alice' }
  console.log(result.hash);    // '#section-3'
  console.log(result.chain);   // parent chain
}
```

`match()` returns `null` when no route matches. It does not emit events or modify the DOM.

---

## Dual Matching: Trie + URLPattern

The router uses two matching strategies internally:

1. **Radix trie** — O(k) where k is the segment count. Covers static, `:param`, and `*` patterns. Zero allocation during traversal.
2. **URLPattern scan** — linear fallback for patterns the trie cannot express (modifiers, regex groups, absolute URLs).

The trie handles the common case. The scan handles the edge cases. Both resolve to the same match result shape.

---

## Query and Hash

Query parameters and hash are always extracted from the URL, regardless of the route pattern:

```javascript
// Visiting /members/42?tab=posts#bio
const result = await router.match('/members/42?tab=posts#bio');
result.params  // { id: '42' } (raw key-value map from match())
result.query   // { tab: 'posts' } (raw key-value map from match())
result.hash    // '#bio'
```

At navigation time, query parameters can be mapped and cast onto element properties by declaring a `query` contract array in a `page()` or `dock()` definition:

```javascript
page('/members/:id', {
  tag: 'page-member',
  query: [
    { name: 'tab', type: String }
  ]
});
```

When navigating, the router context builder wraps matching parameters and query entries in typed, ordered accessor arrays, exposing getters for first/last elements (e.g. `params.first`, `query.last`). Custom callbacks receive the raw parameter mapping.
