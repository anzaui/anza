# Slot Parsing & Render Functions

Template parsing splits markup into static strings and slot names, then builds a
render function.

## 1. `Chunk`

`src/engine/slot/parse.ts`:

```typescript
export type Chunk =
  | { type: 'static'; value: string }
  | { type: 'slot'; name: string }  // {{name}}
  | { type: 'raw'; name: string };  // {{{name}}}
```

- **`{ type: 'static', value }`**: HTML text, written as is.
- **`{ type: 'slot', name }`**: the trimmed placeholder name (`{{ user_name }}` becomes `'user_name'`). HTML-escaped when the engine runs with `escape: true`.
- **`{ type: 'raw', name }`**: a `{{{name}}}` placeholder, always inserted as is.

## 2. `extract`

`extract(template: string): Chunk[]` scans the string once with `indexOf`. An
unclosed `{{` or `{{{`, or an empty `{{}}`, throws an `AnzaError` with code
`TEMPLATE`. There is no other syntax: no loops, conditionals, filters or
comments.

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

export interface CompileOptions {
  escape?: boolean; // HTML-escape {{name}}; {{{name}}} stays raw. Default false.
}

export function compile(chunks: Chunk[], options?: CompileOptions): CompiledRenderer;
export function string(chunks: Chunk[], params?: Params, options?: CompileOptions): string; // compile + call
export function stringify(value: unknown): string | undefined; // one value as slot text
export function escapeHtml(text: string): string;
```

The renderer:

1. Accepts a plain object, a `Map` or an array of `[key, value]` pairs (the
   first pair for a key wins).
2. Reads only **own properties** of an object (`Object.hasOwn`), so
   `{{toString}}`, `{{constructor}}` and `{{__proto__}}` render nothing unless
   you pass them.
3. Converts values with `stringify`: strings as is, `true`/`false`, numbers via
   `String()` (`3.0` becomes `3`), nothing for a missing, `undefined` or `null`
   value, compact JSON for arrays and plain objects (`{"a":1}`), and `String()`
   for anything else.
4. Inserts values **without HTML escaping** by default. With `escape: true`,
   `{{name}}` values go through `escapeHtml` and `{{{name}}}` values stay raw.

## 4. Escaping

`escapeHtml` maps `&` `<` `>` `"` `'` to `&amp;` `&lt;` `&gt;` `&quot;` `&#39;`,
the same as the Rust and Python engines. The output is safe in element content
and in quoted attribute values.

```typescript
import { Setup, escapeHtml } from '@anzaui/engine';

// Escaping off (the default): escape untrusted input yourself.
tpl.bind({ comment: escapeHtml(userInput) });

// Escaping on: {{comment}} is escaped, {{{content}}} stays raw.
const engine = await new Setup({ root: './templates', escape: true }).run();
```

With `escape: true`, write `{{{content}}}` in `layout/shell.html`, otherwise the
page HTML is escaped too.
