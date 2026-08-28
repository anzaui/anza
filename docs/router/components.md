# Components

`view()` and `part()` define custom elements without route binding. They are the building blocks of pages and docks.

## view()

A `view` is a composable, stateful Web Component. It has reactive properties, lifecycle hooks, and a template. The router never touches it directly — it is a UI primitive.

```javascript
import { view } from '@anzaui/anza/defs';

view('user-card', {
  props: {
    name: { type: String, default: '' },
    age:  { type: Number }
  },
  template: '<span>{{ name }}</span>',
  on: {
    connect({ el }) {
      console.log('user-card mounted');
    },
    change({ name, val }) {
      if (name === 'name') el.querySelector('span').textContent = val;
    }
  }
});
```

A `page` is a `view` that also owns a URL. Everything a page can do (props, template, on, methods), a view can do — minus routing.

Use views for:

- Reusable widgets inside pages
- Dialogs and modals that are not route-bound
- Complex stateful components that need reactive updates

## part()

A `part` is an atomic, stateless UI primitive: buttons, icons, badges, chips. It has props but no reactive update loop.

```javascript
import { part } from '@anzaui/anza/defs';

part('icon-star', {
  props: {
    color: { type: String, default: 'gold' }
  },
  template: '<svg>...</svg>'
});
```

Parts are lighter than views because they skip the reactive `on.change` loop. If you find yourself adding `on.change` to a part, promote it to a view.

The router warns you if you declare `on.change` on a part:

```text
[Native UI] <icon-star> is a 'part' but declares on.change.
Parts are stateless — promote it to a 'view' if it needs reactive re-rendering.
```

Use parts for:

- Icons and glyphs
- Buttons and badges
- Purely presentational elements

## Shared Config Fields

Both `view()` and `part()` accept the same config fields as `page()`, minus routing-specific ones:

| Field | view | part |
|-------|------|------|
| `tag` | yes | yes |
| `template` | yes | yes |
| `style` | yes | yes |
| `props` | yes | yes |
| `on.connect` | yes | yes |
| `on.disconnect` | yes | yes |
| `on.change` | yes | no (warns) |
| `on.load` | yes | yes (runs on mount) |
| `methods` | yes | yes |
| `base` | yes | yes |

## Methods

Both support custom methods:

```javascript
view('user-card', {
  methods: {
    refresh() {
      this.loadData();
    }
  }
});
```

Methods are assigned to the element prototype.

## File Templates

Same as pages and docks:

```javascript
view('user-card', {
  template: { html: './card.html', css: './card.css' }
}, import.meta.url);
```

## Comparison

| Concern | page | dock | view | part |
|---------|------|------|------|------|
| Owns a URL | yes | no | no | no |
| Registers in container graph | no | yes | no | no |
| Has reactive update loop | yes | yes | yes | no |
| Declares `via` chain | yes | no | no | no |
| Exposes `swap` | no | yes | no | no |
| Typical use | Routed view | Layout shell | Stateful widget | Stateless primitive |
