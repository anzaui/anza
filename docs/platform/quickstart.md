# Quick Start

Get working with platform detection and polyfills in five minutes.

---

## 1. Check a Capability

```javascript
import { supports } from '@adukiorg/anza/platform';

if (supports.viewTransitions) {
  console.log('View transitions are native');
} else {
  console.log('View transitions unavailable — using fallback');
}
```

Flags are lazily evaluated on first access and cached. Subsequent reads are instant.

---

## 2. Assert a Requirement

```javascript
import { typeGuard } from '@adukiorg/anza/platform';

// Throws if OPFS is not supported
typeGuard('opfs', 'This feature requires file system access');
```

Use `typeGuard` in critical paths where continuing without the feature would be meaningless.

---

## 3. Lazy-Load a Polyfill

```javascript
import { guard } from '@adukiorg/anza/platform';

// Returns native URLPattern or loads the polyfill
const URLPattern = await guard.urlPattern();
const pattern = new URLPattern({ pathname: '/user/:id' });
```

The guard checks native support first. Only if missing does it dynamically import the polyfill.

---

## 4. Use the Scheduler

```javascript
import { guard } from '@adukiorg/anza/platform';

const scheduler = await guard.scheduler();

scheduler.postTask(() => {
  renderCriticalUI();
}, { priority: 'user-blocking' });
```

If native `scheduler` is available, it is returned directly. Otherwise the polyfill is loaded.

---

## 5. Yield in a Loop

```javascript
import { guard } from '@adukiorg/anza/platform';

async function processLargeDataset(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 50 === 0) {
      await guard.yield(); // let the browser breathe
    }
  }
}
```

---

## 6. Escape Overflow (Floating UI)

```javascript
import { guard } from '@adukiorg/anza/platform';

const tip = document.querySelector('#tip');       // [popover="manual"]
const anchor = document.querySelector('#anchor');

const ctrl = await guard.escape(tip, anchor, { placement: 'top', offset: 8 });
ctrl.show();  // Popover top-layer, or fixed fallback — stays in-tree
ctrl.hide();
```

Prefer `ui-tooltip` when you need a ready-made hint. Details: [guards.md#escape](guards.md#escape), [API](api.md#escapeoverflowfloating-anchor-options), [Overlay patterns](../elements/overlay.md).

---

## Complete Working Example

```javascript
import { supports, guard, typeGuard } from '@adukiorg/anza/platform';

// Feature-gated view transition
async function navigate() {
  if (supports.viewTransitions) {
    await document.startViewTransition(() => updateDOM());
  } else {
    updateDOM();
  }
}

// Feature-gated file storage
async function saveFile(data) {
  typeGuard('opfs', 'File storage is required');
  const dir = await navigator.storage.getDirectory();
  const file = await dir.getFileHandle('data.json', { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(data));
  await writable.close();
}

// Lazy URLPattern for routing
async function matchRoute(path) {
  const URLPattern = await guard.urlPattern();
  const pattern = new URLPattern({ pathname: '/user/:id' });
  return pattern.exec({ pathname: path });
}
```
