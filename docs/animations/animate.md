# Animate

`animations.animate` wraps `element.animate()` with template resolution, AbortSignal cleanup, and automatic memory-safe finish handling.

## Signature

```javascript
animate(el, animationInput, options);
```

| Param | Type | Description |
| ------- | ------ | ------------- |
| `el` | Element | Target DOM element |
| `animationInput` | string \| Keyframe[] | Template name or raw keyframes |
| `options` | object | WAAPI options plus `signal` |

Returns a `Animation` instance.

## Using a Preset

```javascript
import { animations } from '@anzaui/anza/animations';

const anim = animations.animate(el, 'fade', { duration: 300 });
await anim.finished;
```

Built-in presets: `fade`, `slide`, `slide-x`, `slide-y`, `scale`, `zoom`, `blur`.

## Using Raw Keyframes

```javascript
animations.animate(el, [
  { opacity: 0, transform: 'translateY(20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], { duration: 400, easing: 'ease-out', fill: 'both' });
```

## Options

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `duration` | number | from template | Animation duration in ms |
| `delay` | number | 0 | Delay before start |
| `easing` | string | from template | Easing curve |
| `fill` | string | `'both'` | Fill mode |
| `iterations` | number | 1 | Repeat count |
| `direction` | string | `'normal'` | Playback direction |
| `signal` | AbortSignal | — | Cancel on abort |

## AbortSignal Cleanup

```javascript
const ctrl = new AbortController();

animations.animate(el, 'fade', { signal: ctrl.signal });

// Cancel the animation
ctrl.abort();
```

The animation is automatically cancelled when the signal aborts. The abort listener is removed when the animation finishes to prevent leaks.

## Controlling Playback

```javascript
const anim = animations.animate(el, 'slide');

anim.pause();
anim.play();
anim.reverse();
anim.cancel();
anim.finish();

// Update timing
anim.updateTiming({ duration: 600 });
```

## Fill Modes

| Fill | Behavior |
| ------ | ---------- |
| `'none'` | No effect before/after active time |
| `'forwards'` | Holds final state |
| `'backwards'` | Holds initial state during delay |
| `'both'` | Holds both initial and final states |

## Reversed Playback

```javascript
const anim = animations.animate(el, 'fade', { direction: 'reverse' });
// Plays from opacity 1 to 0
```
