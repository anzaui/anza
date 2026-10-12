# Sanitize

`sanitize(html)` removes tags and attributes that are not on an allowlist, event handler attributes, and URLs that are not `http:`, `https:` or `mailto:`. When Trusted Types is available, it returns a `TrustedHTML` object.

## Basic use

```javascript
import { security } from '@anzaui/anza/security';

const safe = String(security.sanitize('<p><script>alert(1)</script>Hello</p>'));
// '<p>Hello</p>'
```

Use `String()` to get a plain string. Without it, the result is a `TrustedHTML` object when Trusted Types is active.

## Allowed tags

```text
a, abbr, b, bdi, bdo, blockquote, br, caption, cite, code, col, colgroup,
data, dd, del, dfn, div, dl, dt, em, figcaption, figure, footer, h1-h6,
header, hr, i, img, ins, kbd, li, mark, ol, p, pre, q, rp, rt, ruby, s,
samp, section, small, span, strong, sub, sup, table, tbody, td, tfoot, th,
thead, time, tr, u, ul, var, wbr
```

Any other element is removed together with its content. `<my-card>Hi</my-card>` becomes an empty string, not `Hi`.

## Allowed attributes

```text
href, title, src, alt, width, height, class, target, rel
```

All other attributes are removed. That includes:

- every attribute starting with `on`
- `style`, which can be used for CSS-based data exfiltration and UI redress
- `id`, which can clobber global variables (DOM clobbering)

## URLs

`href` and `src` are checked with the `URL` parser, resolved against `document.baseURI`. The attribute is kept only if the protocol is `http:`, `https:` or `mailto:`. Relative URLs resolve to the page's protocol, so they are kept.

Because the browser's parser does the check, obfuscated schemes such as `java&#9;script:` or a leading control character do not get through.

```javascript
String(security.sanitize('<a href="javascript:alert(1)">x</a>'));
// '<a>x</a>'

String(security.sanitize('<img src="data:image/png;base64,AAAA" alt="x">'));
// '<img alt="x">'
```

## Links with `target`

If an element keeps a `target` attribute, the sanitizer sets `rel="noopener noreferrer"` on it and replaces any `rel` value you passed.

```javascript
String(security.sanitize('<a href="https://example.com" target="_blank">x</a>'));
// '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>'
```

## Trusted Types

When `window.trustedTypes` exists, the module registers a `core-sanitize` policy and wraps every result in it:

```javascript
const trusted = security.sanitize('<p>Safe</p>');
element.innerHTML = trusted; // accepted under a Trusted Types CSP
```

## Native Sanitizer API

When the browser has a global `Sanitizer`, `sanitize(html, config)` uses it instead of the fallback above. `config` is passed to `new Sanitizer(config)` and the HTML goes through `setHTML()`. In that case the browser's rules apply, not the allowlists on this page. `config` has no effect on the fallback.

## Fallback

Without a native `Sanitizer`, the HTML is parsed with `Document.parseHTMLUnsafe` (or `DOMParser`) and the tree is walked with the allowlists above. The parsed document is never attached to the page, so no script runs during parsing.

## Server

Without `window` (on the server), `sanitize` returns the input unchanged. Sanitize in the browser before you insert user HTML.
