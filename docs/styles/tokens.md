# Design Tokens

Anza's design tokens are CSS custom properties in three layers: base values (primitives), typed `@property` registrations so they can animate (registered), and theme and transition mappings (semantic). `tokens/index.css` imports them in that order.

## Token Architecture

The token system is structured into three layers:

```text
[Primitives]   -> Raw, immutable design constants (e.g., base colors, timings, fonts)
     |
[Registered]   -> Typed @property declarations so tokens can animate
     |
[Semantic]     -> Intent-based mappings for Light, Dark, High-Contrast, and Transitions
```

### 1. Primitives

Primitives define the base values in `tokens/primitives/`:

| File | Tokens |
|---|---|
| `colors.css` | `--color-white`, `--color-black`; grays `--gray-100`, `-200`, `-300`, `-400`, `-500`, `-600`, `-700`, `-800`, `-900`; `--brand`; feedback hues `--red-*`, `--green-*`, `--amber-*`, `--blue-*` (`-400` for dark surfaces, `-600` for light) |
| `spacing.css` | `--space-0`, `--space-px`, `--space-0-5` (2px), `--space-1` (4px), `--space-1-5` (6px), `--space-2` … `--space-6`, `--space-8`, `--space-10`, `--space-12`, `--space-16`, `--space-20`, `--space-24`, `--space-32` (8rem) |
| `typography.css` | `--font-sans`; sizes `--font-size-xs`, `-sm`, `-base`, `-lg`, `-xl`, `-2xl`, `-3xl`; weights `--font-weight-regular`, `-medium`, `-semibold`, `-bold`; line heights `--line-height-none`, `-tight`, `-normal` |
| `motion.css` | `--duration-fast` (120ms), `--duration-medium` (180ms), `--duration-normal` (240ms); `--ease-in`, `--ease-out`, `--ease-in-out` |
| `shape.css` | radii `--radius-none`, `-sm`, `-md`, `-lg`, `-full`; shadows `--shadow-sm`, `-md`, `-lg`, `-xl`, `-2xl` |

### 2. Registered

Registered tokens use `@property` rules in `tokens/registered/` to declare types, inheritance and initial values, so browsers can animate them:

*   **`colors.css`**: Registers the core semantic color variables (e.g., `--color-surface-page`, `--color-content-primary`, `--color-border-default`, `--color-interactive`).
*   **`dimensions.css`**: Registers transition-specific properties (e.g., `--transition-duration`, `--transition-offset`).

### 3. Semantic & Themes

Semantic tokens map primitives to intents and themes in `tokens/semantic/`:

*   **`light.css`**: Default light theme on `:root` (e.g., `--color-surface-page` maps to white).
*   **`dark.css`**: Dark overrides under `[data-theme="dark"]`, and under `prefers-color-scheme: dark` unless `data-theme="light"` is set.
*   **`contrast.css`**: High-contrast overrides under `[data-theme="high-contrast"]`.

Every theme defines the same semantic set:

| Group | Tokens |
|---|---|
| Surfaces | `--color-surface-page`, `--color-surface-elevated`, `--color-surface-inverse` |
| Content | `--color-content-primary`, `--color-content-secondary`, `--color-content-link`, `--color-content-disabled`, `--color-content-inverse` |
| Borders | `--color-border-default`, `--color-border-strong`, `--color-border-focus` |
| Interactive | `--color-interactive`, `--color-interactive-hover`, `--color-interactive-active`, `--color-interactive-disabled` |
| Feedback | `--color-feedback-error`, `--color-feedback-success`, `--color-feedback-warning`, `--color-feedback-info` |
| Links | `--link-color`, `--link-color-hover`, `--link-color-active` |

`npm run tokens:check` (CI) fails if an element uses a token without a fallback that no file declares.

## View Transition Tokens

Dock and page swap transitions read these variables from `tokens/semantic/transitions.css`:

```css
:root {
  --transition-duration: var(--duration-normal);
  --transition-easing: var(--ease-out);
  --transition-push: cubic-bezier(0.1, 0.9, 0.2, 1);
  --transition-pop: cubic-bezier(0.9, 0.1, 1, 0.2);
  --transition-replace: var(--ease-in-out);
  --transition-offset: 30px; /* Sizing distance for slide sweeps */
  --transition-bg: var(--color-surface-page);
}
```

The same file styles the `::view-transition-old/new()` groups of the docks (`dock-main`, `dock-docs`, `dock-content`, `dock-swap`) with a fade-out and a slide-in. The UI transition code reads `--transition-push`, `--transition-pop` and `--transition-replace` for the easing of each navigation direction. Under `prefers-reduced-motion: reduce` the duration is `0ms`.

## Customizing Token Values

The library's base styles and view transitions read these custom properties, so you can override them or map them to your own names.

### Fallbacks

`styles/base.css` gives the typography tokens fallback values, so text still renders without the token files. Colors have no fallbacks: the body reads the `--background` and `--text-color` aliases that the light and dark themes define.

```css
/* From the library's styles/base.css (inside @layer base) */
body {
  background-color: var(--background);
  color: var(--text-color);
  font-weight: var(--font-weight-regular, 400);
  line-height: var(--line-height-normal, 1.5);
}
```

### Customizing via Overrides

To customize the default styling, redefine the custom property values on the `:root` element or within a specific theme block:

```css
/* custom.css */
:root {
  /* Override the default interactive color token value */
  --color-interactive: oklch(55% 0.22 250);
}

[data-theme="dark"] {
  /* Override the page background token value for dark mode */
  --color-surface-page: #0d0e12;
}
```

### Deciding Your Own Variable Names

If you prefer to use your own custom variable names throughout your codebase, you can map the library's custom properties directly to your custom variables:

```css
:root {
  /* Your custom variables */
  --app-bg: #f5f5f7;
  --app-text: #1d1d1f;

  /* Map the library custom properties to your variables */
  --color-surface-page: var(--app-bg);
  --color-content-primary: var(--app-text);
}
```

Your stylesheet keeps its own names, and the library's styles still receive the values.

