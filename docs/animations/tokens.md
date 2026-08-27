# Tokens

Animation timing values are synchronized with CSS custom properties at runtime. This ensures JavaScript animations and CSS transitions share the same duration and easing values.

---

## Duration

```javascript
import { animations } from '@anzaui/anza/animations';

const fast = animations.duration('fast');    // e.g. 100
const normal = animations.duration('normal'); // e.g. 200
const slow = animations.duration('slow');     // e.g. 300
```

Reads the `--duration-{name}` CSS custom property. Falls back to defaults:

| Token | Default |
| ------- | --------- |
| `instant` | 50ms |
| `fast` | 100ms |
| `normal` | 200ms |
| `slow` | 300ms |
| `slower` | 500ms |

---

## Easing

```javascript
const easeDefault = animations.ease('default');
const easeOut = animations.ease('out');
const spring = animations.ease('spring');
```

Reads the `--ease-{name}` CSS custom property. Falls back to:

| Token | Default |
| ------- | --------- |
| `default` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `in-out` | `cubic-bezier(0.4, 0, 0.6, 1)` |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `linear` | `linear` |

---

## Reduced Motion

```javascript
if (animations.reduced()) {
  // User prefers reduced motion
}
```

Checks `prefers-reduced-motion: reduce`.

---

## Timing Constants

```javascript
import { Timing } from '@anzaui/anza/animations';

Timing.EASE;        // 'ease'
Timing.EASE_IN;     // 'ease-in'
Timing.EASE_OUT;    // 'ease-out'
Timing.LINEAR;      // 'linear'
Timing.DEFAULT;     // resolves to CSS token
Timing.SPRING;      // resolves to CSS token
```

---

## View Transitions

The router and UI layers read animation tokens automatically when running View Transitions. See `docs/ui/transitions.md` and `docs/router/transitions.md` for the `--transition-*` token layer.

---

## Timing Helper

```javascript
import { timing } from '@anzaui/anza/animations';

const opts = timing(300, 'ease-out', 'both');
// { duration: 300, easing: 'ease-out', fill: 'both' }
```

---

## Keyframe Builder

```javascript
import { keyframes } from '@anzaui/anza/animations';

const fade = keyframes('fade');
// [{ opacity: 0 }, { opacity: 1 }]

const slideX = keyframes('slide', { axis: 'x' });
// [{ transform: 'translateX(20px)', opacity: 0 }, ...]

const scale = keyframes('scale', { from: 0.9 });
// [{ transform: 'scale(0.9)', opacity: 0 }, ...]
```

Types: `fade`, `slide`, `scale`, `zoom`, `blur`.
