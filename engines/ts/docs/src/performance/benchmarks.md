# Benchmarks

No benchmark numbers are published for the TypeScript engine. Earlier versions of
this page listed latencies that were not backed by a reproducible benchmark, so
they were removed.

## Measuring it yourself

```typescript
import { compile, extract } from '@anzaui/engine';

const render = compile(extract('<ui-card id="{{id}}"><b>{{title}}</b></ui-card>'));
const params = { id: 101, title: 'Hello' };

const runs = 1_000_000;
const start = performance.now();
for (let i = 0; i < runs; i++) render(params);
const ms = performance.now() - start;

console.log(`${((ms * 1e6) / runs).toFixed(0)} ns per render`);
```

Compare plain objects, `Map`s and `[key, value]` arrays with your real templates,
and `compile(chunks, { escape: true })` if you enable escaping; object
parameters are expected to be the fastest because they are a direct property
lookup.
