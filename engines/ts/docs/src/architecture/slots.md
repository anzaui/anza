# Slot Parsing & Render Functions

Template parsing splits markup into static strings and slot names, then builds a
render function.

## 1. `Chunk`

`src/engine/slot/parse.ts`:

```typescript
export type Chunk =
  | { type: 'static'; value: string }
  | { type: 'slot'; name: string };
```

- **`{ type: 'static', value }`**: HTML text, written as is.
- **`{ type: 'slot', name }`**: the trimmed placeholder name (`{{ user_name }}` becomes `'user_name'`).

## 2. `extract`

`extract(template: string): Chunk[]` scans the string once with `indexOf`. An
unclosed `{{` or an empty `{{}}` throws an `AnzaError` with code `TEMPLATE`.
There is no other syntax: no loops, conditionals, filters, comments or escaping.

```typescript
import { extract } from '@anzaui/engine';

const chunks = extract('<ui-card><span slot="title">{{title}}</span><b>{{count}}</b></ui-card>');
// [
//   { type: 'static', value: '<ui-card><span slot="title">' },
//   { type: 'slot',   name: 'title' },
//   { type: 'static', value: '</span><b>' },
//   { type: 'slot',   name: 'count' },
//   { type: 'static', value: '</b></ui-card>' },
// ]
```

## 3. `compile` and `Params`

`src/engine/slot/bind.ts`:

```typescript
export type Params =
  | Record<string, any>
  | Map<string, any>
  | Array<[string, any]>
  | null
  | undefined;

export type CompiledRenderer = (params?: Params) => string;

export function compile(chunks: Chunk[]): CompiledRenderer;
export function string(chunks: Chunk[], params?: Params): string; // compile + call
```

The renderer:

1. Accepts a plain object, a `Map` or an array of `[key, value]` pairs.
2. Writes nothing for a missing, `undefined` or `null` value; any other value is
   converted with string concatenation (`3` becomes `"3"`).
3. Inserts values **without HTML escaping**.
