# Sanitize

The sanitizer strips disallowed tags, event handler attributes, and `javascript:` scheme links from HTML. When Trusted Types is available, it wraps the output in a `TrustedHTML` object.

---

## Basic Use

```javascript
import { security } from '@anzaui/anza/security';

const safe = String(security.sanitize('<p><script>alert(1)</script>Hello</p>'));
// '<p>Hello</p>'
```

Use `String()` to get the raw string. Without it, the return type may be `TrustedHTML` when Trusted Types is active.

---

## Allowed Tags

The sanitizer allows a conservative whitelist:

```text
a, abbr, b, bdi, bdo, blockquote, br, caption, cite, code, col, colgroup,
data, dd, del, dfn, div, dl, dt, em, figcaption, figure, footer, h1-h6,
header, hr, i, img, ins, kbd, li, mark, ol, p, pre, q, rp, rt, ruby, s,
samp, section, small, span, strong, sub, sup, table, tbody, td, tfoot, th,
thead, time, tr, u, ul, var, wbr
```

All other tags are stripped (replaced with empty text nodes).

---

## Allowed Attributes

```text
href, title, src, alt, width, height, class, id, target, rel, style
```

Any attribute starting with `on` is removed. `href` values starting with `javascript:` are stripped.

---

## Trusted Types

When `window.trustedTypes` is available, the sanitizer registers a `core-sanitize` policy and wraps output:

```javascript
const trusted = security.sanitize('<p>Safe</p>');
// Returns TrustedHTML when Trusted Types is active
element.innerHTML = trusted; // accepted by Trusted Types CSP
```

---

## Native Sanitizer API

When the experimental `Sanitizer` API is available, it is used preferentially:

```javascript
const sanitizer = new globalThis.Sanitizer();
const div = document.createElement('div');
div.setHTML(html, { sanitizer });
```

---

## Fallback

When neither native Sanitizer nor Trusted Types is available, the fallback uses `DOMParser` or `Document.parseHTMLUnsafe` to parse the HTML, then walks the tree removing disallowed content.

---

## SSR

On the server (no `window`), `sanitize` returns the input unchanged. Sanitize on the client before rendering user-generated HTML.
