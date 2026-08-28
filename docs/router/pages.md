# Pages

`page(route, config, base)` defines a route-bound custom element. It is the primary way to declare navigable views in an Anza application.

## Signature

```javascript
page(route, config, base);
```

| Argument | Type | Required | Meaning |
| -------- | ---- | -------- | ------- |
| `route` | string \| string[] | yes | Dynamic URL pattern(s), e.g. `'/'`, `'/profile/:id'`, or `['/blog', '/blog/:slug']` |
| `config` | object | yes | Page definition (see below) |
| `base` | string | no | `import.meta.url` of the caller; required for file templates |

### Route forms

`page()` accepts one pattern or several aliases that all mount the same tag:

```javascript
page(['/docs', '/docs/:slug'], {
  tag: 'page-doc',
  via: ['main', 'docs', 'content']
});
```

Use one tag when the screen and lifecycle are shared, and branch inside `params`, `query`, or `hash`. Prefer separate pages when the route trees have different shells or different fallback/error behavior.

## Config Fields

### `tag`

The custom element tag. Must contain a hyphen.

```javascript
page('/', { tag: 'page-home' });
```

### `via`

Ordered container chain, root to leaf. The last entry is the render target.

```javascript
page('/settings/profile', {
  tag: 'page-profile',
  via: ['main', 'sidebar', 'content']
});
```

Soft-nav keeps the ancestors in this chain mounted and swaps only the leaf. That is why docs chrome survives navigation while the page body changes.

### `container`

Single container (back-compat for `via` with one entry):

```javascript
page('/', { tag: 'page-home', container: 'main' });
```

Prefer `via` for new work. `container` is normalized to a one-item chain and cannot express nested chrome.

### `template`

HTML template. Three forms:

**Inline string:**

```javascript
template: '<h1>Home</h1>'
```

**File reference (requires `base`):**

```javascript
template: { html: './home.html', css: './home.css' }
```

**Shadow toggle:**

```javascript
template: { html: './home.html', css: './home.css', shadow: false }
```

Setting `shadow: false` renders into the light DOM instead of a shadow root.

For public/indexable pages, build-time SSG still emits the route HTML contract around the page host. Soft-nav continues to fetch only the page fragment (`index.html` or preserved `template.html`), not the full SSG document. See [SSG contract](../ssg/contract.md).

### `style`

Inline CSS string, a file path, or an array containing CSS strings or stylesheet paths (both relative and root-relative starting with `/`).

```javascript
// Inline CSS
style: ':host { display: block; padding: 1rem; }'

// Single stylesheet path
style: './home.css'

// Multiple stylesheets from any folder
style: ['/styles/shared.css', './home.css']
```

### `props`

Generic reactive properties for the component. For route-specific parameters, use the dedicated `params` and `query` contract arrays.

```javascript
props: {
  theme: { type: String, default: 'light' }
}
```

### `params`

An array defining the path parameter contract. The library casts parameter values automatically to the specified type:

```javascript
params: [
  { name: 'id', type: Number }
]
```

Path parameter values are extracted in order, and pushed reactively onto the element (as attributes/properties) when navigation occurs.

If the route pattern declares `:slug` or `:id`, declare the matching param contract so tooling can warn early when the route and page drift:

```javascript
page('/blog/:slug', {
  tag: 'page-blog-post',
  via: ['main'],
  params: [{ name: 'slug', type: String }]
});
```

### `query`

An array defining the query parameters contract. Mapped parameters are cast and pushed reactively onto the element properties:

```javascript
query: [
  { name: 'tab',    type: String },
  { name: 'search', type: String }
]
```

Visiting `/settings?tab=profile&search=alice` sets `this.tab = 'profile'` and `this.search = 'alice'` on the element instance.

Unlike route params, query keys remain optional by default. Declare the ones your page actually consumes so `change()` receives typed values instead of ad-hoc parsing everywhere.

### `hash`

Declare a `hash` prop to receive the URL hash:

```javascript
props: { hash: { type: String } }
```

Visiting `/settings#section-2` sets `hash = '#section-2'`.

### `on`

Lifecycle hooks:

```javascript
on: {
  load({ el, params, query, raw, hash, ctrl }) {
    // Called once after mount.
    // params and query are ordered accessor arrays:
    const userId = params.id ?? params[0];
    const activeTab = query.tab ?? query[0];
    
    return fetchUser(userId, activeTab);
  },
  connect({ el }) {
    // Called when the element connects to the DOM
  },
  disconnect({ el }) {
    // Called when the element disconnects
  },
  change({ el, name, val }) {
    // Called when a declared prop, param, or query changes
  }
}
```

