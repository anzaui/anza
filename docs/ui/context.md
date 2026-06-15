# Context

Every lifecycle hook receives a frozen context object with helpers for interacting with the element's shadow DOM, events, and observers.

---

## Context Fields

```javascript
{
  el,       // the element instance
  ctrl,     // AbortController (signal aborts on disconnect)
  tags,     // TagsCache for fast shadow DOM queries
  refs,     // named element lookups via ref="name"
  on,       // delegated event proxy
  watch,    // mutation watcher
  internals,// ElementInternals (if form: true)
  params,   // (load hook only) typed dynamic path params array with getters
  query,    // (load hook only) typed query params array with getters
  raw       // (load hook only) raw URLSearchParams object
}
```

---

## el

The element instance itself. Access properties, shadow root, and methods:

```javascript
on: {
  connect({ el }) {
    console.log(el.tagName);      // 'USER-CARD'
    console.log(el.name);       // current prop value
    console.log(el.shadowRoot); // the shadow root
  }
}
```

---

## ctrl

An `AbortController` whose signal aborts when the element disconnects. Pass it to any async operation for automatic cleanup:

```javascript
on: {
  async load({ ctrl }) {
    const res = await fetch('/api', { signal: ctrl.signal });
  }
}
```

When the element is removed, the signal aborts and the fetch is cancelled.

---

## params

An ordered, typed array containing dynamic path parameters extracted from the URL. Available in the `load` hook:

```javascript
on: {
  async load({ params }) {
    // If route is /members/:id
    console.log(params[0]);     // '42'
    console.log(params.first);  // '42'
    console.log(params.id);     // '42'
  }
}
```

Values are automatically cast to their declared contract type (e.g., `Number`).

---

## query

An ordered, typed array containing query parameters mapped from the URL. Available in the `load` hook:

```javascript
on: {
  async load({ query }) {
    // If URL is /search?q=hello&page=2
    console.log(query[0]);     // 'hello'
    console.log(query.first);  // 'hello'
    console.log(query.page);   // 2 (cast to Number)
  }
}
```

---

## raw

The raw `URLSearchParams` object representing all query parameters currently in the URL. Useful for accessing undeclared query keys:

```javascript
on: {
  async load({ raw }) {
    if (raw.has('referrer')) {
      this.referrer = raw.get('referrer');
    }
  }
}
```

---

## tags

A cached query interface for the shadow root. Pre-warmed by the tags descriptor (if available).

```javascript
on: {
  connect({ tags }) {
    const title = tags.one('.title');     // querySelector, cached
    const items = tags.all('.item');      // querySelectorAll, cached
    const hasItems = tags.has('.item');   // boolean
    tags.each('.item', (el, i) => { ... }); // iterate
  }
}
```

The cache is invalidated automatically when shadow DOM children change.

---

## refs

Named element lookups based on `ref="name"` attributes in the template:

```javascript
template: '<div ref="header"><span ref="count">0</span></div>'

on: {
  connect({ refs }) {
    refs.header.classList.add('mounted');
    refs.count.textContent = '1';
  }
}
```

Duplicate `ref` names log a warning. The first match wins.

---

## on

Delegated event proxy. One listener per event type on the shadow root handles all matching selectors:

```javascript
on: {
  connect({ on }) {
    on.click('.btn', (event, target) => {
      // target is the matched .btn element
      target.disabled = true;
    });

    on.submit('form', (event, form) => {
      event.preventDefault();
    });

    on.input('.search', (event, input) => {
      console.log(input.value);
    });
  }
}
```

Event types: any standard DOM event type. The proxy auto-detects passive vs non-passive based on registered handlers.

Return a disposer to remove the listener:

```javascript
const dispose = on.click('.btn', handler);
dispose(); // removes this specific handler
```

---

## watch

Mutation watcher for observing DOM changes inside the shadow root:

```javascript
on: {
  connect({ watch }) {
    // Watch text content changes
    watch.text('.counter', (text, old, el) => {
      console.log('Counter:', text);
    });

    // Watch attribute changes
    watch.attr('[data-status]', 'data-status', (val, old, el) => {
      console.log('Status:', val);
    });

    // Watch child list changes
    watch.children('.list', (mutations) => {
      console.log('List changed');
    });
  }
}
```

All watchers are disconnected automatically when the element disconnects (via `ctrl.signal`).

---

## internals

`ElementInternals` when `form: true` is declared. Provides form participation and custom state:

```javascript
view('toggle-switch', {
  form: true,
  props: {
    checked: { type: Boolean, state: true }
  },
  on: {
    connect({ el, internals }) {
      internals.setFormValue(el.checked ? 'on' : '');
    }
  }
});
```
