# OPFS

The Origin Private File System facade offloads operations to an inline Web Worker, leveraging synchronous file access handles for high-performance reads and writes. Cross-tab invalidation is handled via BroadcastChannel.

## Requirements

OPFS requires a secure context (HTTPS) and browser support for `navigator.storage.getDirectory`. Check with the platform layer:

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.opfs) {
  await storage.set('file', buffer, 'opfs');
}
```

## Read and Write

```javascript
import { storage } from '@anzaui/anza/storage';

// Write
const buffer = new Uint8Array([1, 2, 3]);
await storage.set('data.bin', buffer, 'opfs');

// Read
const data = await storage.get('data.bin', 'opfs');
```

Values are JSON-serialized before writing. Binary data should be wrapped in an object or use ArrayBuffer directly.

## Delete and Clear

```javascript
await storage.delete('data.bin', 'opfs');
```

Clear all OPFS entries directly via the internal manager (not exposed through the facade).

## Cross-Tab Invalidation

When an OPFS entry is written or deleted, a BroadcastChannel message invalidates the same key in other tabs:

```javascript
window.addEventListener('message', (e) => {
  if (e.data.op === 'set' && e.data.key === 'data.bin') {
    console.log('File updated in another tab');
  }
});
```

## Web Worker Internals

OPFS operations run in a dedicated inline worker to avoid blocking the main thread. The worker:

1. Opens the OPFS root directory
2. Creates or opens the file handle
3. Uses `createSyncAccessHandle` for fast synchronous I/O
4. Serializes values to JSON via TextEncoder

## Locks

File operations are coordinated with `navigator.locks` when available. Each key gets its own named lock (`opfs:{key}`) to prevent concurrent writes.
