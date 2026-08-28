# Props

Props are reactive properties on declarative elements. They are typed, support default values, automatically reflect to attributes, and trigger batched update callbacks on change.

## Declaring Props

```javascript
view('user-card', {
  props: {
    name:  { type: String, default: 'Guest' },
    age:   { type: Number },
    admin: { type: Boolean }
  }
});
```

## Shorthand

Literal values are auto-detected:

```javascript
props: {
  name:  'Guest',     // type: String,  default: 'Guest'
  count: 0,           // type: Number,  default: 0
  active: false       // type: Boolean, default: false
}
```

This expands to the full config internally. Use the longhand form when you need `reflect`, `state`, or other options.

## Supported Types

| Type | Attribute Cast | Example |
| ------ | ---------------- | --------- |
| `String` | As-is | `name="Alice"` → `'Alice'` |
| `Number` | `Number(val)` | `age="42"` → `42` |
| `Boolean` | Presence = true | `active` → `true`, absent → `false` |

## Attribute Reflection

By default, props reflect to attributes. Disable it per prop:

```javascript
props: {
  secret: { type: String, reflect: false }
}
```

Boolean reflection uses empty string (`active=""`) for true and removes the attribute for false.

## Custom State (`:state()`)

Expose props as custom state pseudo-classes:

```javascript
props: {
  loading: { type: Boolean, state: true }
}
```

When `loading` is true, the element matches `:state(loading)` in CSS:

```css
user-card:state(loading) { opacity: 0.5; }
```

Requires `ElementInternals` and the `states` API (Chrome 132+, Baseline 2026).

## Initial Values

Props are initialized from attributes before `connectedCallback`:

```html
<user-card name="Alice" age="30" admin></user-card>
```

If an attribute is absent, the default is used. If no default is declared:

- `String` → `null`
- `Number` → `null`
- `Boolean` → `false`

## Programmatic Assignment

Set props from JavaScript:

```javascript
const card = document.querySelector('user-card');
card.name = 'Bob';
card.age = 25;
```

The `change` hook fires after the assignment (batched via microtask or rAF depending on the `visual` flag).

## Query Param Mapping

For route-bound elements (`page()`), declare `query` as a contract array to map URL query params onto element properties. The library casts values based on the declared type:

```javascript
page('/search', {
  tag: 'page-search',
  query: [
    { name: 'q',    type: String },
    { name: 'page', type: Number }
  ]
});
```

Visiting `/search?q=hello&page=2` automatically sets the properties `this.q = 'hello'` (String) and `this.page = 2` (Number) on the element, triggering update cycles.

## Hash Mapping

Declare a `hash` prop to receive the URL hash:

```javascript
props: {
  hash: { type: String }
}
```

Visiting `/about#team` sets `hash = '#team'`.

## Property Change Callback

The `change` hook receives all pending changes in a single batch:

```javascript
on: {
  change({ name, val, old, el, refs }) {
    if (name === 'name') {
      refs.title.textContent = val;
    }
  }
}
```

Multiple rapid assignments are coalesced into one callback.
