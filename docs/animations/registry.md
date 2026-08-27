# Registry

The animation registry stores reusable named templates. Built-in presets are registered at module load. You can register your own for consistent animation vocabulary across the app.

---

## Built-In Presets

| Name | Keyframes | Default Duration |
| ------ | ----------- | ----------------- |
| `fade` | opacity 0 → 1 | `duration('normal')` |
| `slide` | translateY(20px) → 0 | `duration('normal')` |
| `slide-x` | translateX(20px) → 0 | `duration('normal')` |
| `slide-y` | translateY(20px) → 0 | `duration('normal')` |
| `scale` | scale(0.95) → 1 | `duration('normal')` |
| `zoom` | scale(1.1) → 1 | `duration('normal')` |
| `blur` | blur(8px) → 0 | `duration('normal')` |

---

## Register a Template

```javascript
import { animations } from '@anzaui/anza/animations';

animations.register('bounce', [
  { transform: 'translateY(0)' },
  { transform: 'translateY(-20px)', offset: 0.5 },
  { transform: 'translateY(0)' }
], { duration: 500, easing: 'ease-in-out' });
```

---

## Use a Registered Template

```javascript
animations.animate(el, 'bounce');
animations.stagger(items, 'bounce', { staggerDelay: 50 });
```

---

## Overriding Defaults

Options passed to `animate` or `stagger` override the template defaults:

```javascript
// Template says 500ms, but we want 200ms
animations.animate(el, 'bounce', { duration: 200 });
```

---

## Clear Templates

```javascript
import { registry } from '@anzaui/anza/animations';

registry.clear();
```

This removes all templates including built-ins. Use with caution.

---

## Direct Registry Access

```javascript
import { registry } from '@anzaui/anza/animations';

// Check if a template exists
const config = registry.get('fade');
console.log(config.keyframes, config.options);

// Remove one
registry.delete('custom');
```
