---
title: "Troubleshooting"
order: 12
description: "Common problems with Anza UI elements: undefined elements, templates that show their path, HMR, change not firing, leaks, form values and refs."
---

# Troubleshooting

Common problems and their fixes.

## Element not defined

**Symptom:** `customElements.get('user-card')` returns `undefined`, and the tag renders as an unknown element.

**Cause:** the module that defines it never ran, or the tag has no hyphen (the browser rejects it).

**Fix:** import the definition module before the element is used:

```javascript
// app.js
import './components/user-card.js'; // defines <user-card>

document.body.innerHTML = '<user-card></user-card>';
```

## Template shows its file path

**Symptom:** the shadow root contains the text `./card.html`, and the console shows `[Native UI] <user-card> template "./card.html" is relative but no base was given`.

**Cause:** a relative file path without `import.meta.url`.

**Fix:** pass `import.meta.url` as the last argument:

```javascript
import { view } from '@anzaui/anza/defs';

view('user-card', {
  template: { html: './card.html', css: './card.css' }
}, import.meta.url);
```

## Template or styles missing

**Symptom:** an empty shadow root, and `Failed to load template resource …` in the console.

**Cause:** the file URL returned an error. The element still mounts with what loaded, and other instances of the element reuse that result until the page reloads.

**Fix:** check the path relative to the defining module, and that the file is served. With `anza build`, relative files are inlined into the module, so a production build does not request them.

## Styles not updating in development

**Cause:** HMR only swaps file resources. Inline CSS strings change with the module, which reloads the page. A swap also needs the changed path to match the element's style URL.

**Check:** `anza dev` dispatches `anza:hmr:css` on `window` with `detail: { path, css }`. Log it to see the path it reports:

```javascript
window.addEventListener('anza:hmr:css', (event) => {
  console.log(event.detail.path);
});
```

## change does not run

**Causes:**

- The element is a `part()`. Parts never run `change`, and declaring it logs a warning.
- The value is the initial one, or was set before the element mounted. Render the first state in `connect`.
- The new value equals the old one (`===`).
- The property is not declared in `props`.

**Fix:** use `view()` for reactive elements:

```javascript
import { view } from '@anzaui/anza/defs';

view('click-counter', {
  props: { count: 0 },
  template: '<span ref="count"></span>',
  on: {
    connect({ el, refs }) {
      refs.count.textContent = el.count;
    },
    change({ name, val, refs }) {
      if (name === 'count') refs.count.textContent = val;
    }
  }
});
```

## connect never runs

**Cause:** `load` threw or rejected. The error is logged as `[Native UI] mount failed:` and `connect` is skipped.

**Fix:** catch errors in `load` that should not stop the element.

## Listeners survive after disconnect

**Cause:** listeners, observers or timers not bound to `ctrl.signal`.

**Fix:** pass the signal:

```javascript
import { observe } from '@anzaui/anza/ui';
import { view } from '@anzaui/anza/defs';

view('lazy-frame', {
  on: {
    connect({ el, ctrl }) {
      observe.intersection(el, () => el.classList.add('seen'), ctrl.signal);
      window.addEventListener('resize', () => el.classList.add('resized'), { signal: ctrl.signal });
    }
  }
});
```

See [Lifecycle](lifecycle.md#memory-safety).

## Form does not submit the value

**Cause:** `form: true` is missing, or `internals.setFormValue()` was never called.

**Fix:**

```javascript
view('toggle-switch', {
  form: true,
  props: { checked: false },
  on: {
    connect({ el, internals }) {
      internals.setFormValue(el.checked ? 'on' : null);
    }
  }
});
```

## :state() never matches

**Cause:** `state: true` needs `form: true`. Custom states live on `ElementInternals`, which only form-associated elements get. The state name is the prop name.

## Duplicate ref warning

**Warning:** `[Native UI] Duplicate ref "title" found. Using the first match.`

**Fix:** give each ref a unique name. For repeated elements, use a class and `tags`:

```javascript
view('item-list', {
  template: '<ul><li class="item"></li><li class="item"></li></ul>',
  on: {
    connect({ tags }) {
      tags.each('.item', (item, i) => { item.textContent = `Item ${i + 1}`; });
    }
  }
});
```

## Attribute not reflecting

**Cause:** the prop has `reflect: false`, or is not declared. Reflection is on by default:

```javascript
const props = {
  label: { type: String },                 // reflects
  secret: { type: String, reflect: false } // does not reflect
};
```

The attribute name is the prop name in lower case (`maxCount` → `maxcount`).

## change runs too often

**Cause:** a `change` that sets another prop schedules another `change`.

```javascript
const hooks = {
  change({ name, val, el }) {
    if (name === 'a') el.b = val; // schedules change for 'b'
  }
};
```

Each changed prop gets one call per flush. To throttle user input, debounce before setting the prop.

## Still stuck?

```javascript
console.log(customElements.get('user-card'));    // defined?
await customElements.whenDefined('user-card');   // resolves once defined
```

The element registry inside the factory is internal and not exported.
