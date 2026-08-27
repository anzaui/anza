# API Reference

Complete reference for the animations facade and utilities.

---

## Facade

```javascript
import { animations } from '@anzaui/anza/animations';
```

### `animations.register(name, keyframes, defaultOpts)`

Register a named animation template.

### `animations.animate(el, input, options)`

Animate an element. Returns `Animation`.

### `animations.stagger(elements, input, options)`

Staggered multi-element animation. Returns `{ animations, cancel, finish, finished }`.

### `animations.sequence(steps)`

Chained animation sequence. Returns `{ finished }`.

### `animations.scroll(options)`

Returns `ScrollTimeline` or fallback descriptor.

### `animations.view(options)`

Returns `ViewTimeline` or fallback descriptor.

### `animations.Timing`

Easing constants object.

### `animations.timing(duration, easing, fill)`

Returns `{ duration, easing, fill }`.

### `animations.keyframes(type, options)`

Builds keyframe arrays. Types: `fade`, `slide`, `scale`, `zoom`, `blur`.

### `animations.duration(name)`

Resolves duration token in ms. Names: `instant`, `fast`, `normal`, `slow`, `slower`.

### `animations.ease(name)`

Resolves easing token. Names: `default`, `in`, `out`, `in-out`, `spring`, `linear`.

### `animations.reduced()`

Returns `true` if `prefers-reduced-motion: reduce`.

---

## Named Exports

```javascript
import {
  registry,
  animate, stagger, sequence,
  scroll, view,
  Timing, timing, keyframes,
  duration, ease, reduced
} from '@anzaui/anza/animations';
```

---

## AnimationRegistry

```javascript
import { registry } from '@anzaui/anza/animations';
```

### `registry.register(name, keyframes, options)`

### `registry.get(name)`

Returns `{ keyframes, options }` or `null`.

### `registry.delete(name)`

### `registry.clear()`

---

## Stagger Return

```javascript
{
  animations: Animation[],
  cancel: () => void,
  finish: () => void,
  finished: Promise<void[]>
}
```

---

## Sequence Step

```javascript
[element, animationInput, options?]
```

---

## Keyframe Options

| Type | Options |
| ------ | --------- |
| `fade` | `{ from?, to? }` |
| `slide` | `{ axis?, from? }` |
| `scale` | `{ from? }` |
| `zoom` | `{ from? }` |
| `blur` | `{ from? }` |
