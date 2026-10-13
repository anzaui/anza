# Pool

The worker pool lazily creates dedicated workers and schedules tasks by priority. It starts one worker, adds more up to a max, reclaims idle workers, and can requeue failed tasks.

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
| `idempotent` | boolean | `false` | Requeue the task when it fails |
| `meta` | object | — | Metadata for the worker |

## Pool Sizing

The pool starts with one worker and spawns more while tasks wait, up to the maximum. The default maximum is `hardwareConcurrency - 1`, with a minimum of 2. Pool options are read from the first `run` call for a script and ignored after that:

```javascript
workers.run('/workers/calc.js', 'task', {
  payload: data,
  max: 4,
  idle: 10000
});
```

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `max` | number | `max(2, cores - 1)` | Maximum workers |
| `size` | number | — | Used as the maximum when `max` is not set |
| `idle` | number | `30000` | Idle timeout in ms before an extra worker is terminated (0 = never). The last worker is kept |

## Priority Queue

Tasks are sorted by priority. Background tasks get promoted after 20 higher-priority tasks to prevent starvation.

## Crash Recovery

With `idempotent: true`, a task that fails (a worker error or an `ok: false` reply) is put back in the queue instead of rejecting. There is no retry limit, so pair it with `timeout` or `signal`:

```javascript
workers.run('/workers/calc.js', 'risky', {
  payload: data,
  idempotent: true,
  timeout: 10000
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
