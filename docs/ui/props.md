---
title: "Props"
order: 2
description: "Reactive props on Anza UI elements: types, attribute reflection, :state(), initial values, route params and update batching."
---

# Props

Props are typed properties on an element. A prop reads its first value from the matching attribute, reflects changes back to it, and calls `change` (`update` in `element()`) when it changes.

## Declaring props

```javascript
import { view } from '@anzaui/anza/defs';

view('user-card', {
  props: {
    name:  { type: String, default: 'Guest' },
    age:   { type: Number },
    admin: { type: Boolean }
  }
});
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `type` | `String` | `String`, `Number` or `Boolean`. Controls how attributes are read. |
| `default` | see below | Value when the attribute is absent. |
| `reflect` | `true` | Write the value back to the attribute. |
| `state` | `false` | Mirror the value to a `:state()` custom state. |

## Shorthand

A literal value sets both type and default:

```javascript
const props = {
  name: 'Guest',  // { type: String,  default: 'Guest' }
  count: 0,       // { type: Number,  default: 0 }
  active: false   // { type: Boolean, default: false }
};
```

An object with a `type` key is used as is, so you can mix both forms. Use the long form for `reflect` or `state`.

## Attributes

The attribute name is the prop name in lower case: a `maxCount` prop reads the `maxcount` attribute.

| Type | Attribute to value | Value to attribute |
| ---- | ------------------ | ------------------ |
| `String` | as is; removed → `null` | `String(value)`; `null`/`undefined` removes it |
| `Number` | `Number(attr)`; removed → `default`, or `0` | `String(value)` |
| `Boolean` | present → `true` | `true` sets `""`; `false` removes it |

```javascript
el.active = true;  // active=""
el.active = false; // attribute removed
el.name = null;    // attribute removed
el.name = 'Bob';   // name="Bob"
```

Setting the attribute (`el.setAttribute('name', 'Ann')`) sets the prop, which schedules `change`.

Turn reflection off for a prop that should not appear in the DOM:

```javascript
const props = {
  token: { type: String, reflect: false }
};
```

Only strings, numbers and booleans round-trip through attributes. For an object or array value, set `reflect: false`. Otherwise the value is written as a string, and the attribute callback sets the prop back to that string.

## Initial values

Props are read from attributes in the constructor:

```html
<user-card name="Alice" age="30" admin></user-card>
```

Without the attribute, the prop takes its `default`. Without a default, a `Boolean` is `false` and other types are `null`.

On connect, each reflected prop whose attribute is absent writes its current value to the attribute, so CSS attribute selectors such as `:host([orientation="horizontal"])` match the default. Strings and numbers are written as text, `true` booleans as `""`; `false`, `null` and non-primitive values add nothing. An attribute already in the markup is never changed.

`change` does not run for initial values or for values set before the element has mounted. Render the first state in `connect`:

```javascript
view('user-name', {
  props: { name: 'Guest' },
  template: '<span ref="name"></span>',
  on: {
    connect({ el, refs }) {
      refs.name.textContent = el.name;
    },
    change({ name, val, refs }) {
      if (name === 'name') refs.name.textContent = val;
    }
  }
});
```

## Custom state (`:state()`)

With `state: true`, the element adds a custom state named after the prop while the value is truthy, and removes it when the value is falsy. The initial value counts too: an attribute in the markup (or a truthy default) sets the state when the element connects. Custom states live on `ElementInternals`, which the factory attaches for `form: true` or when any prop has `state: true`; `ctx.internals` is then set as well.

```javascript
view('save-button', {
  props: {
    busy: { type: Boolean, state: true }
  },
  template: '<button type="button"><slot></slot></button>'
});
```

```css
save-button:state(busy) { opacity: 0.5; }
```

The state name is always the prop name. To use another name, call `internals.states.add('name')` yourself.

## Update batching

Assignments are collected per element and flushed together:

- **Per prop.** The flush calls `change` once for each prop that changed, in the order the props first changed. Two props changed means two calls.
- **Latest value.** A prop assigned several times before the flush gets one call with its latest value. `old` is the value it had just before that last assignment.
- **Equal values skip.** Assigning the current value (`===`) does nothing.
- **Timing.** `view()` and `page()` flush in the next animation frame. `dock()` and `element()` flush in a microtask unless `update.visual = true`. `part()` never calls `change`.
- **Disconnected elements.** If the element disconnects before the flush, the pending changes are dropped.

```javascript
el.name = 'Alice';
el.age = 30;
el.age = 31;
// next flush: change({ name: 'name', val: 'Alice', ... })
//             change({ name: 'age', val: 31, old: 30, ... })
```

## Route params and query

On a `page()`, the router sets props from the URL before the element connects:

- **Path params**: `/members/:id` sets `el.id`. The value is a string unless a prop with that name is declared as `Number` or `Boolean`.
- **Query**: names in the `query` contract are set on the element, cast by their declared `type`. A declared prop whose name appears in the query string is set too.
- **Hash**: a declared `hash` prop receives the URL hash.

```javascript
import { page } from '@anzaui/anza/defs';

page('/search', {
  tag: 'page-search',
  via: ['main'],
  props: { q: '', hash: { type: String } },
  query: [
    { name: 'q', type: String },
    { name: 'page', type: Number }
  ]
});
```

Visiting `/search?q=hello&page=2#results` sets `el.q = 'hello'`, `el.page = 2` and `el.hash`. The same values reach the `load` hook as `params` and `query`. See [Context](context.md#params).

`params` and `query` contracts have no defaults and no reflection. They only describe how to read and cast URL values.
