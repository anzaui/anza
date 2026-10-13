# Troubleshooting

Common problems and their solutions.

## supports flag returns wrong value

**Cause:** The flag was cached before a polyfill loaded, or the detection test is environment-dependent.

**Fix:** Clear the cache and retry:

```javascript
import { reset, supports } from '@anzaui/anza/platform';

reset('urlPattern');
console.log(supports.urlPattern); // re-detects
```

## A guard call rejects

**Cause:** The polyfill import failed (network error, CSP block, or bad path). The `guard.*` promise rejects with the import error.

**Fix:** Check the console. The eager bootstrap that runs when the module loads logs an error on failure:

```text
Failed to eagerly bootstrap shadow polyfill: ...
```

Polyfills are loaded with dynamic `import()`. Make sure those files are served and that your CSP allows them.

## typeGuard throws in tests

**Cause:** The test environment (JSDOM, Node) does not support the browser API.

**Fix:** Mock the flag before calling `typeGuard`, or skip the guard in test environments:

```javascript
Object.defineProperty(supports, 'opfs', { value: true, configurable: true });
typeGuard('opfs'); // passes
```

## Scheduler tasks not running

**Cause:** Tasks were aborted before execution, or the polyfill is not loaded.

**Fix:** Check the AbortSignal and verify the polyfill loaded:

```javascript
const scheduler = await guard.scheduler();
console.log(scheduler); // should have postTask and yield
```

## Polyfill conflicts with existing library

**Cause:** Another polyfill (e.g., from a CDN) already defined the API.

**Fix:** The Anza polyfills check for native support before installing. If a third-party polyfill is already present, the Anza guard will use it. To force Anza's polyfill, ensure it loads first:

```javascript
import { guard } from '@anzaui/anza/platform';
// This loads polyfills eagerly if native support is missing
```

## Floating tip clipped by `overflow: hidden`

**Cause:** Absolute CSS positioning inside a clipping ancestor, or missing Popover / escape helper.

**Fix:** Use `ui-tooltip`, or `await guard.escape(float, anchor, opts)` / `escapeOverflow` so the tip uses Popover top-layer (or viewport-fixed fallback). Ensure `[popover]` is set when you want the popover strategy; call `await guard.popover()` before sync `escapeOverflow` in older browsers. See [Guards: escape](guards.md#escape) and [Overlay patterns](../elements/overlay.md).

## Still stuck?

Inspect the full capability matrix:

```javascript
import { supports } from '@anzaui/anza/platform';

for (const key of Object.keys(supports)) {
  console.log(key, supports[key]);
}
```
