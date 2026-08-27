# Native Animations Usage Guide

The Native animations layer provides WAAPI (Web Animations API) helpers, easing curves, keyframe templates, stagger groups, scroll-linked animations, and view transitions. All timing values are sourced from CSS motion tokens for consistency.

Import from the animations entry point:

```javascript
import { animate, stagger, register, scroll, view, timing, keyframes, reduced } from '@anzaui/anza/animations';
```

## 1. Basic Animation

Animate a single element with keyframes and timing options:

```javascript
import { animate, timing } from '@anzaui/anza/animations';

const animation = animate(
  element,
  [
    { opacity: 0, transform: 'translateY(20px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ],
  timing()
);
```

The `timing()` helper defaults to the CSS `--duration-normal` and `--ease-default` tokens:

```javascript
timing(duration, easing, fill)
// Defaults: timing('normal', 'default', 'both')
```

Custom timing:

```javascript
timing(300, 'ease-out', 'forwards')
```

## 2. Timing and Easing

### Timing Presets

Use the `Timing` object for named easing curves:

```javascript
import { Timing } from '@anzaui/anza/animations';

animate(element, keyframes, {
  duration: 250,
  easing: Timing.FAST,      // --ease-out
  fill: 'both'
});
```

Available easing curves:

| Constant | Value | Token |
|----------|-------|-------|
| `Timing.EASE` | `ease` | - |
| `Timing.EASE_IN` | `ease-in` | - |
| `Timing.EASE_OUT` | `ease-out` | - |
| `Timing.EASE_IN_OUT` | `ease-in-out` | - |
| `Timing.LINEAR` | `linear` | - |
| `Timing.DEFAULT` | `--ease-default` | CSS token |
| `Timing.SMOOTH` | `--ease-default` | CSS token |
| `Timing.FAST` | `--ease-out` | CSS token |
| `Timing.SOFT` | `--ease-in-out` | CSS token |
| `Timing.BOUNCE` | `--ease-spring` | CSS token |
| `Timing.SPRING` | `--ease-spring` | CSS token |

### Duration Tokens

Durations are read from CSS `--duration-*` tokens:

```javascript
import { duration } from '@anzaui/anza/animations';

const fast = duration('fast');    // --duration-fast (100ms)
const normal = duration('normal'); // --duration-normal (200ms)
const slow = duration('slow');    // --duration-slow (300ms)
```

Fallback values are used when CSS tokens are unavailable (SSR, missing styles).

## 3. Keyframe Templates

Use `keyframes()` for common transition patterns:

```javascript
import { keyframes, animate } from '@anzaui/anza/animations';

// Fade in/out
animate(element, keyframes('fade'), timing());

// Slide (default: Y axis)
animate(element, keyframes('slide', { axis: 'y', from: '20px' }), timing());

// Scale
animate(element, keyframes('scale'), timing());

// Zoom
animate(element, keyframes('zoom'), timing());

// Blur
animate(element, keyframes('blur'), timing());
```

Custom keyframe options:

```javascript
keyframes('fade', { from: 0.5, to: 1 })
keyframes('slide', { axis: 'x', from: '100px' })
keyframes('scale', { from: 0.8 })
```

## 4. Staggered Animations

Animate a group of elements with sequential delays:

```javascript
import { stagger } from '@anzaui/anza/animations';

const cards = document.querySelectorAll('.card');

stagger(Array.from(cards), [
  { opacity: 0, transform: 'translateY(20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], {
  duration: 250,
  staggerDelay: 60
});
```

Returns an array of `Animation` objects for control:

```javascript
const animations = stagger(elements, keyframes, options);
animations.forEach(anim => anim.pause());
```

## 5. Scroll-Linked Animations

Link animations to scroll position:

```javascript
import { scroll } from '@anzaui/anza/animations';

const stop = scroll(element, [
  { transform: 'translateY(0)' },
  { transform: 'translateY(-50px)' }
], {
  range: [0, 1],  // 0-1 scroll progress
  target: document.documentElement
});
```

Call the returned function to clean up:

```javascript
stop(); // Disconnects ScrollTimeline
```

## 6. View Transitions

Use the View Transitions API for page navigation animations:

```javascript
import { view } from '@anzaui/anza/animations';

view(async () => {
  // Update DOM here
  document.body.classList.add('new-page');
});
```

Custom transition:

```javascript
view(async () => {
  await updateDOM();
}, {
  duration: 300,
  easing: 'ease-out'
});
```

## 7. Reduced Motion

Check for user's motion preference:

```javascript
import { reduced } from '@anzaui/anza/animations';

if (!reduced()) {
  animate(element, keyframes('fade'), timing());
}
```

The `reduced()` function checks `prefers-reduced-motion: reduce`.

## 8. Token Integration

All timing values are sourced from CSS motion tokens:

```css
/* src/tokens/primitives/motion.css */
:root {
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.6, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-linear: linear;
}
```

JS animations automatically use these values, ensuring CSS and JS animations share one source of truth.

## 9. Animation Control

`animate()` returns a WAAPI `Animation` object:

```javascript
const anim = animate(element, keyframes, timing());

anim.pause();
anim.play();
anim.finish();
anim.cancel();
anim.reverse();

anim.finished.then(() => console.log('done'));
```

## 10. Registered Presets

Common animation presets are pre-registered for convenience:

```javascript
import { animate } from '@anzaui/anza/animations';

// Use registered presets by name
animate(element, 'fade');
animate(element, 'slide');
animate(element, 'slide-x');
animate(element, 'slide-y');
animate(element, 'scale');
animate(element, 'zoom');
animate(element, 'blur');
```

Available presets:
- `fade` - Opacity transition
- `slide` - Y-axis slide
- `slide-x` - X-axis slide
- `slide-y` - Y-axis slide
- `scale` - Scale from 0.95 to 1
- `zoom` - Scale from 1.1 to 1
- `blur` - Blur transition

Register custom presets:

```javascript
import { registry, keyframes, timing } from '@anzaui/anza/animations';

registry.register('myPreset', keyframes('fade'), timing(300));
```

## 11. Sequence Helper

Chain animations sequentially, each starting when the previous finishes:

```javascript
import { sequence } from '@anzaui/anza/animations';

const { finished } = sequence([
  [element1, keyframes('fade'), timing()],
  [element2, keyframes('slide'), timing()],
  [element3, keyframes('scale'), timing()]
]);

await finished;
```

Each step is `[element, animationInput, options?]`. Returns `{ finished }` promise.

## 11. Performance Guidelines

- Use `requestAnimationFrame` for visual updates (handled by WAAPI)
- Prefer transforms and opacity for GPU-accelerated properties
- Respect `prefers-reduced-motion` for accessibility
- Use `stagger()` for list animations instead of manual delays
- Clean up scroll-linked animations with the returned disposer
