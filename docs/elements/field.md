---
seo_title: "Field — Anza"
description: "ui-field: a layout wrapper that places a label, hint, form control and error message in one column."
---

# Field

A layout wrapper that stacks a label, a hint, a form control and an error message.

**Tag:** `ui-field` · **Import:** `@anzaui/anza/elements/field`

## Usage

```javascript
import '@anzaui/anza/elements/field';
```

```html
<ui-field label="Email" required>
  <span slot="hint">We never share your address.</span>
  <ui-input name="email" type="email" required></ui-input>
  <span slot="error">Enter a valid email address.</span>
</ui-field>
```

`ui-field` is not form-associated and does not read the control's validity. It does not set `required` on the control, and its `<label>` is not linked to the control for assistive technology.

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `label` | String | none | Label text. Used only when the `label` slot is empty. |
| `required` | Boolean | `false` | Shows a `*` after the label. |

## Slots

| Slot | Content |
| ---- | ------- |
| `label` | Label content. Takes the place of the `label` attribute. |
| `hint` | Help text under the label. |
| (default) | The form control. |
| `error` | Error text under the control. It is always shown; add or remove it yourself. |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `label` | The `<label>` with the label text and the required marker |
| `hint` | The wrapper around the `hint` slot |
| `control` | The wrapper around the default slot |
| `error` | The wrapper around the `error` slot |

`ui-field` declares no custom properties and no custom states.

## Related

- [Elements](index.md#forms)
- [Input](input.md)
- [Form](form.md)
