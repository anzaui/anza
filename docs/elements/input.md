---
seo_title: "Input — Anza"
description: "ui-input: a form-associated single-line text control that mirrors a native input, its validation and form reset."
---

# Input

A form-associated single-line text control that wraps a native `<input>` and reports its validity to the form.

**Tag:** `ui-input` · **Import:** `@anzaui/anza/elements/input`

## Usage

```javascript
import '@anzaui/anza/elements/input';
```

```html
<form>
  <ui-input name="email" type="email" placeholder="you@example.com" required>
    <span slot="error">Enter a valid email address.</span>
  </ui-input>
</form>
```

## Attributes

All attributes reflect to properties of the same name. Every one except `value` and `disabled` is copied to the inner `<input>`.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | none | Plain attribute (not a property). The form field name. |
| `type` | String | `text` | Inner input type, for example `text`, `email`, `password`, `number`. |
| `value` | String | none | Current value. Typing updates the property and the attribute. |
| `placeholder` | String | none | Placeholder text. |
| `required` | Boolean | `false` | The value must not be empty. |
| `minlength` | Number | none | Minimum length. |
| `maxlength` | Number | none | Maximum length. |
| `min` | Number | none | Minimum value. Parsed as a number, so it only works for numeric types such as `number` and `range`. |
| `max` | Number | none | Maximum value. Parsed as a number, like `min`. |
| `pattern` | String | none | Regular expression the value must match. |
| `disabled` | Boolean | `false` | Disables the inner input. |

## Slots

| Slot | Content |
| ---- | ------- |
| `error` | Error text shown under the input. It is always shown; add or remove it yourself. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `input` | none | Native `input` from the inner input, retargeted to the host. The `value` property and form value are already updated. |
| `change` | none | The inner input fires `change` (on commit, for example blur). Re-dispatched from the host. Bubbles and is composed. |

## Form behaviour

- The form value is the inner input's value, an empty string when empty. It updates on every keystroke and every `value` change.
- Validity is copied from the inner input, with the browser's own messages (`valueMissing`, `typeMismatch`, `tooShort`, `patternMismatch` and so on). `form.checkValidity()` and `:invalid` see it.
- Form reset restores the `value` attribute as it was at first mount (empty if there was none).
- Inside a disabled `<fieldset>` the inner input is disabled too.
- On browser state restore (back/forward, autofill), a string state becomes the `value`.

## Keyboard and accessibility

Focus and keys go to the native `<input>` in the shadow root. Use [Field](field.md) for a visible label; it does not connect the label to the input for assistive technology, so add `aria-label` if needed.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `input` | The inner `<input>` |
| `error-box` | The wrapper around the `error` slot |

### Custom properties

The stylesheet reads these properties but declares no defaults, so set them yourself (on `ui-input` or an ancestor):

| Property | Default |
| -------- | ------- |
| `--input-bg` | none |
| `--input-border` | none |
| `--input-border-focus` | none |
| `--input-radius` | none |
| `--input-font-size` | none |
| `--input-padding-y` | none |
| `--input-padding-x` | none |
| `--input-text-color` | none |

### States

| State | When |
| ----- | ---- |
| `disabled` | The `disabled` property changes to true. A `disabled` attribute already in the markup when the element upgrades does not add the state. |

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Field](field.md)
- [Textarea](textarea.md)
