---
seo_title: "Toggle — Anza"
description: "ui-toggle: a form-associated on/off switch with role=switch, change events, form reset and an on custom state."
---

# Toggle

A form-associated on/off switch.

**Tag:** `ui-toggle` · **Import:** `@anzaui/anza/elements/toggle`

## Usage

```javascript
import '@anzaui/anza/elements/toggle';
```

```html
<form>
  <ui-toggle name="notifications" checked>Email notifications</ui-toggle>
</form>
```

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | none | Plain attribute (not a property). The form field name. |
| `checked` | Boolean | `false` | Whether the switch is on. |
| `value` | String | `on` when empty | Submitted value when on. |
| `disabled` | Boolean | `false` | Ignores clicks and keys and removes the element from the tab order. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The label, shown next to the track. Clicking it toggles the switch. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `change` | none | The user toggles the switch by click, Space or Enter. Fires after `checked` and the form value update. Bubbles and is composed. |

Setting `checked` from code does not fire `change`.

## Form behaviour

- When on, the form value is `value` (or `on`). When off, nothing is submitted.
- There is no `required` validation.
- Form reset restores the `checked` attribute as it was at first mount.
- Inside a disabled `<fieldset>` the element removes its `tabindex`.
- On browser state restore, any non-null state turns the switch on.

## Keyboard and accessibility

The host gets `role="switch"` and `tabindex="0"` unless it already has them, and `aria-checked` follows `checked`. The host is the only tab stop; its `tabindex` is removed and `aria-disabled="true"` is set while disabled. Space and Enter toggle the switch.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `track` | The switch track |
| `thumb` | The sliding thumb |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--switch-bg` | `var(--color-border-strong)` |
| `--switch-bg-on` | `var(--color-interactive)` |
| `--switch-thumb-color` | `var(--color-content-inverse)` |
| `--switch-width` | `var(--space-10)` |
| `--switch-height` | `var(--space-6)` |
| `--switch-thumb-size` | `calc(var(--switch-height) - var(--space-1))` |

### States

| State | When |
| ----- | ---- |
| `on` | `checked` is true |
| `disabled` | `disabled` is true |
| `checked` | `checked` is true (same as `on`). |

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Checkbox](checkbox.md)
