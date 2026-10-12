---
seo_title: "Radio — Anza"
description: "ui-radio: a form-associated radio button. Radios with the same name in the same root form one group."
---

# Radio

A form-associated radio button. Checking one radio unchecks the others with the same `name`.

**Tag:** `ui-radio` · **Import:** `@anzaui/anza/elements/radio`

## Usage

```javascript
import '@anzaui/anza/elements/radio';
```

```html
<form>
  <ui-radio name="plan" value="free" checked>Free</ui-radio>
  <ui-radio name="plan" value="pro">Pro</ui-radio>
</form>
```

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | none | Group name and form field name. |
| `value` | String | `on` when empty | Submitted value when checked. |
| `checked` | Boolean | `false` | Whether this radio is selected. Setting it to true unchecks the rest of the group. |
| `disabled` | Boolean | `false` | Ignores clicks and keys and removes the element from the tab order. |

A group is every `ui-radio` with the same `name` in the same root node (the document, or the shadow root the radio is in). The group is not limited to one form. A radio without `name` is not grouped.

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The label, shown next to the circle. Clicking it selects the radio. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `change` | none | The user selects an unchecked radio by click, Space or Enter. Fires after `checked` and its form value update. Bubbles and is composed. |
| `change` | none | Fired on each radio in the group that gets unchecked, whether by the user or by setting `checked` on another radio from code. |

Clicking a radio that is already checked does nothing.

## Form behaviour

- A checked radio submits `name=value` (or `name=on`). An unchecked radio submits nothing.
- There is no `required` validation.
- Form reset restores the `checked` attribute as it was at first mount.
- Inside a disabled `<fieldset>` the element removes its `tabindex`.
- On browser state restore, any non-null state checks the radio.

## Keyboard and accessibility

The host gets `role="radio"` and `tabindex="0"` unless it already has them, and `aria-checked` follows `checked`. The `tabindex` is removed while disabled. Space and Enter select the radio. Every radio is its own tab stop and there is no arrow-key navigation. Wrap the group in an element with `role="radiogroup"` and a label. The inner `circle` part also has `tabindex="0"`, which adds a second tab stop.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `circle` | The circle that holds the dot |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--radio-bg` | `var(--color-surface-page)` |
| `--radio-bg-checked` | `var(--color-interactive)` |
| `--radio-border` | `var(--color-border-default)` |
| `--radio-border-focus` | `var(--color-border-focus)` |
| `--radio-radius` | `var(--radius-full)` |
| `--radio-size` | `var(--space-5)` |
| `--radio-color` | `var(--color-content-inverse)` |

### States

| State | When |
| ----- | ---- |
| `checked` | `checked` is true |
| `disabled` | `disabled` is true |

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Checkbox](checkbox.md)
