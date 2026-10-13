---
seo_title: "Checkbox — Anza"
description: "ui-checkbox: a form-associated checkbox with an indeterminate state, required validation, change events and form reset."
---

# Checkbox

A form-associated checkbox with checked, indeterminate and disabled states.

**Tag:** `ui-checkbox` · **Import:** `@anzaui/anza/elements/checkbox`

## Usage

```javascript
import '@anzaui/anza/elements/checkbox';
```

```html
<form>
  <ui-checkbox name="terms" value="accepted" required>I accept the terms</ui-checkbox>
</form>
```

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | none | Plain attribute (not a property). The form field name. |
| `checked` | Boolean | `false` | Whether the box is checked. |
| `indeterminate` | Boolean | `false` | Shows a dash. Ignored while `checked` is true. Cleared when the user toggles the box. |
| `value` | String | `on` when empty | Submitted value when checked. |
| `required` | Boolean | `false` | The box must be checked. |
| `disabled` | Boolean | `false` | Ignores clicks and keys and removes the element from the tab order. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The label, shown next to the box. Clicking it toggles the box. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `change` | none | The user toggles the box by click, Space or Enter. Fires after `checked` and the form value update. Bubbles and is composed. |

Setting `checked` from code does not fire `change`.

## Form behaviour

- When checked, the form value is `value` (or `on`). When unchecked, nothing is submitted.
- With `required` and unchecked, validity is `valueMissing` with the message "You must check this box."
- Form reset restores the `checked` attribute as it was at first mount and clears `indeterminate`.
- Inside a disabled `<fieldset>` the element removes its `tabindex`.
- On browser state restore, any non-null state checks the box.

## Keyboard and accessibility

The host is the only tab stop: it gets `tabindex="0"` unless it already has one, and the `tabindex` is removed while disabled. It also gets `role="checkbox"` unless it has a role. `aria-checked` follows the state (`true`, `false`, or `mixed` while `indeterminate`), and `aria-disabled="true"` is set while disabled. Space and Enter toggle the box.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `box` | The square that holds the check mark and the dash |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--check-bg` | `var(--color-surface-page)` |
| `--check-bg-checked` | `var(--color-interactive)` |
| `--check-border` | `var(--color-border-default)` |
| `--check-border-focus` | `var(--color-border-focus)` |
| `--check-radius` | `var(--radius-sm)` |
| `--check-size` | `var(--space-5)` |
| `--check-color` | `var(--color-content-inverse)` |

### States

| State | When |
| ----- | ---- |
| `checked` | `checked` is true |
| `indeterminate` | `indeterminate` is true and `checked` is false |
| `disabled` | `disabled` is true |

```css
ui-checkbox:state(checked)::part(box) {
  border-width: 2px;
}
```

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Toggle](toggle.md)
- [Radio](radio.md)
