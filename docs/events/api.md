# API Reference

Complete reference for the events facade and internal utilities.

---

## Facade

```javascript
import { events } from '@adukiorg/anza/events';
```

### `events.on(type, handler, signal)`

Subscribe to the global event bus. Returns a disposer.

```javascript
const off = events.on('update', (e) => { ... });
off(); // remove
```

### `events.emit(type, detail)`

Emit a global event.

```javascript
events.emit('update', { value: 42 });
```

### `events.listen(target, type, handler, options)`

Memory-safe DOM listener. Returns a disposer.

```javascript
const off = events.listen(el, 'click', handler, { signal: ctrl.signal });
```

### `events.delegate(root, selector, type, handler, options)`

Shadow-aware event delegation via `composedPath()`. Options include `signal`, `attrs`, `not`, `key`, `scope`. Returns a disposer.

```javascript
const off = events.delegate(document.body, '.btn', 'click', handler, {
  signal: ctrl.signal,
  attrs: { 'data-action': 'save' },
  not: '.ignore',
  key: 'save'
});
```

### `events.once(target, type, options)`

Promise-wrapped single event.

```javascript
const event = await events.once(document, 'click');
```

### `events.names`

System event name constants:

```javascript
events.names.auth.signedin       // 'auth:signedin'
events.names.auth.signedout      // 'auth:signedout'
events.names.auth.refreshed      // 'auth:refreshed'
events.names.connectivity.online  // 'connectivity:online'
events.names.connectivity.offline // 'connectivity:offline'
events.names.preference.changed // 'preference:changed'
events.names.sw.updated          // 'sw:updated'
events.names.sw.message          // 'sw:message'
```

---

## Named Exports

```javascript
import {
  bus,
  EventBus,
  delegate,
  once,
  listen,
  names,
  matchInComposedPath,
  matchesAttrs,
  PASSIVE_DEFAULT_TYPES,
  resolvePassiveDefault
} from '@adukiorg/anza/events';
```

### `bus`

Global `EventBus` instance.

### `EventBus`

Class extending `EventTarget`:

```javascript
const myBus = new EventBus();
myBus.on('event', handler);
myBus.emit('event', detail);
```

Methods: `on(type, fn, signal)`, `emit(type, detail)`.

### `delegate(root, selector, type, handler, options)`

Shadow-aware event delegation. Returns disposer.

### `listen(target, type, handler, options)`

Memory-safe listener. Returns disposer.

### `once(target, type, options)`

Promise-wrapped single event. Returns `Promise<Event>`.

### `names`

System event constants object.

### Matcher helpers (`match.js`)

Shared by `events.delegate` and component `on`. Prefer the high-level APIs; import these only for custom roots or tests:

```javascript
import {
  matchInComposedPath,
  matchesAttrs,
  PASSIVE_DEFAULT_TYPES,
  resolvePassiveDefault
} from '@adukiorg/anza/events';

const el = matchInComposedPath(event, '.btn', root, 'path'); // 'path' | 'shadow' | 'assigned'
matchesAttrs(el, { 'data-action': 'save', 'aria-disabled': null }); // null = must be absent
resolvePassiveDefault('touchmove', undefined); // true — touch/wheel/mousewheel only
PASSIVE_DEFAULT_TYPES.has('wheel'); // true
```

| Export | Role |
| ------ | ---- |
| `matchInComposedPath(event, selector, root, scope?)` | First matching element in `composedPath()` before `root` |
| `matchesAttrs(element, attrs)` | Attribute predicates (`null` = absent) |
| `PASSIVE_DEFAULT_TYPES` | `Set` of scroll-critical event type strings |
| `resolvePassiveDefault(type, optionsPassive?)` | Passive default aligned with `listen` / `on` |

---

## Listener Options

All listener functions accept standard `addEventListener` options. `delegate` also accepts precision helpers:

| Option | Type | Description |
| -------- | ------ | ------------- |
| `signal` | AbortSignal | Auto-cleanup on abort |
| `capture` | boolean | Capture phase |
| `once` | boolean | Fire once (native, not the `once()` function) |
| `passive` | boolean | Cannot call preventDefault; `listen` defaults true for touch/wheel only |
| `attrs` | object | (`delegate` / component `on`) attribute predicates; `null` = must be absent |
| `not` | string | (`delegate` / `on`) skip when `closest(not)` is inside the root |
| `key` | string\|number | (`delegate` / `on`) dedupe — same key replaces prior registration |
| `scope` | string | (`delegate`: `'path'` \| `'assigned'`; component `on`: `'shadow'` \| `'assigned'`) |

### `events.delegate` precision (simple)

```javascript
events.delegate(root, '.btn', 'click', handler);
```

### Advanced

```javascript
events.delegate(root, '.btn', 'click', handler, {
  signal: ctrl.signal,
  attrs: { 'data-action': 'save', 'aria-disabled': null },
  not: '.ignore',
  key: 'toolbar-save',
  scope: 'assigned'
});
```

Matching walks `composedPath()` and stops at `root`. See [delegate.md](delegate.md).

Component shadow delegation lives on context `on` — [ui/context.md](../ui/context.md#on) — with the same `attrs` / `not` / `key` options and empty-registry teardown.

---

## Event Payload

Bus and emit listeners receive a `CustomEvent`:

```javascript
{
  type: string,    // event name
  detail: any,     // payload passed to emit
  bubbles: boolean, // false for bus events
  composed: boolean // false for bus events
}
```
