---
title: "Hydration (DSD adopt)"
order: 6
seo_title: "Hydration (DSD adopt) — Anza"
description: "How Anza elements adopt open Declarative Shadow DOM from SSG or Mode B HTML: mount before fetching, no refetch in built apps, one mismatch re-render."
---

# Hydration (DSD adopt)

A pre-rendered page ships each element's shadow root as open Declarative Shadow DOM (DSD). When the element upgrades, Anza **adopts** that shadow root: it keeps the markup, wires it up and runs the hooks. It does not clear it and clone the template again.

The HTML comes from Mode A (`anza build` / `anza dev` SSG) or Mode B (server templates in any language). See [Page HTML contract (Mode A SSG · Mode B templates)](../ssg/contract.md). Anza has no Node SSR runtime; the client only adopts what is already in the document.

## Boot sequence

1. The parser attaches the open DSD. The page paints with content and styles before any JavaScript runs.
2. The module scripts load and the custom elements upgrade.
3. Constructor: the element keeps `this.shadowRoot` if one exists. If the browser left a `<template shadowrootmode>` child unattached, the element attaches a shadow root and moves the template content into it.
4. Props are read from the pre-rendered attributes.
5. Connect: the element wires `refs`, `tags`, `on` and `watch` to the existing markup, dispatches `anza:ready` and runs `load` and `connect`. It does this before fetching any file. `ctx.adopted` is `true`.
6. The element loads what it still needs in the background, applies the styles and checks the markup once.

This fast path applies when the adopted root holds real elements (not only `<style>`, `<link>` or `<script>`) and the element's resources are not loaded yet. Otherwise the element takes the normal path: it waits for its resources, keeps the adopted markup, applies the styles and runs the same mismatch check before wiring.

## No refetch in built apps

In an app built by `anza build`, the DSD and the client modules come from the same build. An adopted root therefore loads only what its markup does not carry:

- **Styles**: stylesheets the shadow root already links are skipped. The rest come from the module (inlined at build time) or are fetched.
- **Template and tags descriptor**: used only if they were inlined into the module. They are not fetched.

A `page()` module carries its tags descriptor but not its HTML. The template is fetched later only for a client-rendered instance (after a soft navigation) or a mismatch re-render.

Under `anza dev` nothing is inlined, so an adopted element fetches all its files for the check.

## Mismatch check

After adopting, the element compares the markup with the client template (or with the tags descriptor when only that is available):

- a `ref` the template declares is missing from the shadow root, or
- the template has elements but the shadow root has none.

On a mismatch the element re-renders once: it loads its full resources, runs `unmount`, removes the listeners of the first wiring, replaces the shadow root's content with the template, applies all styles and runs `mount` again. It does not dispatch `anza:ready` a second time, and it never re-renders twice.

## Soft navigation vs full load

| Path | Behaviour |
| ---- | --------- |
| **Full load / hard refresh** | The browser gets pre-rendered HTML. The router finds the matching page element already in its dock and keeps it. It only sets its route props. |
| **Soft navigation** | Parent docks stay mounted. When the page tag changes, the router creates a new page element and swaps it into the dock. The new element has no DSD, so it clones its template. The old one disconnects and aborts its `ctrl`. |
| **Parent docks** | Stay mounted across soft navigations in the same `via` chain, with their adopted markup. |

A page template must be a fragment, not a full HTML document. If a template file turns out to be a document (doctype, `<html>`, or a nested `dock-main` / `dock-docs`), the factory uses the page element's DSD content inside it, or logs an error and uses an empty template. This stops a misrouted fetch from nesting docks inside the page.

## Browser only

The UI modules need a DOM: importing `@anzaui/anza/ui` or `@anzaui/anza/defs` in Node throws `ReferenceError: HTMLElement is not defined`. The build tools read element definitions statically and never import them. Keep element modules in the browser graph that upgrades the pre-rendered HTML.

## Related

- [Lifecycle](lifecycle.md): hook order and `anza:ready`.
- [Context](context.md#adopted): `ctx.adopted`.
- [Templates](templates.md#build-time-inlining): what `anza build` inlines.
