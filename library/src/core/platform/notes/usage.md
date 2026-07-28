# Platform Module — Developer Usage Guide

The `@adukiorg/anza/platform` module acts as a smart, lazy-evaluated browser capability layer and zero-overhead polyfill manager. It exposes simple feature flags, unified asynchronous feature gates, a prioritized task scheduler, leak-proof popovers, and resilient URLPattern pathname matching.

---

## 1. Import System

To keep your client application highly performant and structured, import everything directly from the unified platform specifier:

```javascript
import { supports, guard, reset, typeGuard } from '@adukiorg/anza/platform';
```

---

## 2. Browser Capabilities Matrix (`supports`)

The `supports` object is a lazy-evaluated, cached registry containing 30+ boolean flags for modern HTML5, CSS, Web Cryptography, OPFS, compression, storage managers, and Worker APIs.

### Example Usage

```javascript
import { supports } from '@adukiorg/anza/platform';

// 1. OPFS support
if (supports.opfs) {
  console.log('Origin Private File System is natively supported!');
} else {
  console.log('OPFS absent; using standard IndexedDB storage fallback.');
}

// 2. Storage Persistence capability
if (supports.storagePersistence) {
  navigator.storage.persist().then(granted => {
    console.log(`Durable storage granted: ${granted}`);
  });
}

// 3. Compression Streams capability
if (supports.compression) {
  const compressor = new CompressionStream('gzip');
  console.log('Compression Stream is natively supported!');
}

// 4. Check CSS View Transitions support
if (supports.viewTransitions) {
  document.startViewTransition(() => updateTheDOM());
} else {
  updateTheDOM();
}
```

*Note: For unit testing, you can clear cached lazy-evaluated values using the `reset(flag)` method. This allows mocking feature states dynamically in tests:*

```javascript
import { reset, supports } from '@adukiorg/anza/platform';

// Force urlPattern to false for testing fallback polyfill loading
Object.defineProperty(supports, 'urlPattern', { value: false, configurable: true });

// Run your test assertions here...

// Clear mock value and restore original lazy capability checker
reset('urlPattern');
```

### Runtime Type Guarding

Use `typeGuard` to assert feature support at runtime. It throws an error with a custom message if the feature is not available, making it useful for early-fail checks in critical code paths:

```javascript
import { typeGuard } from '@adukiorg/anza/platform';

// Assert OPFS support before attempting file operations
typeGuard('opfs', 'OPFS is required for this feature');

// Assert Navigation API support before routing
typeGuard('navigationAPI', 'Navigation API is required for routing');

// Custom error message
try {
  typeGuard('viewTransitions', 'View transitions are required for page transitions');
  document.startViewTransition(() => updateDOM());
} catch (err) {
  // Fallback for browsers without view transitions
  updateDOM();
}
```

---

## 3. Dynamic Feature Guards (`guard`)

Asynchronous wrappers that transparently route calls to native browser APIs (if present) or automatically load, bootstrap, and install the lightweight polyfills on demand.

| Guard Method | Returns | Action / Polyfill Fallback |
| --- | --- | --- |
| `await guard.urlPattern()` | `URLPattern` Class | Returns spec-compliant pathname matching template class |
| `await guard.navigation()` | `navigation` Object | Bootstraps the Single Page Application Navigation API polyfill |
| `await guard.popover()` | `undefined` | Installs HTMLElement popover prototype methods & light dismiss |
| `await guard.shadow(root)` | `undefined` | Applies polyfill parser for Declarative Shadow DOM template nodes |
| `await guard.anchor(float, anchor, opts)` | `undefined` | Computes dynamic anchor positioning fallback (`mode: 'fixed'` supported) |
| `await guard.escape(float, anchor, opts)` | `EscapeController` | Overflow-escape show/hide/update (popover top-layer or fixed); used by `ui-tooltip` |
| `escapeOverflow(float, anchor, opts)` | `EscapeController` | Sync form of the escape helper (ensure popover polyfill first if needed) |
| `await guard.sanitizer()` | Sanitizer Wrapper | Exposes uniform `.sanitizeToString(html)` helper |
| `await guard.scheduler()` | `scheduler` Object | Returns priority-aware task execution queues |
| `await guard.yield()` | `Promise<undefined>` | Yields execution thread control back to the event loop |

---

## 4. Prioritized Task Scheduler

When native `globalThis.scheduler` is absent, the polyfill exposes a robust microtask/macrotask priority queue system supporting three priority levels (`user-blocking`, `user-visible`, `background`), delayed scheduling, and task cancellation via `AbortSignal`.

### Prioritized Task Enqueuing

