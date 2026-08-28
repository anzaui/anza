# Quick Start

Get a working route in five minutes.

## 1. Create a Dock

A `dock` is a persistent container shell. It stays in the DOM across route changes and provides the mounting point for pages.

```javascript
import { dock } from '@anzaui/anza/defs';

dock('main');
```

This registers `<dock-main>` as a custom element. When it connects, it registers itself in the container graph under the key `'main'`. The default parent is `'body'`, so `<dock-main>` is treated as a top-level container. You can place it directly in HTML or let the router create it automatically.

## 2. Define a Page

A `page` maps a URL pattern to a custom element.

```javascript
import { page } from '@anzaui/anza/defs';

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<h1>Home</h1>',
  on: {
    load() { console.log('home loaded'); }
  }
});
```

What happens:

1. `page()` defines `<page-home>` as a custom element
2. It registers the route `'/'` with the router
3. It declares that this page renders through the `'main'` container
4. When the user visits `/`, the router creates `<page-home>` and mounts it inside `<dock-main>`

## 3. Add Another Route

```javascript
page('/about', {
  tag: 'page-about',
  via: ['main'],
  template: '<h1>About</h1>'
});
```

Now clicking `<a href="/about">` is intercepted, matched, and swapped inside `main` without a full page reload.

## 4. Route Parameters

```javascript
page('/profile/:id', {
  tag: 'page-profile',
  via: ['main'],
  params: [
    { name: 'id', type: Number }
  ],
  on: {
    load({ params }) {
      console.log('Loading profile for user', params.id); // typed Number
    }
  }
});
```

The `:id` segment is captured per the `params` contract, cast to `Number`, and assigned as a property on the element.

## 5. Nested Layouts with Via Chains

A `via` chain declares the full root-to-leaf container path:

```javascript
dock('sidebar', { parent: 'main' });
dock('content', { parent: 'sidebar' });

page('/settings/profile', {
  tag: 'page-profile',
  via: ['main', 'sidebar', 'content'],
  template: '<h1>Profile Settings</h1>'
});
```

On a cold hard refresh, the router cascades through the chain: it ensures `main` exists, then `sidebar` inside `main`, then `content` inside `sidebar`, then mounts the page inside `content`.

## 6. File Templates

For IDE support, use real `.html` and `.css` files:

```javascript
page('/dashboard', {
  tag: 'page-dashboard',
  via: ['main'],
  template: { html: './dashboard.html', css: './dashboard.css' }
}, import.meta.url);
```

Paths are resolved relative to the third argument (`import.meta.url`). The native toolchain copies these assets during build and generates type declarations.

## 7. Programmatic Navigation

```javascript
import { router } from '@anzaui/anza/router';

// Push a new history entry
router.navigate('/settings');

// Replace current entry
router.replace('/settings?tab=profile');

// Go back
router.back();

// Check if back is possible
if (router.canBack()) router.back();
```

## 8. Navigation Guard

```javascript
router.guard((destination, controller) => {
  if (destination.url.pathname.startsWith('/admin') && !isAdmin()) {
    return '/login';
  }
});
```

Return a URL string to redirect. Return nothing (or `null`) to allow.

## Complete Working Example

```javascript
// app.js
import { router } from '@anzaui/anza/router';
import { page, dock } from '@anzaui/anza/defs';

// Layout shell
dock('main');

// Routes
page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<h1>Home</h1>'
});

page('/user/:id', {
  tag: 'page-user',
  via: ['main'],
  params: [
    { name: 'id', type: Number }
  ],
  on: {
    load({ params }) {
      console.log('User', params.id);
    }
  }
});

// Guard admin routes
router.guard((destination) => {
  if (destination.url.pathname.startsWith('/admin') && !isAdmin()) {
    return '/login';
  }
});

// 404
router.notFound(() => {
  document.body.innerHTML = '<h1>Page not found</h1>';
});
```

That is everything you need for a fully functional routed application.
