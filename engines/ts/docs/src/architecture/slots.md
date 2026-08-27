# AST & JIT Closure Compilation

Template parsing splits markup into static text slices and dynamic slot tokens.

## 1. Chunk Type Definition

Located in `src/engine/slot/parse.ts`:

```typescript
export type Chunk =
  | { type: 'static'; value: string }
  | { type: 'slot'; name: string };
```

- **`{ type: 'static', value }`**: Unchanging HTML markup slices.
- **`{ type: 'slot', name }`**: Placeholder keys (e.g. `{{user_name}}` becomes `name: "user_name"`).

## 2. Single-Pass Extraction

The `extract(template: string)` function parses template strings without regular expressions:

```typescript
import { extract } from 'anza';

const template = '<ui-card><span slot="title">{{title}}</span><div class="count">{{count}}</div></ui-card>';
const chunks = extract(template);

// chunks = [
//   { type: 'static', value: '<ui-card><span slot="title">' },
//   { type: 'slot', name: 'title' },
//   { type: 'static', value: '</span><div class="count">' },
//   { type: 'slot', name: 'count' },
//   { type: 'static', value: '</div></ui-card>' }
// ]
```

## 3. The Compiled JIT Renderer

Located in `src/engine/slot/bind.ts`:

```typescript
export type Params =
  | Record<string, any>
  | Map<string, any>
  | Array<[string, any]>
  | null
  | undefined;

export type CompiledRenderer = (params?: Params) => string;
```

When `compile(chunks)` creates the renderer:
1. It loops through the pre-split parts using indexed array iterations.
2. It accepts plain objects, Maps, or array tuples with zero conversion overhead.
3. String additions (`out += p.value` / `out += val`) leverage V8's rope strings and flat string optimizations.
