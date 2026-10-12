---
seo_title: "Steps — Anza"
description: "ui-steps — linear step indicator: steps before active are completed, a progress line fills to the active step."
---

# Steps

A horizontal step indicator with a progress line.

**Tag:** `ui-steps` · **Import:** `@anzaui/anza/elements/steps`

## Usage

```javascript
import '@anzaui/anza/elements/steps';
```

```html
<ui-steps active="1">
  <div>Account</div>
  <div>Billing</div>
  <div>Confirm</div>
</ui-steps>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `active` | Number | `0` | Index of the current step, 0-based. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | The steps, one direct child each |

Each step gets `role="step"` and a `state` attribute: `completed` for steps before `active`, `active` for the current step, none for later steps. Every step shows a circle before its content; completed steps show a check mark and the active step a focus ring. The progress line fills to `active / (steps - 1)`.

Steps are not interactive. Change `active` to move between them.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `line` | The background line |
| `line-fill` | The filled part of the line |
| `container` | The step wrapper |

Style a step's state from outside with an attribute selector, for example `ui-steps > [state="completed"]`.

## Related

- [Elements](index.md#navigation)
- [Tabs](tabs.md)