```javascript
import { guard } from '@adukiorg/anza/platform';

const scheduler = await guard.scheduler();

// 1. High priority UI rendering task
scheduler.postTask(() => {
  renderCriticalInteractiveUI();
}, { priority: 'user-blocking' });

// 2. Default priority application logic task
scheduler.postTask(() => {
  fetchFreshStateUpdates();
}, { priority: 'user-visible' });

// 3. Low priority telemetry sync task
scheduler.postTask(() => {
  flushTelemetryLogs();
}, { priority: 'background' });
```

### Delayed Task Execution

```javascript
// Schedule a default priority task to run after 200ms
scheduler.postTask(() => {
  lazyLoadImagePreviews();
}, { delay: 200 });
```

### Task Cancellation via AbortSignal

```javascript
const controller = new AbortController();

scheduler.postTask(() => {
  console.log('This will not execute if aborted in time!');
}, { signal: controller.signal }).catch(err => {
  if (err.name === 'AbortError') {
    console.log('Task successfully cancelled!');
  }
});

// Abort the controller
controller.abort();
```

### Dynamic Event Loop Yielding

Use `guard.yield()` inside complex, long-running loops to split execution into distinct chunks, preventing browser UI freezes and maintaining a 60fps frame rate.

```javascript
import { guard } from '@adukiorg/anza/platform';

async function processMassiveDataset(items) {
  for (let idx = 0; idx < items.length; idx++) {
    computeHeavyItem(items[idx]);
    
    // Yield execution control back to the event loop every 50 operations
    if (idx % 50 === 0) {
      await guard.yield();
    }
  }
}
```

---

## 5. Leak-Proof Popover API

Provides native popover styling (`fixed` viewport positioning, high-tier top-layer simulations), light dismiss clicks, and complete DOM unmount safety to avoid memory leaks.

### Declarative Markup Integration

```html
<!-- Trigger Button -->
<button popovertarget="dropdown-menu" popovertargetaction="toggle">
  Open Dropdown
</button>

<!-- Popover Container Element -->
<div id="dropdown-menu" popover="auto">
  <h3>Dropdown Options</h3>
  <ul>
    <li><a href="/profile">Profile</a></li>
    <li><a href="/settings">Settings</a></li>
  </ul>
</div>
```

### Programmatic API Control

```javascript
const menu = document.getElementById('dropdown-menu');

// Explicitly show the dropdown
menu.showPopover();

// Explicitly hide the dropdown
menu.hidePopover();

// Toggle visibility state
menu.togglePopover();
```

### Memory Safety & Automated Garbage Collection

When a popover is declared with `popover="auto"` or `popover=""`, standard polyfills register global document-level click listener closures, which can trigger severe memory leaks when components are removed or unmounted.

Our polyfill leverages an internal `MutationObserver` on `document.body` to track DOM unmount actions. If a popover element is programmatically removed from the document while open, it **automatically invokes hidePopover(), detaches its global click listeners, and disconnects all MutationObservers**, guaranteeing zero memory leaks:

```javascript
const userMenu = document.createElement('div');
userMenu.setAttribute('popover', 'auto');
document.body.appendChild(userMenu);

userMenu.showPopover();

// Programmatically unmounted from the DOM
userMenu.remove(); // Internally cleans up all global event listeners automatically!
```

---

## 6. Trailing-Slash Resilient URLPattern

Spec-compliant URLPattern pathname parser that extracts named parameters and wildcards, Normalizing trailing slashes seamlessly.

### Segment Parameter & Wildcard Matching

```javascript
import { guard } from '@adukiorg/anza/platform';

const URLPattern = await guard.urlPattern();

// Template matching both '/posts/2026/my-first-post' and '/posts/2026/my-first-post/'
const pattern = new URLPattern({ pathname: '/posts/:year/:slug' });

const result = pattern.exec('https://example.com/posts/2026/my-first-post/');
if (result) {
  const { year, slug } = result.pathname.groups;
  console.log(`Year: ${year}, Slug: ${slug}`); 
  // Output: Year: 2026, Slug: my-first-post
}
```

### Wildcard Segment Extraction

Wildcards are parsed sequentially into indexed string parameter names starting at `'0'`:

```javascript
const filesPattern = new URLPattern({ pathname: '/docs/*' });
const match = filesPattern.exec('/docs/api/platform/usage.pdf');

if (match) {
  const filePath = match.pathname.groups['0'];
  console.log(`File Path: ${filePath}`);
  // Output: File Path: api/platform/usage.pdf
}
```

### Parameter Modifiers

The polyfill supports `?` (optional), `*` (zero-or-more), and `+` (one-or-more) named modifiers:

```javascript
// Match optional member profiles: /member or /member/fescii
const pattern = new URLPattern({ pathname: '/member/:username?' });

const match = pattern.exec('/member/');
console.log(match.pathname.groups.username); // Output: ""
```
