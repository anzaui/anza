# Navigation

Programmatic control over the browser history stack. All methods return a `{ committed, finished }` promise pair and degrade gracefully when the Navigation API is unavailable.

---

## Navigate (Push)

Push a new history entry and navigate to a URL:

```javascript
import { router } from '@anzaui/anza/router';

router.navigate('/settings');
router.navigate('/user/42');
```

With state:

```javascript
router.navigate('/settings', { state: { tab: 'profile' } });
```

---

## Replace

Replace the current history entry instead of pushing:

```javascript
router.replace('/settings?tab=profile');
```

Use `replace` for filter updates, search queries, and modal state that should not create new history entries.

---

## Back and Forward

```javascript
router.back();     // go back one step
router.forward();  // go forward one step
```

---

## Go

Traverse by an arbitrary delta:

```javascript
router.go(-2);  // back two steps
router.go(1);   // forward one step
```

---

## Chainable Navigation

The `nav` object provides a fluent chainable API:

```javascript
router.nav.to('/settings')
  .then(() => console.log('committed'))
  .catch(() => console.log('aborted'));
```

---

## History State Inspection

```javascript
// Current entry
const entry = router.current();
console.log(entry.url);     // current URL
console.log(entry.key);     // unique entry key
console.log(entry.index);   // position in the stack

// All entries
const stack = router.entries();
console.log(stack.length);  // history depth

// Can the user go back?
if (router.canBack()) { ... }

// Can the user go forward?
if (router.canForward()) { ... }
```

---

## Auto-Bootstrap

The router attaches itself to the Navigation API automatically when the module loads. You do not need to call `setup()` manually in most cases. It happens inside the module's top-level execution:

```javascript
if (typeof window !== 'undefined') {
  router.setup();
}
```

---

## Manual Setup and Teardown

For SSR, tests, and non-standard environments:

```javascript
// Attach listeners explicitly
router.setup();

// Remove all listeners and reset state
router.destroy();
```

`setup()` is idempotent — calling it multiple times has no effect.

---

## Navigation API Return Shape

Every navigation method returns an object with two promises:

```javascript
const result = router.navigate('/settings');

// Fires when the URL has committed
await result.committed;

// Fires when the transition has finished
await result.finished;
```

If the Navigation API is unavailable, both promises resolve immediately.

---

## Loading UI (soft-nav)

While a soft-nav fetch is in flight (page module, `template.html`, styles), the **leaf** dock shows a loading indicator by default (built-in `.anza-loading` CSS spinner). Hard refresh / boot (`direction: 'load'` or Navigation API `reload`) skips loading so SSG content is not covered.

No dock/page config is required — create apps get the default automatically. Override ladder (highest wins): page `loading` → dock `loading` (leaf→root) → `router.loading.configure` → built-in spinner.

**Bootstrap:** shell `index.html` links `/styles/index.css`, which includes `loading.css`, so spinner styles exist on first load before any soft-nav. Import custom loader elements only when overriding with a tag. `router.loading.ensureStyles()` is a fallback if `loading.css` is omitted.

```javascript
import { dock, page } from '@anzaui/anza/ui';
import { router } from '@anzaui/anza/router';

// Optional — default built-in spinner works with bare dock('main')
dock('content', {
  parent: 'docs',
  loading: { tag: 'ui-spinner' }  // or { html: '...' }, or loading: false
});

page('/docs/:slug', {
  tag: 'page-doc',
  via: ['main', 'docs', 'content'],
  loading: { html: '<p>Loading doc…</p>' },
  template: { html: './doc.html' }
}, import.meta.url);

router.loading.configure({ tag: 'ui-spinner' });
```

Style via `[data-loading]` on the dock host or `.dock-loading` on the injected node. While loading, `[data-loading] > .page-content` is hidden.
