# Design Tokens

Anza implements a minimal design token architecture based on CSS custom properties. This system defines variables for base values (primitives), registers animatable variables via Houdini (registered), and maps them to themes and transitions (semantic).

## Token Architecture

The token system is structured into three layers:

```text
[Primitives]   -> Raw, immutable design constants (e.g., base colors, timings, fonts)
     |
[Registered]   -> Houdini typed declarations enabling GPU-accelerated theme morphing
     |
[Semantic]     -> Intent-based mappings for Light, Dark, High-Contrast, and Transitions
```

### 1. Primitives

Primitives define the baseline design values inside `/src/tokens/primitives/`:

*   **`colors.css`**: Defines raw black, white, gray scales (`--gray-100` to `--gray-900`), and a base brand accent (`--brand`).
*   **`motion.css`**: Configures fast/normal durations (`--duration-normal`) and default easing curves (`--ease-out`).
*   **`spacing.css`**: Sets a standard 4px numeric increment grid (`--space-0` to `--space-4`).
*   **`typography.css`**: Sets standard font sizes (`--font-size-base` to `--font-size-3xl`), font weights, and line heights.

### 2. Registered

Registered tokens use Houdini `@property` rules in `/src/tokens/registered/` to define types, inheritance, and initial values. This allows browsers to animate variables smoothly:

*   **`colors.css`**: Registers the core semantic color variables (e.g., `--color-surface-page`, `--color-content-primary`, `--color-border-default`, `--color-interactive`).
*   **`dimensions.css`**: Registers transition-specific properties (e.g., `--transition-duration`, `--transition-offset`).

### 3. Semantic & Themes

Semantic tokens map primitive choices to specific intents and themes in `/src/tokens/semantic/`:

*   **`light.css`**: Default Light theme mappings (e.g., `--color-surface-page` maps to white).
*   **`dark.css`**: Dark theme overrides applied under `[data-theme="dark"]` or matching user preferences.
*   **`contrast.css`**: WCAG AAA compliant high-contrast overrides applied under `[data-theme="high-contrast"]`.

## View Transition Tokens

Swap transitions between layout docks and pages are controlled via dedicated variables in `/src/tokens/semantic/transitions.css`:

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

The transitions engine uses these values to drive the slide and fade animations when swapping routing views.

## Customizing Token Values

All Anza system styles (including layout base styles and view transitions) reference values using CSS custom properties. Because these are standard custom properties, the actual variable names and values can be overridden, deleted, or mapped to the user's own naming conventions.

### Graceful Fallbacks

System styles include default fallback values. If a user deletes the library's default variable declarations from their styles, the system falls back to base defaults:

```css
/* Example of library internal base.css using custom properties with fallbacks */
body {
  background-color: var(--color-surface-page, #ffffff);
  color: var(--color-content-primary, #111111);
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

This mapping allows you to maintain full control over the variable names in your application stylesheet while ensuring the library's layout and transition engines receive the correct values.

