# Dedicated

Raw dedicated worker wrapper with per-request MessageChannel isolation. Each `run()` creates a new port, so concurrent requests do not cross-contaminate messages.

---

## Create

```javascript
import { workers } from '@anzaui/anza/workers';

const worker = workers.dedicated('/workers/sort.js');
```

---

## Run a Task

```javascript
const result = await worker.run('sort', {
  payload: { items: [3, 1, 2] },
  transferables: [],
  signal: controller.signal,
  timeout: 5000,
  meta: { requestId: 'abc' }
});
```

---

## Message Contract

The worker receives:

```javascript
{ task, payload, meta, port }
```

And responds via `port.postMessage`:

```javascript
port.postMessage({ ok: true, value: result });
// or
port.postMessage({ ok: false, error: 'message' });
```

---

## Terminate

```javascript
worker.terminate();
```

After termination, all pending `run()` calls reject immediately.

---

## Abort and Timeout

```javascript
const ctrl = new AbortController();

worker.run('long', { signal: ctrl.signal, timeout: 3000 });

// Either abort manually...
ctrl.abort();

// ...or let the 3-second timer fire
```

Signal and timeout are combined into one abort controller internally.

---

## Error Handling

Worker-level errors (syntax errors, unhandled exceptions) reject all pending requests:

```javascript
try {
  await worker.run('crash');
} catch (err) {
  console.error('Worker failed:', err.message);
}
```
