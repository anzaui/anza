# Forms

Declarative elements can participate in HTML forms by declaring `form: true`. The element gains `ElementInternals`, form-associated callbacks, and the ability to expose custom state pseudo-classes.

## Enabling Form Participation

```javascript
view('toggle-switch', {
  form: true,
  props: {
    checked: { type: Boolean, state: true }
  },
  template: `
    <button type="button" role="switch" ref="btn">
      <span ref="label">Off</span>
    </button>
  `,
  on: {
    connect({ el, refs, internals }) {
      refs.btn.addEventListener('click', () => {
        el.checked = !el.checked;
        internals.setFormValue(el.checked ? 'on' : '');
        refs.label.textContent = el.checked ? 'On' : 'Off';
      });
    }
  }
});
```

Use it in a form:

```html
<form>
  <toggle-switch name="notifications"></toggle-switch>
  <button type="submit">Save</button>
</form>
```

## Form-Associated Callbacks

When `form: true` is set, the element receives these callbacks:

| Callback | Trigger |
| ---------- | --------- |
| `associated` | Element is associated with a form |
| `disabled` | Form disabled state changes |
| `reset` | Form is reset |
| `restore` | Form state is restored |

```javascript
view('custom-input', {
  form: true,
  associated: (form) => { console.log('associated with', form); },
  disabled: (value) => { this.disabled = value; },
  reset: () => { this.value = ''; },
  restore: (state, mode) => { this.value = state; }
});
```

## Custom State

Expose props as CSS custom state pseudo-classes:

```javascript
props: {
  checked: { type: Boolean, state: true },
  invalid: { type: Boolean, state: true }
}
```

Style in CSS:

```css
toggle-switch:state(checked) { background: green; }
toggle-switch:state(invalid) { border-color: red; }
```

Requires Chrome 132+ / Baseline 2026.

## Validation

Use `ElementInternals` for custom validation:

```javascript
view('email-field', {
  form: true,
  props: {
    value: { type: String }
  },
  on: {
    change({ name, val, internals }) {
      if (name === 'value') {
        if (!val.includes('@')) {
          internals.setValidity(
            { valueMissing: false, typeMismatch: true },
            'Please enter a valid email'
          );
        } else {
          internals.setValidity({});
        }
      }
    }
  }
});
```

## Form Reset and Restore

```javascript
view('rating-input', {
  form: true,
  props: {
    value: { type: Number, default: 0 }
  },
  reset: () => { this.value = 0; },
  restore: (state) => { this.value = Number(state) || 0; }
});
```

The `restore` callback receives the saved state string when the browser restores form data (e.g., after back/forward).

## Related

- Kit form controls: [Elements → Forms](../elements/forms.md) (`ui-input`, `ui-select`, `ui-checkbox`, …)
- [UI `element()` factory](elements.md)