# Stagger

`animations.stagger` animates a collection of elements with cascading delays. It returns a group controller with `cancel()`, `finish()`, and a `finished` promise.

## Signature

```javascript
stagger(elements, animationInput, options);
```

| Param | Type | Description |
| ------- | ------ | ------------- |
| `elements` | NodeList \| Array | Elements to animate |
| `animationInput` | string \| Keyframe[] | Template or keyframes |
| `options` | object | WAAPI options plus `staggerDelay` |

## Basic Stagger

```javascript
import { animations } from '@anzaui/anza/animations';

const items = document.querySelectorAll('.item');

const group = animations.stagger(items, 'fade', {
  staggerDelay: 60,  // 60ms between each
  duration: 300
});

await group.finished;
```

Delay for element at index `i` is: `(options.delay ?? 0) + i * staggerDelay`.

## Group Controls

```javascript
// Cancel all animations immediately
group.cancel();

// Skip all to their final state
group.finish();

// Wait for completion
await group.finished;
```

## Stagger with Slide

```javascript
animations.stagger(items, 'slide-y', {
  staggerDelay: 50,
  duration: animations.duration('normal'),
  easing: animations.ease('out')
});
```

## Reverse Stagger

```javascript
const reversed = Array.from(items).reverse();

animations.stagger(reversed, 'fade', {
  staggerDelay: 40,
  duration: 200
});
```

## Custom Keyframes

```javascript
animations.stagger(items, [
  { opacity: 0, transform: 'scale(0.5)' },
  { opacity: 1, transform: 'scale(1)' }
], { staggerDelay: 100, duration: 400 });
```
