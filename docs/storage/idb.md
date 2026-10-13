# IndexedDB

The IndexedDB adapter provides a Promise-based interface over the legacy IDBRequest API. It supports schema migrations, multi-store transactions, and cursor-based queries.

## Database

```javascript
import { Database } from '@anzaui/anza/storage';

const db = new Database('my-app', 1, [
  (db) => db.createObjectStore('users')    // v1
]);
```

## Migrations

Migration functions run in order inside `onupgradeneeded`:

```javascript
const db = new Database('my-app', 3, [
  (db) => {
    // v1: create the store and its index together
    const users = db.createObjectStore('users');
    users.createIndex('email', 'email', { unique: true });
  },
  (db) => db.createObjectStore('settings'),     // v2
  (db) => db.createObjectStore('logs')          // v3
]);
```

Each function corresponds to one version step (0→1, 1→2, 2→3). Migrations receive only the `IDBDatabase`, not the upgrade transaction, so add indexes when you create a store. A migration that throws is logged and skipped; the upgrade continues.

## CRUD Operations

```javascript
await db.set('users', 'alice', { name: 'Alice', email: 'a@x.com' });
const user = await db.get('users', 'alice');
await db.delete('users', 'alice');
```

## Transactions

```javascript
const result = await db.transaction(['users', 'logs'], 'readwrite', (store, tx) => {
  store('users').put({ name: 'Alice' }, 'alice');
  store('logs').put({ action: 'signup' }, Date.now());
  return 'done';
});
```

The callback receives a store accessor and the `IDBTransaction`. The promise resolves with the callback's return value once the transaction completes. A thrown error or rejected promise aborts the transaction. An async callback must only await IndexedDB work: awaiting anything else lets the transaction commit early.

## Queries

```javascript
// All records
const all = await db.getAll('users');

// Filtered via cursor
const active = await db.query('users', {
  index: 'email',
  range: IDBKeyRange.bound('a', 'b'),
  direction: 'next',
  limit: 10
});
```

Query options: `index`, `range`, `direction` (an `IDBCursorDirection`, default `'next'`), `limit`. Returns record values.

`db.close()` closes the connection. `get` returns `null` for a missing key.

## Events

```javascript
// Blocked upgrade
window.addEventListener('storage:blocked', (e) => {
  console.warn('IDB blocked:', e.detail.name);
});

// Version change
window.addEventListener('storage:versionchange', (e) => {
  console.warn('IDB version change:', e.detail.name);
});
```
