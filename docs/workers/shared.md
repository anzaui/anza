# Shared

SharedWorker connections persist across tabs. If `SharedWorker` is unavailable, the module falls back to a dedicated worker transparently.

## Connect

```javascript
import { workers } from '@anzaui/anza/workers';

const conn = workers.shared('/workers/state.js', 'app-shared');
```

`connect()` is called automatically on first `send()` or `subscribe()`.

## Send

```javascript
conn.send({ action: 'increment', value: 1 });
```

## Subscribe

```javascript
const off = conn.subscribe((data) => {
  console.log('From shared worker:', data);
});

off(); // unsubscribe
```

## Close

```javascript
conn.close();
```

## Fallback

If `SharedWorker` is not supported, the connection wraps a dedicated worker:

```javascript
// Works in all browsers, even without SharedWorker support
const conn = workers.shared('/workers/state.js');
conn.send({ type: 'ping' });
```

The dedicated fallback does not share state across tabs, but provides the same API surface.

## Example: Shared Counter

```javascript
// In every tab
const counter = workers.shared('/workers/counter.js');

counter.subscribe((data) => {
  document.getElementById('count').textContent = data.count;
});

document.getElementById('inc').addEventListener('click', () => {
  counter.send({ action: 'increment' });
});
```
