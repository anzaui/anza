# Troubleshooting

Common problems and their solutions.

## Animation not running

**Cause:** Element not in DOM, or `display: none`.

**Fix:** Ensure the element is visible and attached:

```javascript
if (el.isConnected) {
  animations.animate(el, 'fade');
}
```

## Stagger not delaying

**Cause:** `staggerDelay` not provided, or elements are not iterable.

**Fix:** Pass `staggerDelay` explicitly:

```javascript
animations.stagger(items, 'fade', { staggerDelay: 60 });
```

`items` must be a `NodeList` or array.

## Animation cancelled immediately

**Cause:** AbortSignal already aborted when passed.

**Fix:** Check signal state before animating:

```javascript
if (!ctrl.signal.aborted) {
  animations.animate(el, 'fade', { signal: ctrl.signal });
}
```

## Scroll timeline not working

**Cause:** `ScrollTimeline` not supported in this browser.

**Fix:** Check `supports.scrollTimeline` and provide fallback:

```javascript
import { supports } from '@anzaui/anza/platform';

if (supports.scrollTimeline) {
  // Use ScrollTimeline
} else {
  // Use scroll listener + requestAnimationFrame
}
```

## Token returns wrong value

**Cause:** CSS custom property not defined, or document not ready.

**Fix:** Tokens fall back to defaults. Define CSS custom properties:

```css
:root {
  --duration-normal: 200ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Reduced motion not respected

**Cause:** Not checking `reduced()` before animating.

**Fix:** Always gate animations:

```javascript
if (!animations.reduced()) {
  animations.animate(el, 'slide');
} else {
  el.style.opacity = 1;
}
```

## Sequence stops mid-way

**Cause:** An element in a step is missing or the animation throws.

**Fix:** Ensure elements exist and handle errors:

```javascript
try {
  await seq.finished;
} catch (err) {
  console.error('Sequence failed at step:', err);
}
```

## Still stuck?

Inspect the animation:

```javascript
const anim = animations.animate(el, 'fade');
console.log(anim.effect); // see keyframes and timing
console.log(anim.playState); // 'running', 'paused', 'finished'
```
