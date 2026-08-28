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
  (db) => db.createObjectStore('users'),        // v1
  (db) => db.createObjectStore('settings'),     // v2
  (db) => {
    // v3 — add an index
    const store = db.transaction('users').objectStore('users');
    store.createIndex('email', 'email', { unique: true });
  }
]);
```

Each function corresponds to one version step (0→1, 1→2, 2→3).

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

Supports async callbacks. Errors abort the transaction.

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

Query options: `index`, `range`, `direction` (`'next'` or `'prev'`), `limit`.

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
