# Troubleshooting

Common problems and their solutions.

## Element not defined

**Error:** `customElements.get('my-element')` returns `undefined`

**Cause:** The module containing `element()` or `view()` was not executed.

**Fix:** Ensure the definition module is imported before the element is used in HTML:

```javascript
// app.js
import './components/user-card.js'; // defines <user-card>

// Now safe to use in HTML
document.body.innerHTML = '<user-card></user-card>';
```

## Template not loading

**Error:** Empty shadow root, no styles applied

**Cause:** File template given without `import.meta.url`.

**Fix:**

```javascript
// Correct
view('user-card', {
  template: { html: './card.html', css: './card.css' }
}, import.meta.url);

// Wrong — paths cannot be resolved
view('user-card', {
  template: { html: './card.html', css: './card.css' }
}); // missing base
```

## Styles not updating in development

**Cause:** HMR listener not receiving the right path.

**Fix:** The HMR event detail must include the absolute or relative path matching the style URL:

```javascript
window.dispatchEvent(new CustomEvent('native:hmr:css', {
  detail: { path: '/src/components/card.css', css: '...' }
}));
```

## Property changes not triggering update

**Cause:** `on.change` not declared, or the element is a `part`.

**Fix:**

```javascript
// Correct for reactive updates
view('counter', {
  props: { count: 0 },
  on: {
    change({ name, val }) { ... }
  }
});

// part() suppresses on.change — use view() instead
part('counter', {
  props: { count: 0 },
  on: { change: () => {} } // warns in console
});
```

## Memory leak after disconnect

**Cause:** Listeners or timers not bound to `ctrl.signal`.

**Fix:** Always pass `ctrl.signal` to observers and long-lived operations:

```javascript
// Correct — auto-cleanup on disconnect
observe.intersection(el, handler, ctrl.signal);

// Wrong — leaks after disconnect
const observer = new IntersectionObserver(handler);
observer.observe(el); // never cleaned up
```

## Form not submitting value

**Cause:** `form: true` not declared, or `setFormValue` not called.

**Fix:**

```javascript
view('toggle-switch', {
  form: true, // required
  on: {
    connect({ el, internals }) {
      internals.setFormValue(el.checked ? 'on' : '');
    }
  }
});
```

## Duplicate ref warning

**Warning:** `Duplicate ref "title" found. Using the first match.`

**Cause:** Multiple elements with the same `ref` attribute.

**Fix:** Use unique ref names, or use `tags.all()` for collections:

```javascript
template: `
  <li ref="item-1"></li>
  <li ref="item-2"></li>
`

// Or use tags for dynamic lists
tags.each('.item', (el) => { ... });
```

## Attribute reflection not working

**Cause:** `reflect: false` set, or the prop is not declared.

**Fix:** Check the prop declaration. Reflection is `true` by default:

```javascript
props: {
  label: { type: String }           // reflects by default
  secret: { type: String, reflect: false } // does not reflect
}
```

## Change callback fires too often

**Cause:** Rapid assignments from multiple sources.

**Fix:** Changes are batched. If you see many callbacks, check for loops or cascading updates:

```javascript
// Avoid: change triggers change
change({ name, val, el }) {
  if (name === 'a') el.b = val; // triggers another change
}
```

Use guards or debouncing for user input:

```javascript
on.input('.search', debounce((e, input) => {
  el.query = input.value;
}, 300));
```

## Still stuck?

Check internal state:

```javascript
import { specRegistry } from '@anzaui/anza/ui';

// See the spec for an element
console.log(specRegistry.get('user-card'));

// Check if custom element is defined
console.log(customElements.get('user-card'));
```
