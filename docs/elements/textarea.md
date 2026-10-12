---
seo_title: "Textarea — Anza"
description: "ui-textarea: a form-associated multi-line text control with native validation, optional auto-resize and form reset."
---

# Textarea

A form-associated multi-line text control that wraps a native `<textarea>` and can grow with its content.

**Tag:** `ui-textarea` · **Import:** `@anzaui/anza/elements/textarea`

## Usage

```javascript
import '@anzaui/anza/elements/textarea';
```

```html
<form>
  <ui-textarea name="bio" rows="4" maxlength="500" autoresize></ui-textarea>
</form>
```

## Attributes

All attributes reflect to properties of the same name. `placeholder`, `required`, `minlength`, `maxlength` and `rows` are copied to the inner `<textarea>`.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | none | Plain attribute (not a property). The form field name. |
| `value` | String | none | Current value. Typing updates the property and the attribute. |
| `placeholder` | String | none | Placeholder text. |
| `required` | Boolean | `false` | The value must not be empty. |
| `minlength` | Number | none | Minimum length. |
| `maxlength` | Number | none | Maximum length. |
| `rows` | Number | none | Visible rows. |
| `autoresize` | Boolean | `false` | Sets the height to fit the content on input and on resize, and turns off the manual resize handle. |
| `disabled` | Boolean | `false` | Disables the inner textarea. |

## Slots

| Slot | Content |
| ---- | ------- |
| `error` | Error text shown under the textarea. It is always shown; add or remove it yourself. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `input` | none | Native `input` from the inner textarea, retargeted to the host. The `value` property and form value are already updated. |
| `change` | none | The inner textarea fires `change` (on commit, for example blur). Re-dispatched from the host. Bubbles and is composed. |

## Form behaviour

- The form value is the inner textarea's value, an empty string when empty.
- Validity is copied from the inner textarea, with the browser's own messages (`valueMissing`, `tooShort`, `tooLong`).
- Form reset restores the `value` attribute as it was at first mount (empty if there was none).
- Inside a disabled `<fieldset>` the inner textarea is disabled too.
- On browser state restore, a string state becomes the `value`.

## Keyboard and accessibility

Focus and keys go to the native `<textarea>` in the shadow root. Add `aria-label` when there is no visible label.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `textarea` | The inner `<textarea>` |
| `error-box` | The wrapper around the `error` slot |

### Custom properties

The stylesheet reads these properties but declares no defaults, so set them yourself (on `ui-textarea` or an ancestor):

| Property | Default |
| -------- | ------- |
| `--textarea-bg` | none |
| `--textarea-border` | none |
| `--textarea-border-focus` | none |
| `--textarea-radius` | none |
| `--textarea-font-size` | none |
| `--textarea-padding-y` | none |
| `--textarea-padding-x` | none |
| `--textarea-text-color` | none |

### States

| State | When |
| ----- | ---- |
| `disabled` | The `disabled` property changes to true. A `disabled` attribute already in the markup when the element upgrades does not add the state. |

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Input](input.md)
- [Field](field.md)
