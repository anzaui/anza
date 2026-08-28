# Layouts & Shells

Anza Server Layouts wrap individual page templates in a persistent HTML document shell. By combining document-level `<head>` metadata, CSS token definitions, and Web Standards **Declarative Shadow DOM (DSD)**, shells ensure instant initial rendering and zero-layout-shift navigation.

## What You Get

| Feature | Description |
|---|---|
| **SEO & OpenGraph Tags** | Server-rendered `<meta>` tags for search engine bots and social previews |
| **Origin Verification** | `<meta name="anza-key">` exposing the origin's Ed25519 public key for proxy validation |
| **Declarative Shadow DOM** | Native `<template shadowrootmode="open">` container for root `<dock-main>` |
| **Shared Design Tokens** | Root CSS variables for colors, typography, and layout spacing |

## Shell Architecture (`layout/shell.html`)

Below is the standard shell layout pattern used across Anza applications:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <!-- Primary SEO Meta Tags -->
  <title>{{title}}</title>
  <meta name="title" content="{{title}}">
  <meta name="description" content="{{description}}">
  <meta name="author" content="{{author}}">
  <link rel="canonical" href="{{url}}">

  <!-- Open Graph / Social -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="{{url}}">
  <meta property="og:title" content="{{title}}">
  <meta property="og:description" content="{{description}}">

  <!-- Anza Origin Public Verification Key for Proxies & CDNs -->
  <meta name="anza-key" content="{{anza_key}}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #141416;
      --surface: #1a1a1e;
      --border: #2b2b30;
      --text: #e2e2e8;
      --text-muted: #888892;
      --accent: #4ade80;
      --sans: 'Inter', system-ui, -apple-system, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--sans); background: var(--bg); color: var(--text); min-height: 100vh; }
    .wrapper { max-width: 1300px; margin: 0 auto; padding: 0 10px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="site-header">
      <a href="/" class="brand">Anza Application</a>
      <nav class="nav-links">
        <a href="/">Articles</a>
        <a href="/editor">New Post</a>
      </nav>
    </header>

    <main>
      <dock-main>
        <template shadowrootmode="open">
          <slot></slot>
        </template>
        {{content}}
      </dock-main>
    </main>

    <footer>
      <span>&copy; 2026 Anza Engine</span>
    </footer>
  </div>
</body>
</html>
```

## Nested Declarative Shadow DOM Docks

Anza supports nesting custom element docks directly in server templates. Each dock encapsulates its internal styles while projecting light-DOM children into its `<slot>`:

```html
<dock-main>
  <template shadowrootmode="open">
    <slot></slot>
  </template>

  <!-- Slotted Home Page View -->
  <div class="page-home">
    <h1>Latest Updates</h1>

    <dock-feed class="articles-feed">
      <template shadowrootmode="open">
        <slot></slot>
      </template>
      {{articles}}
    </dock-feed>
  </div>
</dock-main>
```

### Why Declarative Shadow DOM?
1. **Instant Hydration**: The browser parses and renders the shadow tree during initial HTML streaming before scripts run.
2. **Style Isolation**: Styles defined inside a component's `<style>` tag do not bleed outward or affect siblings.
3. **Seamless Swaps**: Client routers swap only the slotted light-DOM children (`{{content}}` or `{{articles}}`) without remounting parent chrome.

## Origin Key Distribution (`<meta name="anza-key">`)

The shell layout embeds the server's Ed25519 public key in hexadecimal format:

```html
<meta name="anza-key" content="a7b48c90f23d4e68...">
```

When caching proxies, Edge workers, or client scripts receive real-time updates via Server-Sent Events (SSE) or WebSocket streams, they verify incoming envelopes against this key to guarantee cryptographic authenticity.
