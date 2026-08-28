# Once

`events.once` waits for a single event occurrence and resolves a promise with the event object. It uses the native `once: true` listener option and supports AbortSignal cancellation.

## Signature

```javascript
const event = await once(target, type, options);
```

| Param | Type | Description |
| ------- | ------ | ------------- |
| `target` | EventTarget | Element, window, document, or bus |
| `type` | string | Event name |
| `options` | object | `addEventListener` options plus `signal` |

Returns a `Promise<Event>`.

## Basic Use

```javascript
import { events } from '@anzaui/anza/events';

// Wait for one click
const click = await events.once(document.body, 'click');
console.log('Clicked at', click.clientX, click.clientY);
```

## With AbortSignal

Cancel the wait if the user navigates away:

```javascript
const ctrl = new AbortController();

try {
  const click = await events.once(dialog, 'click', {
    signal: ctrl.signal
  });
  handleClick(click);
} catch (err) {
  console.log('Dialog closed before click');
}

// Later — aborts the pending promise
ctrl.abort();
```

Aborting rejects the promise with `'Operation aborted'`.

## Use Cases

### Confirm before action

```javascript
async function confirmDelete() {
  showDialog('Are you sure?');
  const click = await events.once(document, 'click');
  return click.target.matches('.confirm-btn');
}
```

### Wait for element to connect

```javascript
await events.once(document.body, 'my-element-connected');
```

### One-off analytics

```javascript
const interaction = await events.once(form, 'submit');
logFirstInteraction(interaction);
```

## Options

Pass standard `addEventListener` options:

```javascript
const click = await events.once(document, 'click', {
  capture: true,
  signal: ctrl.signal
});
```

## Already Aborted Signal

If the signal is already aborted, the promise rejects immediately:

```javascript
const ctrl = new AbortController();
ctrl.abort();

// Rejects immediately — no listener is registered
events.once(document, 'click', { signal: ctrl.signal });
```
