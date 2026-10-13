---
seo_title: "Form — Anza"
description: "ui-form: a wrapper that submits its slotted controls as a JSON, query-string or multipart request and can queue the payload while offline."
---

# Form

A wrapper that submits the controls inside it, sends them, and can queue the payload while offline.

**Tag:** `ui-form` · **Import:** `@anzaui/anza/elements/form`

## Usage

```javascript
import '@anzaui/anza/elements/form';
```

```html
<ui-form action="/api/profile" method="PUT" offline>
  <ui-input name="name" required></ui-input>
  <ui-toggle name="newsletter">Newsletter</ui-toggle>
  <ui-button type="submit">Save</ui-button>
</ui-form>
```

The inner `<form>` is in the shadow root, so the slotted controls do not belong to it. `ui-form` does the form's job itself. A submission starts when:

- a submit button inside it is clicked: `ui-button type="submit"`, a `<button>` whose type is `submit` or missing, or `<input type="submit">`/`type="image"`;
- Enter is pressed in a single-line text field (`ui-input` or a native text-like `<input>`);
- script calls `el.requestSubmit(submitter?)`.

Disabled buttons do not submit. Controls inside a nested `ui-form` or owned by a native `<form>` are left to that form.

## Attributes

All attributes reflect to properties of the same name. `action` and `method` are also copied to the inner `<form>` when set.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `action` | String | the current page URL | Request URL. |
| `method` | String | `POST` | Request method, upper-cased. |
| `offline` | Boolean | `false` | When the connectivity check fails, queue the payload instead of sending it. |

## Methods

| Method | Description |
| ------ | ----------- |
| `requestSubmit(submitter?)` | Runs the [submit steps](#submit-steps). `submitter`, a submit button inside the form, adds its `name=value`. Returns a promise that settles when the submission ends. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The controls. They stay in the light DOM. |

## Events

All events bubble and are composed.

| Event | Detail | When |
| ----- | ------ | ---- |
| `invalid` | none | A control's `reportValidity()` returned `false`. |
| `submit-start` | `{ payload, formData, submitter }` | The data is built, before the connectivity check. `submitter` is the button that submitted, or `null`. |
| `success` | the `Response` | The request finished with an OK status. |
| `submit-error` | the error | The request failed (network error, or a `PlatformError` with code `HTTP_ERROR` for a non-OK status) or the queueing failed. |
| `offline-queued` | `{ syncId, payload }` | `offline` is set, the check reports offline, and the payload was queued. |

## Submit steps

1. Finds the controls inside the element, in tree order: native `<input>`, `<select>`, `<textarea>` and `<button>`, and every form-associated custom element (for example `ui-input`, `ui-checkbox`, `ui-button`).
2. Checks the validity of every enabled control (kit controls through their `ElementInternals`). If one is invalid, calls `reportValidity()` on the first one, which shows its message, fires `invalid` and stops.
3. Builds a `FormData` the way a native form does: disabled controls are skipped; checkboxes and radios count only when checked; buttons count only as the submitter. A kit control contributes exactly the value it gave `setFormValue()`, so an unchecked `ui-checkbox` or `ui-toggle` sends nothing.
4. Builds `payload`, a plain object of the same entries. A name used more than once becomes an array.
5. Fires `submit-start`.
6. Runs the connectivity check (a `HEAD` request to `/favicon.ico`, cached for 10 seconds).
7. Offline with `offline` set: pushes a task named `offline-form-submit` to the offline queue (`url`, `method`, JSON `Content-Type` header, `body: payload`), registers the Background Sync tag `pending` when a service worker is registered and supports it, then fires `offline-queued`.
8. Otherwise sends the request through the shared API [pipeline](../api/pipeline.md) and fires `success` or `submit-error`. `GET` and `HEAD` put the text fields in the query string. A form with a file sends the `FormData` as `multipart/form-data`. Every other form sends `payload` as a JSON body.

The request has no retries, and it is aborted if the element disconnects.

For a plain native submission (page navigation), put the controls in a native `<form>` instead. See [Form-associated elements](../ui/form-associated.md).

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
