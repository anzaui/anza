# Quota

The quota manager wraps the browser StorageManager API, providing storage estimates, persistence requests, and proactive eviction warnings.

---

## Estimate

```javascript
import { quota } from '@anzaui/anza/storage';

const { usage, quota } = await quota.estimate();
console.log(`Using ${usage} of ${quota} bytes`);
```

Returns `{ usage: 0, quota: 0 }` if the API is unavailable.

---

## Persist

```javascript
const granted = await quota.persist();
console.log('Persistent storage:', granted);
```

Requests the browser to exempt this origin from automatic storage eviction. Returns `false` if unsupported or denied.

---

## Check

```javascript
const warning = await quota.check((data) => {
  console.warn('Storage 80% full:', data);
});
```

Returns `true` if usage exceeds 80% of quota. Triggers the callback and dispatches `quota` events to registered listeners.

---

## Event Listeners

```javascript
const off = quota.onQuotaWarning((data) => {
  showToast('Storage running low');
});

off(); // remove listener
```

---

## Storage Facade Integration

The storage facade calls `quota.check()` before every write. If over 80%, it triggers eviction of expired and then oldest entries.

---

## Platform Detection

Check support before calling:

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.storageManager) {
  const est = await quota.estimate();
}
```
