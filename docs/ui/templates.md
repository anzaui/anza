---
title: "Templates"
order: 3
description: "Anza UI templates: inline HTML, file templates, when files load, build-time inlining, refs, the tags descriptor and the template tag."
---

# Templates

A template is the HTML cloned into each element's shadow root. It is plain HTML: there is no `{{ }}` interpolation. Fill in values from hooks through `refs`.

## Inline string

```javascript
import { view } from '@anzaui/anza/defs';

view('user-card', {
  template: '<div class="card"><h2 ref="title"></h2></div>'
});
```

The string is compiled to a `DocumentFragment` once, when the element is defined, and cloned for each instance.

## File template

`page()`, `dock()`, `view()` and `part()` accept a `{ html, css }` object:

```javascript
view('user-card', {
  template: { html: './card.html', css: './card.css' }
}, import.meta.url);
```

| Field | Required | Description |
| ----- | -------- | ----------- |
| `html` | no | HTML string or path to an `.html` file |
| `css` | no | CSS string, `.css` path, or an array of both |
| `shadow` | no | Shadow root mode. Leave it unset: only `'open'` works. |

A top-level `style` field replaces `template.css`. `element()` takes `template` and `style` as separate strings; see [element() factory](factory.md#spec-shape).

Relative paths resolve against the third argument, `import.meta.url`. Without it, the factory logs an error and uses the path as inline text.

## When files load

File resources load when the first instance connects. Defining an element costs no requests until one is used. The style, the template and its tags descriptor load in parallel, once per URL.

Pass `eager: true` (on `element()`, `page()`, `dock()`, `view()` or `part()`) to start the fetch when the element is defined:

```javascript
view('app-header', {
  template: { html: './header.html', css: './header.css' },
  eager: true
}, import.meta.url);
```

An element that adopted pre-rendered Declarative Shadow DOM mounts without waiting for these files. See [Hydration (DSD adopt)](hydration.md).

## Build-time inlining

`anza build` (production) copies the referenced files to `dist`, and also writes the contents of each relative style and template file into the module that defines the element. The `.tags.json` next to a template goes in too. At runtime the element uses the inlined copy instead of fetching it.

Not inlined:

- `page()` template HTML. Pages are already in the pre-rendered HTML; only their tags descriptor is inlined.
- CSS that uses `@import` or a relative `url()`. A constructed stylesheet would resolve those against the document.
- Root-absolute paths such as `/styles/shared.css`.

The build then bundles the modules into hashed chunks under `dist/assets/`. `anza dev` never inlines or bundles, so file edits hot-swap. See [element() factory](factory.md#hmr).

## Refs

Mark elements with `ref="name"`:

```javascript
view('greeting-card', {
  template: '<div><h2 ref="title"></h2><button ref="go">Go</button></div>',
  on: {
    connect({ refs, ctrl }) {
      refs.title.textContent = 'Hello';
      refs.go.addEventListener('click', () => { refs.title.textContent = 'Clicked'; }, { signal: ctrl.signal });
    }
  }
});
```

`refs` is a frozen object built once per mount: ref name to element. A duplicate name logs a warning and the first match wins. Elements added later are not in `refs`; use `tags` for those.

## Tags descriptor

A file template can have a `.tags.json` file next to it (`card.html` → `card.tags.json`):

```json
{
  "version": 1,
  "refs": ["title", "go"],
  "ids": ["header"],
  "classes": ["card"],
  "tags": ["h2", "button"]
}
```

The factory uses it to:

- pre-fill the `tags` cache for each listed `id` and `ref`, so `tags.one('#header')` needs no query;
- limit `refs` to the listed names;
- check an adopted DSD root for missing refs (see [Hydration (DSD adopt)](hydration.md)).

A missing descriptor is normal and is not requested again.

## Tagged template literal

`template` builds a fragment outside the element factory:

```javascript
import { template } from '@anzaui/anza/ui';

const fragment = template`<div class="card"><h2>Hello</h2></div>`;
document.body.appendChild(fragment);
```

The markup is parsed once per call site and cloned on each call. Interpolated values are always dropped; in development the call also logs a warning. Use refs for dynamic content.

## No template

Without a template the shadow root starts empty:

```javascript
view('empty-box', {
  on: {
    connect({ el }) {
      el.shadowRoot.appendChild(document.createElement('slot'));
    }
  }
});
```
