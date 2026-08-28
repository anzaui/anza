# Pool

The worker pool lazily creates dedicated workers and schedules tasks by priority. It auto-scales up to a max, reclaims idle workers, and handles crashes with optional requeue.

## Run

```javascript
import { workers } from '@anzaui/anza/workers';

const result = await workers.run('/workers/calc.js', 'fib', {
  payload: { n: 40 }
});
```

One pool per script URL is created automatically and reused across calls.

## Options

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `payload` | any | `null` | Data sent to the worker |
| `transferables` | Transferable[] | `[]` | Objects to transfer |
| `signal` | AbortSignal | — | Cancel the task |
| `timeout` | number | — | Cancel after N ms |
| `priority` | string | `'user-visible'` | Task priority |
| `idempotent` | boolean | `false` | Requeue on worker crash |
| `meta` | object | — | Metadata for the worker |

## Pool Sizing

Default pool size is `hardwareConcurrency - 1` (minimum 2). Configure via pool options:

```javascript
// The pool is created on first run with these options
workers.run('/workers/calc.js', 'task', {
  // These opts also configure the pool:
  // max, size, idle are read on pool creation
});
```

Pool options (passed on first `run`):

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `max` | number | `cores - 1` | Maximum workers |
| `size` | number | `cores - 1` | Initial workers |
| `idle` | number | `30000` | Idle timeout in ms (0 = never) |

## Priority Queue

Tasks are sorted by priority. Background tasks get promoted after 20 higher-priority tasks to prevent starvation.

## Crash Recovery

If a worker crashes and `idempotent: true`, the task is requeued once:

```javascript
workers.run('/workers/calc.js', 'risky', {
  payload: data,
  idempotent: true
});
```

## Lifecycle

```javascript
// Terminate one pool
workers.close('/workers/calc.js');

// Terminate all pools and clear broadcasts
workers.clear();
```

Pools auto-terminate on `pagehide`.

## Pool Stats

```javascript
import { Pool } from '@anzaui/anza/workers';

const pool = new Pool('/workers/calc.js', { max: 4 });
console.log(pool.size);    // current workers
console.log(pool.pending); // queued tasks
```
