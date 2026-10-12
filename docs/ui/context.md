---
title: "Context"
order: 5
description: "The context object passed to Anza UI hooks: el, ctrl, tags, refs, on, watch, internals, adopted, and the params and query of page load."
---

# Context

Each hook gets a frozen context object as its argument.

## Context fields

| Field | `load` / `connect` | `change` | `disconnect` | Description |
| ----- | :---: | :---: | :---: | ----------- |
| `el` | yes | yes | yes | The element |
| `ctrl` | yes | yes | no | `AbortController`; aborts on disconnect |
| `tags` | yes | yes | yes | Cached shadow-root queries |
| `refs` | yes | yes | yes | Elements marked `ref="name"` |
| `on` | yes | yes | no | Delegated event listeners |
| `watch` | yes | yes | yes | Mutation watchers |
| `internals` | yes | yes | yes | `ElementInternals` when `form: true`, else `undefined` |
| `adopted` | yes | no | no | `true` when the shadow root was pre-rendered |
| `params`, `query` | `load` only | no | no | Route values on a `page()` |

`change` also gets `name`, `val`, `old` and `prev`. See [Lifecycle](lifecycle.md#change).

## el

The element. Read props, call methods, reach the shadow root:

```javascript
import { view } from '@anzaui/anza/defs';

view('user-badge', {
  props: { name: 'Guest' },
  on: {
    connect({ el }) {
      console.log(el.localName, el.name, el.shadowRoot);
    }
  }
});
```

## ctrl

An `AbortController` created on each connect and aborted on disconnect. Pass its signal to anything that should stop with the element:

```javascript
view('user-feed', {
  on: {
    async load({ ctrl }) {
      const res = await fetch('/api/feed', { signal: ctrl.signal });
      console.log(await res.json());
    }
  }
});
```

## adopted

`true` when the element kept a pre-rendered Declarative Shadow DOM root instead of cloning its template. Use it to skip work the server already did:

```javascript
view('price-tag', {
  props: { amount: 0 },
  template: '<span ref="amount"></span>',
  on: {
    connect({ el, refs, adopted }) {
      if (!adopted) refs.amount.textContent = el.amount;
    }
  }
});
```

After a hydration mismatch re-render, `adopted` stays `true` but the markup is the client template. See [Hydration (DSD adopt)](hydration.md).

## params

On a `page()`, the `load` context has `params`: the route's path values, in the order of the `params` contract. Read them by index, by name, or with `first` and `last`:

```javascript
import { page } from '@anzaui/anza/defs';

page('/members/:handle', {
  tag: 'page-member',
  via: ['main'],
  params: [{ name: 'handle', type: String }],
  on: {
    load({ params }) {
      console.log(params[0], params.first, params.handle); // 'ann' for /members/ann
    }
  }
});
```

Values are read from the element's properties, which the router sets from the URL. Path values are strings unless a prop of the same name is declared `Number` or `Boolean`. Avoid names that clash with element properties, such as `id` or `title`.

## query

On a `page()` with a `query` contract, `load` gets the query values in contract order, cast by their declared `type`:

```javascript
page('/search', {
  tag: 'page-search',
  via: ['main'],
  query: [
    { name: 'q', type: String },
    { name: 'page', type: Number }
  ],
  on: {
    load({ query }) {
      console.log(query.q, query.page); // 'hello', 2 for /search?q=hello&page=2
    }
  }
});
```

For keys outside the contract, read `location.search`.

## tags

A cached query interface for the shadow root:

```javascript
view('item-list', {
  template: '<h2 class="title">Items</h2><ul><li class="item">One</li></ul>',
  on: {
    connect({ tags }) {
      const title = tags.one('.title');  // querySelector, cached
      const items = tags.all('.item');   // querySelectorAll, cached
      if (tags.has('.item')) {
        tags.each('.item', (item, i) => { item.dataset.index = String(i); });
      }
      console.log(title, items.length);
    }
  }
});
```

The cache is cleared when the shadow root's direct children change. Changes deeper in the tree do not clear it: call `tags.clear()` after you add or remove nested elements. With a [tags descriptor](templates.md#tags-descriptor), entries for each listed `id` and `ref` are filled in at mount.

## refs

A frozen object that maps each `ref` name to its element, built once per mount:

```javascript
view('count-header', {
  template: '<header ref="header"><span ref="count">0</span></header>',
  on: {
    connect({ refs }) {
      refs.header.classList.add('mounted');
      refs.count.textContent = '1';
    }
  }
});
```

Duplicate `ref` names log a warning. The first match wins.

## on

Delegated event listeners. Each `(type, capture)` pair gets one listener on the **shadow root**. A handler runs when the event's `composedPath()` contains a match before the shadow root, the same matching as [Delegate](../events/delegate.md). Use `events.delegate` or `events.listen` for listeners outside the shadow root.

### Simple

```javascript
view('search-box', {
  template: '<form><input class="search"><button class="btn">Go</button></form>',
  on: {
    connect({ on }) {
      on.click('.btn', (event, button) => {
        button.disabled = true;
      });

      on.submit('form', (event) => {
        event.preventDefault(); // submit listeners are not passive
      });

      on.input('.search', (event, input) => {
        console.log(input.value);
      });
    }
  }
});
```

Every call returns a disposer:

```javascript
const dispose = on.click('.btn', handler);
dispose(); // removing the last handler for a type removes the root listener
```

### Options

```javascript
on.click('.btn', handler, {
  signal,            // default: ctrl.signal
  once: false,
  capture: false,
  passive: undefined, // default: true only for touchstart, touchmove, wheel, mousewheel
  attrs: {
    'data-action': 'save', // must equal
    'aria-disabled': null  // must be absent
  },
  not: '.ignore',          // skip if match.closest('.ignore') is inside the root
  key: 'toolbar-save',     // a second registration with the same key replaces the first
  scope: 'assigned'        // also match light-DOM nodes slotted into this shadow root
});

on.click.once('.btn', handler);
```

| Option | Behaviour |
| ------ | --------- |
| `attrs` | Attribute test on the matched element (`null` = attribute must be absent) |
| `not` | Skip when `match.closest(not)` is inside the shadow root |
| `key` | Dedupe id: registering again with the key replaces the earlier handler |
| `scope: 'assigned'` | Also match slotted light-DOM nodes (default: shadow tree only) |

Events that do not bubble (`focus`, `blur`, `close`, `cancel`, `toggle`, `load`, `error`, `scroll`, `mouseenter` and others) are listened for in the capture phase automatically.

The first argument may be an element instead of a selector. An element outside this shadow root logs a warning and returns a no-op disposer.

## watch

Mutation watchers scoped to the shadow root. Prefer the typed kinds (`attr`, `kids`, `text`, `slot`) over `tree`. Registrations with different observe options use separate observers, so a wide `tree` or `attr('*')` never widens a neighbour's filter.

`watch.children` is an alias of `watch.kids`.

### Simple

```javascript
view('todo-panel', {
  template: '<span ref="counter">0</span><button ref="submit">Add</button><ul ref="list"></ul>',
  on: {
    connect({ watch, refs }) {
      watch.text(refs.counter, (text) => {
        console.log('counter:', text);
      });

      watch.attr(refs.submit, 'disabled', (attr, next, prev, el) => {
        el.dataset.wasDisabled = String(prev !== null);
      });

      watch.kids(refs.list, ({ added, removed }) => {
        console.log(added.length, removed.length);
      });
    }
  }
});
```

### More kinds

```javascript
view('editor-panel', {
  template: '<div ref="editor" contenteditable></div><slot ref="body"></slot><ul ref="list"></ul>',
  on: {
    connect({ watch, refs }) {
      watch.tree(refs.editor, (records) => console.log(records.length));
      watch.attr('.late-btn', 'disabled', () => {}, { requirePresent: true });
      watch.slot(refs.body, ({ assignedElements }) => console.log(assignedElements.length));
      watch.kids(refs.list, { deep: true }, ({ added }) => console.log(added));
      watch.attr.once(refs.editor, 'contenteditable', () => {});
    }
  }
});
```

| Kind | Handler | Notes |
| ---- | ------- | ----- |
| `watch.attr(target, name \| names \| '*', handler, opts)` | `(attr, next, prev, el)` | Prefer named attributes over `'*'` |
| `watch.kids(target, handler, opts)` or `watch.kids(target, { deep: true }, handler, opts)` | `({ added, removed }, el)` | `deep` includes descendants |
| `watch.text(target, handler, opts)` | `(text, old, el)` | Character data under the target |
| `watch.tree(target, handler, opts)` | `(records, el)` | Everything; own observer |
| `watch.slot(slot \| selector, handler, opts)` | `({ assigned, assignedElements }, slot)` | Uses `slotchange` |

Every kind also has `.once`.

Options: `{ signal, once, requirePresent }`, or an `AbortSignal` as the last argument. The default signal is `ctrl.signal`. Every call returns a disposer.

A selector that matches nothing yet still observes (with a warning), so late elements are picked up. With `requirePresent: true` it logs a warning and does nothing. An element target outside this shadow root throws.

For leak tests, [`getAttachmentStats`](lifecycle.md#attachment-stats) reports the live `on`, `watch` and slot counts.

## internals

`ElementInternals`, present only when the element declares `form: true`:

```javascript
view('toggle-switch', {
  form: true,
  props: { checked: { type: Boolean, state: true } },
  on: {
    connect({ el, internals }) {
      internals.setFormValue(el.checked ? 'on' : null);
    },
    change({ name, val, internals }) {
      if (name === 'checked') internals.setFormValue(val ? 'on' : null);
    }
  }
});
```

See [Form-associated elements](form-associated.md).
