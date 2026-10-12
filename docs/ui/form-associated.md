---
title: "Form-associated elements"
order: 7
description: "Form-associated Anza UI elements: form: true, ElementInternals in the context, :state() props, and the reset, disabled and restore form hooks."
---

# Form-associated elements

An element with `form: true` takes part in HTML forms. The factory marks the class `formAssociated`, attaches `ElementInternals`, and passes it to every hook as `internals`.

`form: true` works with `element()`, `container()`, `page()`, `dock()`, `view()` and `part()`. The form hooks (`associated`, `disabled`, `reset`, `restore`) are read only from an `element()` spec. The definition layer does not forward them; a `reset` under `on` or `methods` becomes a plain method, not a form callback.

## Submitting a value

Set the value with `internals.setFormValue()`:

```javascript
import { view } from '@anzaui/anza/defs';

view('toggle-switch', {
  form: true,
  props: {
    checked: { type: Boolean, state: true }
  },
  template: '<button type="button" role="switch"><span ref="label">Off</span></button>',
  on: {
    connect({ el, on, refs, internals }) {
      internals.setFormValue(el.checked ? 'on' : null);
      refs.label.textContent = el.checked ? 'On' : 'Off';
      on.click('button', () => {
        el.checked = !el.checked;
      });
    },
    change({ name, val, refs, internals }) {
      if (name !== 'checked') return;
      internals.setFormValue(val ? 'on' : null);
      refs.label.textContent = val ? 'On' : 'Off';
    }
  }
});
```

```html
<form>
  <toggle-switch name="notifications"></toggle-switch>
  <button type="submit">Save</button>
</form>
```

The form submits the value under the element's `name` attribute.

## Form hooks

On an `element()` spec, these hooks map to the platform callbacks. Each runs with `this` set to the element, so write them as methods, not arrow functions.

| Hook | Platform callback | Arguments |
| ---- | ----------------- | --------- |
| `associated` | `formAssociatedCallback` | `(form)` |
| `disabled` | `formDisabledCallback` | `(disabled)` |
| `reset` | `formResetCallback` | none |
| `restore` | `formStateRestoreCallback` | `(state, mode)` |

```javascript
import { element } from '@anzaui/anza/ui';

element('rating-input', {
  form: true,
  props: {
    value: { type: Number, default: 0 }
  },
  template: '<output ref="out">0</output>',
  mount({ el, refs, internals }) {
    refs.out.textContent = el.value;
    internals.setFormValue(String(el.value));
  },
  update({ name, val, refs, internals }) {
    if (name !== 'value') return;
    refs.out.textContent = val;
    internals.setFormValue(String(val));
  },
  reset() {
    this.value = 0;
  },
  disabled(disabled) {
    this.toggleAttribute('aria-disabled', disabled);
  },
  restore(state) {
    this.value = Number(state) || 0;
  }
});
```

`restore` gets the saved form value when the browser restores the form, for example after back/forward navigation.

## Custom state

A prop with `state: true` adds a custom state named after the prop while its value is truthy. It needs `form: true`, because custom states live on `ElementInternals`.

```javascript
const props = {
  checked: { type: Boolean, state: true },
  invalid: { type: Boolean, state: true }
};
```

```css
toggle-switch:state(checked) { background: green; }
toggle-switch:state(invalid) { border-color: red; }
```

## Validation

`internals` is in the `change` context too:

```javascript
view('email-field', {
  form: true,
  props: {
    value: { type: String, reflect: false }
  },
  on: {
    change({ name, val, internals }) {
      if (name !== 'value') return;
      internals.setFormValue(val);
      if (val && !val.includes('@')) {
        internals.setValidity({ typeMismatch: true }, 'Enter a valid email address');
      } else {
        internals.setValidity({});
      }
    }
  }
});
```

## Related

- [Elements](../elements/index.md#forms): the shipped form controls (`ui-input`, `ui-select`, `ui-checkbox` and others).
- [element() factory](factory.md)
- [Props](props.md#custom-state-state)
