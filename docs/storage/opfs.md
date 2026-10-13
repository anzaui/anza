# OPFS

The Origin Private File System tier runs file operations in an inline Web Worker that uses synchronous file access handles. Writes, deletes and clears post a message on a BroadcastChannel so other tabs can react.

## Requirements

OPFS requires a secure context (HTTPS) and browser support for `navigator.storage.getDirectory`. Check with the platform layer:

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.opfs) {
  await storage.set('notes', { text: 'hello' }, 'opfs');
}
```

## Read and Write

```javascript
import { storage } from '@anzaui/anza/storage';

// Write
await storage.set('data.json', { points: [1, 2, 3] }, 'opfs');

// Read
const data = await storage.get('data.json', 'opfs');
```

Values are written with `JSON.stringify` and read back with `JSON.parse`. Binary data (`ArrayBuffer`, typed arrays, `Blob`) does not round-trip; store it in the `idb` tier instead. A missing file reads as `null`.

## Delete and Clear

```javascript
await storage.delete('data.json', 'opfs');
await storage.clear('opfs'); // removes every entry in the OPFS root
```

## Cross-Tab Messages

After a write, delete or clear, the tier posts `{ op, key }` (`op` is `'set'`, `'delete'` or `'clear'`) on the BroadcastChannel `core:opfs-invalidation`. Nothing is invalidated for you; listen on the same channel to react:

```javascript
const channel = new BroadcastChannel('core:opfs-invalidation');
channel.addEventListener('message', (e) => {
  if (e.data.op === 'set' && e.data.key === 'data.json') {
    console.log('File updated in another tab');
  }
});
```

## Web Worker Internals

OPFS operations run in a dedicated inline worker so they do not block the main thread. The worker:

1. Opens the OPFS root directory
2. Creates or opens the file handle (one file per key, in the root)
3. Uses `createSyncAccessHandle` to read or write
4. Encodes values as JSON text with `TextEncoder`

## Locks

File operations are coordinated with `navigator.locks` when available. Each key gets its own named lock (`opfs:{key}`) to prevent concurrent writes. `clear` takes `opfs:global`; `list` takes no lock.
