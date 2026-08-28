# Form

Form orchestrator that validates form-associated children, submits JSON via the API pipeline, and can queue offline.

**Tag:** `ui-form` · **Import:** `@anzaui/anza/elements/form`

## Import

```javascript
import '@anzaui/anza/elements/form';
```

## Basic usage

```html
<ui-form action="/api/profile" method="POST" offline>
  <ui-field label="Name" required>
    <ui-input name="name" required></ui-input>
  </ui-field>
  <ui-button type="submit">Save</ui-button>
</ui-form>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `action` | String | Reflect | Submit URL (default current location) |
| `method` | String | Reflect | HTTP method (default `POST`) |
| `offline` | Boolean | Reflect | Queue payload when offline instead of failing |

## Events

| Event | When |
| ----- | ---- |
| `invalid` | Validation failed via `reportValidity` on a child |
| `submit-start` | About to submit — `detail.payload` |
| `success` | Online submit succeeded — `detail` is the response |
| `submit-error` | Submit or queue failed |
| `offline-queued` | Queued for background sync — `detail.syncId` |

## Notes

Collects descendants with `formAssociated` constructors. Payload keys come from each control’s `name` attribute and `.value`.

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Form association](../ui/forms.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