All hooks receive a context object. The `load` hook receives the route-derived `params` (typed ordered array with `.first`, `.last`, and named segment getters), `query` (typed ordered array with the same getters), `raw` (the raw `URLSearchParams` object), `hash`, and `ctrl` (whose signal aborts if the element disconnects).

`load` may return a promise. The router does not wait for it — the element mounts immediately and the promise resolves asynchronously. Use this for data fetching that should not block rendering.

Pass `ctrl.signal` into any long-lived work that can outlive the page leaf:

```javascript
import { ui } from '@anzaui/anza/ui';

on: {
  async load({ ctrl }) {
    await ui.schedule(() => warmCache(), {
      priority: ui.Priority.BACKGROUND,
      signal: ctrl.signal
    });
  }
}
```

Soft-nav aborts the detached leaf controller. Scheduled work, frame work, and transitions should fail closed rather than mutate a disconnected tree. See [Scheduling](../ui/scheduling.md) and [Transitions](../ui/transitions.md).

### `guard`

Route-scoped navigation guard:

```javascript
page('/checkout', {
  tag: 'page-checkout',
  via: ['main'],
  guard: (destination, controller) => {
    if (!cart.hasItems()) return '/cart';
  }
});
```

See [guards.md](guards.md) for full guard documentation.

### `error`

Optional override when this route matches but the guard or handler throws. Same shapes as dock fallbacks (`{ tag }`, HTML, …). Without it, the resolver still mounts the shared library built-in (or a dock / `configure` override) into the **leaf** dock — you do not need per-route error HTML files.

```javascript
page('/admin/:id', {
  tag: 'page-admin',
  via: ['main'],
  error: { tag: 'page-admin-error' }
});
```

See [fallbacks.md](fallbacks.md) for defaults and the full ladder.

### `ssg`

Optional build-time SSG controls for public routes:

```javascript
page('/docs/ssg/expand/:slug', {
  tag: 'doc-ssg-expand',
  via: ['main', 'docs', 'content'],
  params: [{ name: 'slug', type: String }],
  ssg: {
    expand: [{ slug: 'foo' }]
  }
}, import.meta.url);
```

Use `ssg.expand` only for routes whose concrete param values are known at build time. Unexpanded param patterns stay client-matchable but do not emit `dist/<route>/index.html`. See [SSG overview](../ssg/index.md) and the [SSG contract](../ssg/contract.md).

### Scaffold / generate

`anza generate page <name>` writes `index.js` + HTML/CSS into a page tree and updates the barrel — it does **not** create error-page files. Fallbacks stay by reference on docks/pages. Layout contract: [intro/structure.md](../intro/structure.md).

### `meta`

Additional metadata passed to the route registry:

```javascript
meta: { analytics: 'checkout' }
```

Available in match results as `result.route.meta`.

## How `page()` participates in navigation

| Stage | What `page()` contributes |
| ----- | ------------------------- |
| Registration | Calls `router.register(...)` with the route pattern, resolved tag, and route metadata |
| Boot | Gates the initial match on `customElements.whenDefined(tag)` so refreshes do not race the CE definition |
| Match | Declares the `via` / `container` target and typed `params` / `query` contract |
| Soft-nav | Swaps only the page leaf under the deepest live dock in the route chain |
| Error | May supply a route-scoped `error` override before dock/app/built-in fallbacks |
| SSG | May declare `seo` / `ssg.expand` for build-time HTML emission |

## Soft-nav vs hard refresh

- **Soft-nav** — the router keeps parent docks; only the page leaf inside the leaf dock is swapped (CSR mount when the tag changes). Soft-nav loads the page **fragment** (often `template.html` after Mode A preserves it), never the full SSG document.
- **Hard refresh / full load** — the browser fetches contentful SSG or Mode B HTML (`anza build` and `anza dev`); the client adopts open DSD and must not wipe SEO content. See [ui/hydration.md](../ui/hydration.md).

## Boot Gate

`page()` automatically gates the initial route match on the element's custom element definition:

```javascript
gate(customElements.whenDefined(tag));
```

This means a hard refresh on `/user/42` will wait for `<page-user>` to be defined before running the initial match, eliminating the race condition that plagued earlier router architectures.

## Route Registration

`page()` registers the route internally:

```javascript
router.register(route, tag, { via, container: target, ...meta });
```

The tag is both the custom element name and the route handler.

## Example: Full Page Definition

```javascript
page('/user/:id', {
  tag: 'page-user',
  via: ['main'],
  template: { html: './user.html', css: './user.css' },
  params: [
    { name: 'id', type: Number }
  ],
  query: [
    { name: 'tab', type: String }
  ],
  on: {
    async load({ params }) {
      const user = await fetchUser(params.id);
      this.user = user;
    },
    change({ name, val }) {
      if (name === 'tab') this.refreshTab(val);
    }
  }
}, import.meta.url);
```
