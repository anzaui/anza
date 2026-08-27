# Troubleshooting

Common problems and their solutions.

Use this page when the storage facade behaves differently from `state.storage`, when a tier returns `null` unexpectedly, or when browser capability / quota constraints leak into app behavior.

---

## Clash with `state.storage` / `platform-db`

**Cause:** `@anzaui/anza/storage` and `state.storage` (`PlatformStorage`) both default to IndexedDB name `platform-db`.

**Fix:** Configure distinct names before first use:

```javascript
import { storage } from '@anzaui/anza/storage';
import { state } from '@anzaui/anza/state';

storage.configure({ idb: { name: 'app-kv' } });
state.storage.setDatabaseName('app-state');
```

Use `storage` for tiered KV/blobs; use `state.storage` for store persistence. See [state/persist.md](../state/persist.md).

If one package creates object stores and the other later opens the same DB name with a different migration plan, you can end up debugging the wrong abstraction. Separate names early and keep them stable.

---

## storage.get returns null

**Cause:** Key never set, expired, or wrong tier.

**Fix:** Check tier and TTL:

```javascript
// Wrong tier — wrote to 'memory', reading from default 'idb'
await storage.set('temp', data, 'memory');
await storage.get('temp'); // null — reads from idb

// Correct
await storage.get('temp', 'memory');
```

Quick checklist:

- Verify the key was written to the tier you are reading.
- Check whether the key had a TTL and may have expired.
- Remember that default reads use `idb`, fronted by the memory LRU.
- For cache/OPFS flows, confirm the current browser actually supports the tier you selected.

---

## IndexedDB blocked

**Cause:** Another tab has an older version open.

**Fix:** Listen for blocked events and close other tabs:

```javascript
window.addEventListener('storage:blocked', () => {
  alert('Please close other tabs to update storage');
});
```

This event is emitted by the IndexedDB wrapper when an upgrade is waiting on another open connection. Typical triggers are:

- another tab still holding the old DB version open
- a long-lived test/dev tab after you changed migrations
- two apps accidentally sharing the same DB name

If it repeats in development, close stale tabs and hard-reload after the upgrade completes.

---

## OPFS not available

**Cause:** Not a secure context, or browser lacks support.

**Fix:** Check support first:

```javascript
import { supports } from '@anzaui/anza/platform';

if (!supports.opfs) {
  // Fall back to idb
  await storage.set('file', data, 'idb');
}
```

OPFS generally requires a secure context and browser support. If the app must work broadly, decide the fallback tier up front instead of letting writes fail ad hoc.

---

## Data not persisting

**Cause:** Using `memory` tier, or private browsing mode.

**Fix:** Use `idb` or `opfs` for durable storage. Private browsing may disable IndexedDB.

Also remember:

- `storage.clear('all')` always empties the memory LRU first.
- `storage.delete(key)` clears the memory copy even when you target another durable tier.
- Cache-tier values are stored as `Response` bodies; JSON parses back to objects, otherwise you get text.

---

## Compression failed

**Cause:** Compression Streams API unavailable, or non-serializable value.

**Fix:** The facade falls back to uncompressed storage automatically. Check that values are serializable (no circular references, no functions).

Only large IDB writes are candidates for gzip, and only when serialized size exceeds `storage.compressionThreshold` (default `65536`). Compression failure should not lose the write; it should only skip the optimization path.

---

## Quota exceeded

**Cause:** Storage is full.

**Fix:** The facade auto-evicts expired and oldest entries when over 80%. For manual cleanup:

```javascript
await storage.delete('old-key');
```

Or request persistent storage:

```javascript
import { quota } from '@anzaui/anza/storage';
await quota.persist();
```

Or subscribe once and surface pressure in your own UI:

```javascript
import { storage } from '@anzaui/anza/storage';

const dispose = storage.onQuotaWarning(({ usage, quota }) => {
  console.warn('Storage pressure', { usage, quota });
});
```

Automatic eviction first removes expired records, then evicts the least-recently-accessed wrapped IDB entries until usage drops back under the threshold.

---

## Write journal not replaying

**Cause:** `localStorage` is disabled or full.

**Fix:** The journal is a best-effort crash recovery mechanism. Critical writes should be confirmed:

```javascript
await storage.set('critical', data);
const confirmed = await storage.get('critical');
```

The write journal is best-effort crash recovery for IDB writes. It relies on `localStorage`, so it can be unavailable in hardened privacy setups. Treat it as resilience, not as a transactional guarantee.

---

## Still not sure which layer is failing?

Use the smallest possible probe against each tier:

```javascript
await storage.set('probe', { ok: true }, 'memory');
await storage.set('probe', { ok: true }, 'idb');
await storage.set('probe', { ok: true }, 'cache');

console.log(await storage.get('probe', 'memory'));
console.log(await storage.get('probe', 'idb'));
console.log(await storage.get('probe', 'cache'));
```

If memory works but IDB does not, inspect migrations / blocked upgrades / private mode. If IDB works but OPFS does not, it is usually capability or secure-context related.

---

## Still stuck?

Inspect storage state:

```javascript
import { storage } from '@anzaui/anza/storage';

const est = await storage.estimate();
console.log('Usage:', est.usage, 'Quota:', est.quota, 'Persisted:', est.persisted);

const keys = await storage.list('idb');
console.log(keys);
```
