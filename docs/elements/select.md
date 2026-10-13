---
seo_title: "Select — Anza"
description: "ui-select: a form-associated dropdown that lists slotted options in a native popover and fires change on selection."
---

# Select

A form-associated dropdown: a trigger button opens a popover that lists the slotted options.

**Tag:** `ui-select` · **Import:** `@anzaui/anza/elements/select`

## Usage

```javascript
import '@anzaui/anza/elements/select';
```

```html
<form>
  <ui-select name="role" placeholder="Choose a role" required>
    <button type="button" value="admin">Admin</button>
    <button type="button" value="editor">Editor</button>
  </ui-select>
</form>
```

Each child element is an option. Its `value` attribute, or its trimmed text when there is none, is the option value. The trigger shows the selected option's text.

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | none | Plain attribute (not a property). The form field name. |
| `value` | String | none | The selected value. The matching option gets a `selected` attribute; the others lose it. |
| `placeholder` | String | none | Trigger text when no option matches. Falls back to `Select option...`. |
| `required` | Boolean | `false` | The value must not be empty. |
| `disabled` | Boolean | `false` | Disables the trigger and ignores option clicks. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The options, shown inside the popover. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `change` | none | The user clicks an option with a different value. Fires after `value`, the trigger label and the form value update. Bubbles and is composed. |

Clicking an option closes the popover. Setting `value` from code does not fire `change`.

## Form behaviour

- The form value is `value`, or an empty string when nothing is selected.
- With `required` and no value, validity is `valueMissing` with the message "Please select an option."
- Form reset restores the `value` attribute as it was at first mount (empty if there was none).
- Inside a disabled `<fieldset>` the trigger is disabled.
- On browser state restore, a string state becomes the `value`.

## Keyboard and accessibility

The trigger is a native `<button popovertarget>`, so Enter and Space open the list and Escape or a click outside closes it. There is no arrow-key navigation. Use focusable options (such as `<button type="button">`) so Tab and Enter can pick them.

## Popover and positioning

The list uses the native Popover API. On mount the element calls the platform `guard.popover()`, which loads the popover polyfill where `HTMLElement.prototype.popover` is missing. The list is placed under the trigger with CSS anchor positioning. Without anchor support, the element sets the list's `top`, `left` and `width` from the trigger's position each time it opens. See [Guards](../platform/guards.md#popover).

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `button` | The trigger `<button>` |
| `popover` | The popover list container |

Slotted `option` and `div` children get padding and a hover background. A slotted child with `selected` is highlighted. Style other option elements yourself, for example `ui-select > [selected]`.

### Custom properties

| Property | Default |
| -------- | ------- |
| `--select-bg` | `var(--color-surface-page)` |
| `--select-border` | `var(--color-border-default)` |
| `--select-border-focus` | `var(--color-border-focus)` |
| `--select-radius` | `var(--radius-md)` |
| `--select-font-size` | `var(--font-size-base)` |
| `--select-padding-y` | `var(--space-2)` |
| `--select-padding-x` | `var(--space-3)` |
| `--select-text-color` | `var(--color-content-primary)` |

### States

| State | When |
| ----- | ---- |
| `disabled` | The `disabled` property is true, including from a `disabled` attribute in the markup. |

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Overlay](overlay.md)
- [Guards](../platform/guards.md)
