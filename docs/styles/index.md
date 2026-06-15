# Styles

Styles are applied per element to its shadow root. The factory leverages constructable stylesheets when supported by the browser, falling back to inline `<style>` injection.

---

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

---

## Multiple Stylesheets

Definitions for `view()`, `dock()`, and `page()` accept an array of styles. This is useful for combining common utility or theme sheets with element-specific layouts.

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

### Array of Stylesheet Files

```javascript
page('blog-post', {
  template: { 
    html: './post.html', 
    css: ['../../styles/base.css', './post.css'] 
  }
}, import.meta.url);
```

When files are referenced in an array, the compiler resolves each relative path independently and loads them in the specified sequence.

---

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

---

## Hot Module Replacement (HMR)

During development, updates to CSS files trigger HMR events. The dev environment captures stylesheet modifications and updates the cached constructable stylesheet directly:

```javascript
window.dispatchEvent(new CustomEvent('native:hmr:css', {
  detail: { path: './box.css', css: '/* modified styles */' }
}));
```

Using `replaceSync()`, changes are pushed to the live stylesheet instance, updating all active elements on the screen without triggering a full page reload or layout remount.

---

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
