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

*   **`colors.css`**: Defines `--color-white`, `--color-black`, four grays (`--gray-100`, `--gray-200`, `--gray-800`, `--gray-900`) and a brand accent (`--brand`).
*   **`motion.css`**: Defines two durations (`--duration-fast`, `--duration-normal`) and three easing curves (`--ease-in`, `--ease-out`, `--ease-in-out`).
*   **`spacing.css`**: Defines `--space-0`, `--space-px` (1px) and `--space-2` to `--space-8` (0.5rem to 2rem; there is no `--space-1` or `--space-7`).
*   **`typography.css`**: Sets standard font sizes (`--font-size-base` to `--font-size-3xl`), font weights, and line heights.

### 2. Registered

Registered tokens use `@property` rules in `tokens/registered/` to declare types, inheritance and initial values, so browsers can animate them:

*   **`colors.css`**: Registers the core semantic color variables (e.g., `--color-surface-page`, `--color-content-primary`, `--color-border-default`, `--color-interactive`).
*   **`dimensions.css`**: Registers transition-specific properties (e.g., `--transition-duration`, `--transition-offset`).

### 3. Semantic & Themes

Semantic tokens map primitives to intents and themes in `tokens/semantic/`:

*   **`light.css`**: Default light theme on `:root` (e.g., `--color-surface-page` maps to white).
*   **`dark.css`**: Dark overrides under `[data-theme="dark"]`, and under `prefers-color-scheme: dark` unless `data-theme="light"` is set.
*   **`contrast.css`**: High-contrast overrides under `[data-theme="high-contrast"]`.

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

