# Advanced Topics

Internals, edge cases, and extension points for developers who need to understand or modify the router.

---

## Boot Gate

The router's initial match does not fire immediately. It waits for:

1. `DOMContentLoaded` (or immediate execution if already loaded)
2. All registered prerequisite promises to settle

Prerequisites are registered with `gate()`:

```javascript
import { gate } from '@adukiorg/anza/router';

gate(customElements.whenDefined('page-home'));
gate(someAsyncSetup());
```

`page()` and `dock()` automatically gate on their element definitions. This means a hard refresh on `/user/42` waits for `<page-user>` to be defined before matching.

The boot sequence is idempotent. `ready()` returns `true` once it has fired:

```javascript
import { ready } from '@adukiorg/anza/router';
if (ready()) { /* boot has completed */ }
```

`reset()` clears all state for test isolation:

```javascript
import { reset } from '@adukiorg/anza/router';
reset();
```

---

## Radix Trie Matcher

The router uses a radix trie for O(k) matching where k is the segment count:

```javascript
// Fast path — trie handles this
'/members/:id'
'/docs/*'
'/about'

// Fallback — URLPattern scan handles these
'/members/:id?'
'/members/:id+('
'https://example.com/special'
```

The trie stores three kinds of children per node:

- `static` — literal segment string
- `param` — `:named` segment
- `wild` — `*` catchall

Walk order is static → param → wild, matching specificity order. The trie returns `{ route, params }` on hit. Params are decoded with `decodeURIComponent`.

These matched `params` are raw key-value string mappings. During navigation, the router interceptor looks up the component's contract in the `specRegistry` to parse and cast these raw values into typed, ordered accessor arrays (`params` and `query`) passed to the component lifecycle.

---

## Handler Contract

The internal handler resolution contract separates tag resolution from callback execution:

```javascript
// Match phase — safe to call repeatedly
const tag = await resolveTag(handler);

// Intercept phase — only runs once per navigation
if (isCallback(handler)) {
  await runCallback(handler, params, event);
}
```

This prevents callbacks from running twice, which was a bug in earlier architectures where `match()` and `intercept()` both invoked function handlers.

---

## Cycle-Guarded Parent Chains

The parent chain walk in `finalize()` guards against misconfigured cycles:

```javascript
const visited = new Set();
while (currentRoute) {
  if (visited.has(currentRoute.patternStr)) break; // cycle detected
  visited.add(currentRoute.patternStr);
  // ... walk to parent
}
```

If route A declares parent B and route B declares parent A, the loop stops at the first duplicate instead of hanging.

---

## Container Graph Internals

The graph stores nodes in a `Map<string, Node>`. Each node:

```javascript
{
  name,      // registry key
  ref,       // WeakRef<Element>
  parent,    // Node | null
  children,  // Set<Node>
  depth      // number
}
```

The virtual root `'body'` always exists. When a node is garbage-collected, a `FinalizationRegistry` prunes it from the tree and reparents its children to its parent.

Explicit unregistrations mark the name in a `gone` set for one macrotask, so a lookup during teardown does not accidentally resolve to a stale querySelector result.

---

## Cascade Frame Yielding

`cascade.js` yields one `requestAnimationFrame` between each mount so `connectedCallback` can fire and self-register:

```javascript
function frame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
```

This is what makes sequential container mounting work. Each dock has time to register in the graph before the next dock is created.

---

## Safari Precommit Fallback

Safari currently ignores `precommitHandler` on the Navigation API. The router runs guards in both phases:

1. **Pre-commit** — on Chrome/Firefox, redirect is atomic before URL changes
2. **Post-commit** — on Safari, if a guard fires, the router does a silent `history: 'replace'` to correct the URL without adding broken history entries

Your guard functions run identically in both phases. You do not need Safari-specific code.

---

## Extending the Router

The router facade is a plain object. You can attach middleware:

```javascript
const originalRegister = router.register;
router.register = (pattern, handler, meta) => {
  console.log('registering', pattern);
  return originalRegister(pattern, handler, meta);
};
```

For deeper extension, import internal modules directly:

```javascript
import { register, match } from '@adukiorg/anza/router/match';
import { addGuard } from '@adukiorg/anza/router/intercept';
```

---

## SSR Considerations

The router checks `typeof window !== 'undefined'` before touching DOM APIs. On the server:

- Registration works (`register`, `load`, `clear`)
- Matching works (`match`)
- Container and history APIs return safe fallbacks
- The boot gate never fires (no `document`)
- `setup()` is a no-op

For server-side rendering, register routes during build or server startup, then use `match()` to resolve the requested URL to a tag string for rendering.
