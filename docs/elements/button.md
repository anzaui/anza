---
seo_title: "Button — Anza"
description: "ui-button: a form-associated button with disabled and loading states, submit and reset types, and an activate event."
---

# Button

A form-associated button that can submit or reset its form and fires `activate` when clicked.

**Tag:** `ui-button` · **Import:** `@anzaui/anza/elements/button`

## Usage

```javascript
import '@anzaui/anza/elements/button';
```

```html
<form action="/posts" method="post">
  <ui-button type="submit" name="action" value="publish">Publish</ui-button>
  <ui-button type="reset">Clear</ui-button>
</form>
```

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `type` | String | `button` | `button`, `submit` or `reset`. Copied to the inner `<button>`. |
| `value` | String | none | Sent as `name=value` when this button submits the form. |
| `disabled` | Boolean | `false` | Disables the inner `<button>`. Clicks do nothing. |
| `loading` | Boolean | `false` | Clicks do nothing. Dims the button and shows a wait cursor. |
| `name` | String | none | Plain attribute (not a property). When present, the button adds `name=value` to the submission. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The button label. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `activate` | none | The inner button is clicked while not `disabled` or `loading`, after any submit or reset. Bubbles and is composed. |

Clicks on the inner button while `disabled` or `loading` are stopped (`preventDefault()` and `stopPropagation()`).

## Form behaviour

- `type="submit"` calls `form.requestSubmit()` on the button's form. If the button has a `name` attribute, `name=value` (empty string when `value` is unset) is in the submitted `FormData`, and is removed again right after.
- `type="reset"` calls `form.reset()`.
- `type="button"`, or a button outside a form, only fires `activate`.
- A custom element cannot be the `submitter` of `requestSubmit()`, so `event.submitter` on the `submit` event is `null`.

## Keyboard and accessibility

The focusable control is the native `<button>` in the shadow root, so Tab, Enter and Space work as on a native button.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `button` | The inner `<button>` |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--btn-bg` | `var(--color-interactive)` |
| `--btn-bg-hover` | `var(--color-interactive-hover)` |
| `--btn-bg-active` | `var(--color-interactive-active)` |
| `--btn-bg-disabled` | `var(--color-interactive-disabled)` |
| `--btn-color` | `var(--color-content-inverse)` |
| `--btn-radius` | `var(--radius-md)` |
| `--btn-font` | `var(--font-sans)` |
| `--btn-size` | `var(--font-size-sm)` |
| `--btn-weight` | `var(--font-weight-medium)` |
| `--btn-padding-y` | `var(--space-2)` |
| `--btn-padding-x` | `var(--space-4)` |

### States

| State | When |
| ----- | ---- |
| `disabled` | The `disabled` property is true |
| `loading` | The `loading` property is true |

Both states follow the property, including a `disabled` or `loading` attribute already in the markup.

## Related

- [Elements](index.md#primitives)
- [Form-associated elements](../ui/form-associated.md)
- [Form](form.md)
