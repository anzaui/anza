# Pages

`page(route, config, base)` defines a route-bound custom element. It is the primary way to declare navigable views in an Anza application.

---

## Signature

```javascript
page(route, config, base);
```

| `route` | string \| string[] | yes | Dynamic URL pattern(s), e.g. `'/'`, `'/profile/:id'`, or `['/blog', '/blog/:slug']` |
| `config` | object | yes | Page definition (see below) |
| `base` | string | no | `import.meta.url` of the caller; required for file templates |

---

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

### `container`

Single container (back-compat for `via` with one entry):

```javascript
page('/', { tag: 'page-home', container: 'main' });
```

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

### `style`

Inline CSS string. When using file templates, the CSS path goes inside the `template` object.

```javascript
style: ':host { display: block; padding: 1rem; }'
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

### `query`

An array defining the query parameters contract. Mapped parameters are cast and pushed reactively onto the element properties:

```javascript
query: [
  { name: 'tab',    type: String },
  { name: 'search', type: String }
]
```

Visiting `/settings?tab=profile&search=alice` sets `this.tab = 'profile'` and `this.search = 'alice'` on the element instance.

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

### `meta`

Additional metadata passed to the route registry:

```javascript
meta: { analytics: 'checkout' }
```

Available in match results as `result.route.meta`.

---

## Boot Gate

`page()` automatically gates the initial route match on the element's custom element definition:

```javascript
gate(customElements.whenDefined(tag));
```

This means a hard refresh on `/user/42` will wait for `<page-user>` to be defined before running the initial match, eliminating the race condition that plagued earlier router architectures.

---

## Route Registration

`page()` registers the route internally:

```javascript
router.register(route, tag, { via, container: target, ...meta });
```

The tag is both the custom element name and the route handler.

---

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
