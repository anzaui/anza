---
seo_title: "Tabs — Anza"
description: "ui-tabs — tablist with roving tabindex, arrow, Home and End keys, and panels shown by the active value."
---

# Tabs

A tab list that shows one panel at a time.

**Tag:** `ui-tabs` · **Import:** `@anzaui/anza/elements/tabs`

## Usage

```javascript
import '@anzaui/anza/elements/tabs';
```

```html
<ui-tabs active="billing">
  <button slot="tab" value="profile">Profile</button>
  <button slot="tab" value="billing">Billing</button>
  <section role="tabpanel">Profile settings</section>
  <section role="tabpanel">Billing settings</section>
</ui-tabs>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `active` | String | — | Value of the selected tab. A tab's value is its `value` attribute, or its trimmed text. Without it the first tab is selected. |

Clicking a tab or moving to it with the keyboard sets `active`.

## Slots

| Slot | Content |
| ---- | ------- |
| `tab` | The tabs. Each gets `role="tab"`. |
| default | The panels, in tab order. Only direct children with `role="tabpanel"` or the tag `ui-tab-panel` count as panels. |

Panels are matched to tabs by position. The panel at the selected tab's index gets the class `active` and `aria-hidden="false"`; the others get `aria-hidden="true"`. Only `role="tabpanel"` panels are hidden by the element's CSS.

## Keyboard and accessibility

| Key | Action |
| --- | ------ |
| Arrow Right / Arrow Left | Focus and select the next / previous tab, wrapping around |
| Home / End | Focus and select the first / last tab |

The tab list has `role="tablist"`. The selected tab has `aria-selected="true"` and `tabindex="0"`; the others have `aria-selected="false"` and `tabindex="-1"`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `tablist` | The `role="tablist"` wrapper |
| `panels` | The panel wrapper |

## Related

- [Elements](index.md#navigation)
- [Steps](steps.md)
