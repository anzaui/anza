# Templates

Templates define the HTML structure of a declarative element. The UI layer supports inline strings, file references, and tagged template literals.

## Inline String

```javascript
view('user-card', {
  template: '<div class="card"><h2 ref="title"></h2></div>'
});
```

The string is compiled into a `DocumentFragment` once per registration and cloned for each instance.

## File Reference

```javascript
view('user-card', {
  template: { html: './card.html', css: './card.css' }
}, import.meta.url);
```

| Field | Required | Description |
| ------- | ---------- | ------------- |
| `html` | yes | Path to `.html` file |
| `css` | no | Path to `.css` file |
| `shadow` | no | `'open'` or `'closed'`; default `'open'` |

Paths are resolved relative to the third argument (`import.meta.url`). The native toolchain copies assets during build.

## Tagged Template Literal

For rapid prototyping outside the element factory:

```javascript
import { template } from '@anzaui/anza/ui';

const fragment = template`<div class="card"><h2>Hello</h2></div>`;
document.body.appendChild(fragment);
```

Interpolated values are ignored in production. The template is parsed once per call site and cached in a `WeakMap`. Cloning a cached fragment is ~10x faster than re-parsing HTML.

In development, passing values logs a warning:

```javascript
template`<div>${dynamic}</div>`; // warns: use refs for dynamic binding
```

## Refs

Mark elements with `ref="name"` for easy lookup:

```javascript
template: '<div><h2 ref="title"></h2><button ref="btn">Go</button></div>'
```

Access in hooks:

```javascript
on: {
  connect({ refs }) {
    refs.title.textContent = 'Hello';
    refs.btn.addEventListener('click', handler);
  }
}
```

Duplicate `ref` names log a warning. The first match wins.

## Tags Descriptor

When using file templates, the factory looks for a `.tags.json` alongside the `.html` file:

```json
{
  "version": 1,
  "refs": ["title", "btn"],
  "ids": ["header"],
  "classes": ["card", "active"],
  "tags": ["h2", "button"]
}
```

The tags descriptor pre-warms the query cache so `tags.one('#header')` and `tags.all('.card')` resolve instantly without DOM traversal.

## Template Compilation

The compilation path depends on what is available:

1. **`setHTMLUnsafe`** (modern) — fastest, parses HTML directly into a `<template>`
2. **`innerHTML`** (fallback) — standard template parsing

In both cases, the result is a `DocumentFragment` cloned per instance.

## No Template

An element without a template creates an empty shadow root:

```javascript
view('empty-box', {
  on: {
    connect({ el }) {
      el.shadowRoot.appendChild(document.createElement('slot'));
    }
  }
});
```
