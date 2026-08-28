# Containers

The router's container system is a hierarchical graph of DOM mounting points. Every container knows its parent, its children, and its depth. This enables lowest-common-ancestor traversal and automatic cascade mounting on hard refreshes.

## What Is a Container?

A container is a DOM node that acts as a first-class mounting slot for routed views. It owns its own animation, its own DOM swap strategy, and its own transition scope.

Containers are created with `dock()`:

```javascript
import { dock } from '@anzaui/anza/defs';

dock('main');
```

When `<dock-main>` connects, it registers itself in the graph under the key `'main'`. Because no `parent` is set, it defaults to `'body'` as its parent.

## The Container Graph

The graph is a tree of nodes. Each node holds a `WeakRef` to its element, so unmounted containers can be garbage-collected.

```text
body (virtual root)
└── main
    ├── sidebar
    │   └── content
    └── overlay
```

Every dock declares its `parent` when defined. The graph is built dynamically as elements connect and disconnect.

## Via Chains

A `page` declares an ordered `via` chain — the root-to-leaf container path it renders through:

```javascript
page('/settings/profile', {
  tag: 'page-profile',
  via: ['main', 'sidebar', 'content']
});
```

The last entry (`content`) is the render target. The router ensures every preceding container exists before mounting.

## Cascade Mounting

When a navigation targets a container chain whose intermediate containers are not yet in the DOM, the router walks the graph path from the deepest live ancestor down to the target, creating each missing dock in order and yielding a frame between each so `connectedCallback` (and self-registration) can run.

```text
Target:  /settings/profile  →  via: ['main', 'sidebar', 'content']
Current: /dashboard         →  only 'main' is mounted

Cascade:
  1. Ensure 'main' exists    → already mounted
  2. Create 'sidebar' inside 'main'
  3. Yield one frame for connectedCallback
  4. Create 'content' inside 'sidebar'
  5. Yield one frame for connectedCallback
  6. Mount 'page-profile' inside 'content'
```

This is what makes a hard refresh on a deep route work without error.

When public HTML already shipped the via chain (Mode A SSG or Mode B), the client **adopts** those docks instead of recreating an empty shell. Soft-nav then only swaps the page leaf inside the leaf dock; intermediate docks persist. Nested hosts in SSG HTML must be light-DOM children after each open DSD template — see [ssg/contract.md](../ssg/contract.md).

## Lowest Common Ancestor (LCA)

Cross-branch navigation uses LCA to minimize DOM churn:

```javascript
// Navigating from container A to container B
const ancestor = lca('A', 'B');
```

Everything below the ancestor on the source side unmounts. Everything below the ancestor on the target side mounts. The ancestor itself and everything above it stays untouched.

The LCA computation is O(d) where d is tree depth. Real UI trees rarely exceed depth 5.

## Singleton Constraint

Two containers with the same name cannot coexist in the DOM at the same time:

```text
ContainerError: Singleton violation — 'main' is already mounted.
                 A second instance cannot register while the first is active.
```

This is enforced in `connectedCallback` before any registration is accepted.

## CSS Selector Fallback

A container name that looks like a CSS selector is resolved against the document:

```javascript
router.register('/about', 'page-about', {
  container: '#main-content'
});
```

The router queries the selector and self-registers on first hit. A `MutationObserver` watches for dynamically added elements that match tracked selectors.

## Container Registry API

For advanced use, the container registry is accessible directly:

```javascript
// Register a container manually
router.registerContainer('main', document.getElementById('main'));

// Unregister
router.unregisterContainer('main', el);

// Get a live container
const el = router.getContainer('main');

// Clear everything
router.clearContainers();
```

In most cases, `dock()` handles registration and unregistration automatically via lifecycle hooks.

## Ambiguous Names

If a plain registry key shadows a real DOM element with the same tag name, the router warns:

```text
[Router] Container name "main" is ambiguous: it exists in the DOM as a selector
but is being treated as a registry key. Use a selector prefix (e.g., "#main")
to explicitly target the DOM element, or ensure it is registered via registerContainer().
```

Fix it by using a selector prefix or renaming the container key.
