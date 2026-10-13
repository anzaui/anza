---
title: "Animations"
order: 12
---

# Animations

The Anza animations layer wraps the Web Animations API (WAAPI). It provides registered animation templates, staggered multi-element orchestration, scroll-driven and view-driven timelines, and CSS token synchronization so JavaScript animations and stylesheets share the same timing values.

## What You Get

- **Element animation** — `animate(el, keyframes, options)` with AbortSignal cleanup
- **Stagger** — animate a list of elements with cascading delays
- **Sequence** — chain animations one after another
- **Template registry** — register and reuse named animation presets
- **Scroll/view timelines** — `scroll()` and `view()` for scroll-driven animations
- **CSS token sync** — `duration()` and `ease()` read CSS custom properties at runtime
- **Reduced motion** — `reduced()` reports `prefers-reduced-motion`. Animations do not check it for you

## Package

```javascript
import { animations } from '@anzaui/anza/animations';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [Quick Start](quickstart.md) | Your first animation in five minutes |
| [Animate](animate.md) | Single-element animation with WAAPI |
| [Stagger](stagger.md) | Multi-element staggered orchestration |
| [Sequence](sequence.md) | Chained step-by-step animations |
| [Registry](registry.md) | Named animation templates and presets |
| [Scroll](scroll.md) | ScrollTimeline and ViewTimeline wrappers |
| [Tokens](tokens.md) | CSS motion token synchronization |
| [API Reference](api.md) | Complete API reference |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

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

## Next Steps

- New to animations? Start with [Quick Start](quickstart.md).
- Building UI transitions? Read [Animate](animate.md) and [Stagger](stagger.md).
- Need scroll effects? [Scroll](scroll.md).
- Want reusable presets? [Registry](registry.md).
- Prefer a single reference page? [API Reference](api.md).
