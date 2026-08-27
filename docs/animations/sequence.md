# Sequence

`animations.sequence` chains animations so each step starts only after the previous finishes.

---

## Signature

```javascript
sequence(steps);
```

Each step is: `[element, animationInput, options?]`

Returns `{ finished: Promise }`.

---

## Basic Sequence

```javascript
import { animations } from '@anzaui/anza/animations';

const seq = animations.sequence([
  [el, 'fade', { duration: 200 }],
  [el, 'scale', { duration: 200 }],
  [el, 'slide-x', { duration: 200 }]
]);

await seq.finished;
```

The element fades in, then scales, then slides.

---

## Sequence with Different Elements

```javascript
const seq = animations.sequence([
  [overlay, 'fade', { duration: 150 }],
  [modal, 'scale', { duration: 250 }],
  [buttons, 'stagger', { staggerDelay: 30, duration: 150 }]
]);
```

---

## Error Handling

If any step fails (element missing, animation error), the sequence stops and the `finished` promise rejects:

```javascript
try {
  await seq.finished;
} catch (err) {
  console.error('Sequence failed:', err);
}
```

---

## Cancel a Sequence

There is no group `cancel()` on sequences. To abort, pass an AbortSignal to individual steps:

```javascript
const ctrl = new AbortController();

const seq = animations.sequence([
  [el, 'fade', { duration: 500, signal: ctrl.signal }],
  [el, 'slide', { duration: 500, signal: ctrl.signal }]
]);

// Abort mid-sequence
ctrl.abort();
```
