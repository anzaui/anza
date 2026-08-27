# Quick Start

Get animating in five minutes.

---

## 1. Animate an Element

```javascript
import { animations } from '@anzaui/anza/animations';

const el = document.querySelector('.box');

// Using a built-in preset
animations.animate(el, 'fade', { duration: 300 });

// Using raw keyframes
animations.animate(el, [
  { opacity: 0, transform: 'scale(0.8)' },
  { opacity: 1, transform: 'scale(1)' }
], { duration: 400, easing: 'ease-out' });
```

---

## 2. Stagger a List

```javascript
const items = document.querySelectorAll('.item');

const group = animations.stagger(items, 'slide', {
  staggerDelay: 60,
  duration: 300
});

// Wait for all to finish
await group.finished;

// Or cancel mid-way
group.cancel();
```

---

## 3. Chain a Sequence

```javascript
const seq = animations.sequence([
  [el, 'fade', { duration: 200 }],
  [el, 'scale', { duration: 200 }],
  [el, 'slide', { duration: 200 }]
]);

await seq.finished;
```

Each step starts when the previous finishes.

---

## 4. Register a Custom Template

```javascript
animations.register('bounce', [
  { transform: 'translateY(0)' },
  { transform: 'translateY(-20px)', offset: 0.5 },
  { transform: 'translateY(0)' }
], { duration: 500, easing: 'ease-in-out' });

// Use it anywhere
animations.animate(el, 'bounce');
```

---

## 5. Respect Reduced Motion

```javascript
if (animations.reduced()) {
  // Skip animations for accessibility
  el.style.opacity = 1;
} else {
  animations.animate(el, 'fade', { duration: 300 });
}
```

This checks `prefers-reduced-motion: reduce` automatically.

---

## 6. Read CSS Tokens

```javascript
const dur = animations.duration('slow');   // e.g. 300
const easing = animations.ease('spring');    // e.g. cubic-bezier(...)

animations.animate(el, 'fade', { duration: dur, easing });
```

`duration()` and `ease()` read CSS custom properties at runtime, falling back to defaults.

---

## Complete Working Example

```javascript
import { animations } from '@anzaui/anza/animations';

async function showMenu() {
  const menu = document.querySelector('.menu');
  const items = menu.querySelectorAll('.item');

  if (animations.reduced()) {
    menu.style.display = 'block';
    return;
  }

  // Fade in the menu
  animations.animate(menu, 'fade', { duration: animations.duration('fast') });

  // Stagger the items
  const group = animations.stagger(items, 'slide-y', {
    staggerDelay: 40,
    duration: animations.duration('normal')
  });

  await group.finished;
}
```
