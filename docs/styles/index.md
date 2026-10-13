---
title: "Styles"
order: 16
---

# Styles

Styles are applied per element to its shadow root. The factory leverages constructable stylesheets when supported by the browser, falling back to inline `<style>` injection.

## Defining Styles

Styles can be defined using inline CSS strings or references to stylesheet files.

### Inline Styles

```javascript
view('styled-box', {
  template: '<div class="box"></div>',
  style: `
    :host { display: block; padding: var(--space-4); }
    .box { background: var(--color-surface-elevated); border: var(--space-px) solid var(--color-border-default); }
  `
});
```

### File-Based Styles

```javascript
view('styled-box', {
  template: { html: './box.html', css: './box.css' }
}, import.meta.url);
```

## Multiple & Shared Stylesheets

Definitions for `view()`, `dock()`, and `page()` accept an array of styles. This is useful for combining common utility or theme sheets with element-specific layouts.

Stylesheets can live in any folder of the project. Use a relative path (`./`, `../`), resolved against the module URL you pass as the third argument, or a root-relative path starting with `/` (e.g., `/styles/shared.css`), resolved against the site root and the deploy base.

### Array of Inline Styles

```javascript
view('themed-button', {
  template: '<button><slot></slot></button>',
  style: [
    `:host { display: inline-flex; }`,
    `button { background: var(--color-interactive); color: var(--color-surface-page); }`
  ]
});
```

### Array of Stylesheet Files (via `style`)

You can define multiple file-based stylesheets directly inside the `style` property:

```javascript
page('blog-post', {
  template: { html: './post.html' },
  style: [
    '/styles/shared.css',      // Absolute path from src/ root
    '../../styles/base.css',   // Relative path
    './post.css'               // Local relative path
  ]
}, import.meta.url);
```

### Array of Stylesheet Files (via `template.css`)

Alternatively, they can be referenced inside the `template.css` field:

```javascript
page('blog-post', {
  template: { 
    html: './post.html', 
    css: ['../../styles/base.css', './post.css'] 
  }
}, import.meta.url);
```

The runtime fetches the files in parallel and applies them in the order you list them. A `style` field replaces `template.css`; the two are not merged.

`anza build` inlines relative, self-contained CSS files into the definition module, so the element needs no extra request. CSS that uses `@import` or relative `url()` stays a separate file. `anza dev` never inlines, so edits and HMR work on the files.

## Adopted Stylesheets

When the browser supports `CSSStyleSheet` and `adoptedStyleSheets`:

1. Each CSS resource is fetched once per unique URL across the application.
2. A single `CSSStyleSheet` object is instantiated and cached globally.
3. Every instance of the element adopts the stylesheet by assigning it to `shadowRoot.adoptedStyleSheets`.

This design minimizes duplicate network requests and reduces the memory footprint by sharing a single stylesheet instance among all custom elements of the same type.

### Fallback Behavior

For browsers without constructable stylesheet support:
1. CSS assets are fetched as raw text strings.
2. The factory prepends a `<style>` element containing the CSS text directly inside the shadow root of each instance.

## Hot Module Replacement (HMR)

Under `anza dev`, saving a component's CSS file dispatches an `anza:hmr:css` event on `window`. The element factory listens for it and calls `replaceSync()` on the shared stylesheet, so every instance updates without a reload:

```javascript
// What the dev client dispatches (you don't call this yourself).
window.dispatchEvent(new CustomEvent('anza:hmr:css', {
  detail: { path: 'views/box/style.css', css: '/* new styles */' }
}));
```

Templates work the same way with `anza:hmr:html` (`detail: { path, html }`).

## Scoped Styles

Custom elements use Shadow DOM by default, isolating styles to prevent leaks:

```css
/* Scoped to the element's shadow root. Will not affect other DOM nodes */
.box { color: var(--color-content-primary); }
```

Use the `:host` selector to target the custom element host:

```css
:host {
  display: flex;
  box-sizing: border-box;
}

:host([active]) {
  border: 1px solid var(--color-interactive);
}
```
