---
seo_title: "Form — Anza"
description: "ui-form: a wrapper that collects named form-associated controls into a JSON payload and can queue it while offline. Read the known issues."
---

# Form

A wrapper that collects its form-associated controls into a JSON payload, sends it, and can queue it while offline.

**Tag:** `ui-form` · **Import:** `@anzaui/anza/elements/form`

Read [Known issues](#known-issues) before using it. In the current code nothing inside `ui-form` can trigger its submit, and the online request always fails.

## Usage

```javascript
import '@anzaui/anza/elements/form';
```

```html
<ui-form action="/api/profile" method="PUT" offline>
  <ui-input name="name" required></ui-input>
  <ui-toggle name="newsletter">Newsletter</ui-toggle>
</ui-form>
```

## Attributes

All attributes reflect to properties of the same name. `action` and `method` are also copied to the inner `<form>` when set.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `action` | String | the current page URL | Request URL. |
| `method` | String | `POST` | Request method, upper-cased. |
| `offline` | Boolean | `false` | When the connectivity check fails, queue the payload instead of sending it. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The controls. They stay in the light DOM. |

## Events

All events bubble and are composed.

| Event | Detail | When |
| ----- | ------ | ---- |
| `invalid` | none | A control's `reportValidity()` returned `false`. |
| `submit-start` | `{ payload }` | The payload is built, before the connectivity check. |
| `success` | the response | The request finished. |
| `submit-error` | the error | The request or the queueing failed. |
| `offline-queued` | `{ syncId, payload }` | `offline` is set, the check reports offline, and the payload was queued. |

## Submit steps

When the inner `<form>` fires `submit`, the element:

1. Prevents the native submission.
2. Finds every descendant whose class has `formAssociated` (for example `ui-input`, `ui-checkbox`, `ui-button`).
3. Calls `reportValidity()` on each control that has one. If any returns `false`, fires `invalid` and stops.
4. Builds `payload` as `{ [name]: control.value }` for each control with a `name` attribute. Native `<input>` elements are not included. Checkboxes and toggles give their `value` whether or not they are checked.
5. Fires `submit-start`.
6. Runs the connectivity check (a `HEAD` request to `/favicon.ico`, cached for 10 seconds).
7. Offline with `offline` set: pushes a task named `offline-form-submit` to the offline queue (`url`, `method`, JSON `Content-Type` header, `body: payload`), registers the Background Sync tag `pending` when a service worker supports it, then fires `offline-queued`.
8. Otherwise: sends `payload` as a JSON body and fires `success` or `submit-error`.

## Known issues

- The `<form>` is in the shadow root, so light-DOM children do not belong to it. A `ui-button type="submit"`, a native submit button or Enter in a field inside `ui-form` does not submit it. The only trigger is `el.shadowRoot.querySelector('form').requestSubmit()`.
- Step 8 calls the shared `pipeline` object as a function, but it is a `Pipeline` instance. The call throws a `TypeError`, so an online submit always ends in `submit-error`.
- The kit controls do not define `reportValidity()`, so step 3 skips them and `required` is not checked.

For working form submission, put the controls in a native `<form>`. See [Form-associated elements](../ui/form-associated.md).

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `form` | The inner `<form>`, a flex column with `var(--space-4)` gaps |

`ui-form` declares no custom properties and no custom states.

## Related

- [Elements](index.md#forms)
- [Form-associated elements](../ui/form-associated.md)
- [Sync](../sw/sync.md)
