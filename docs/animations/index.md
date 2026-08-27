# Animations

The Anza animations layer wraps the Web Animations API (WAAPI) with a declarative, memory-safe interface. It provides registered animation templates, staggered multi-element orchestration, scroll-driven and view-driven timelines, and CSS token synchronization so JavaScript animations and stylesheets share the same timing values.

---

## What You Get

- **Element animation** — `animate(el, keyframes, options)` with AbortSignal cleanup
- **Stagger** — animate a list of elements with cascading delays
- **Sequence** — chain animations one after another
- **Template registry** — register and reuse named animation presets
- **Scroll/view timelines** — `scroll()` and `view()` for scroll-driven animations
- **CSS token sync** — `duration()` and `ease()` read CSS custom properties at runtime
- **Reduced motion** — `reduced()` respects `prefers-reduced-motion`

---

## Package

```javascript
import { animations } from '@anzaui/anza/animations';
```

---

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first animation in five minutes |
| [animate.md](animate.md) | Single-element animation with WAAPI |
| [stagger.md](stagger.md) | Multi-element staggered orchestration |
| [sequence.md](sequence.md) | Chained step-by-step animations |
| [registry.md](registry.md) | Named animation templates and presets |
| [scroll.md](scroll.md) | ScrollTimeline and ViewTimeline wrappers |
| [tokens.md](tokens.md) | CSS motion token synchronization |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

---

## One-File Example

```javascript
import { animations } from '@anzaui/anza/animations';

// Animate a single element
const anim = animations.animate(el, 'fade', { duration: 300 });
await anim.finished;

// Stagger a list
const group = animations.stagger(items, 'slide', { staggerDelay: 50 });
await group.finished;

// Respect reduced motion
if (!animations.reduced()) {
  animations.animate(el, 'zoom', { duration: animations.duration('slow') });
}
```

---

## Next Steps

- New to animations? Start with [quickstart.md](quickstart.md).
- Building UI transitions? Read [animate.md](animate.md) and [stagger.md](stagger.md).
- Need scroll effects? [scroll.md](scroll.md).
- Want reusable presets? [registry.md](registry.md).
- Prefer a single reference page? [api.md](api.md).
