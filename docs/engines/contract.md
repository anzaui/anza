---
seo_title: "Engine Contract — Anza"
description: "The behaviour every Anza server engine (Rust, TypeScript, Python) implements identically: wire format v2, signatures, pages, values, escaping and errors."
---

# Engine Contract

The Rust (`anza`), TypeScript (`@anzaui/engine`) and Python (`anza`) engines
implement one contract. Given the same templates, parameters and keys, they
produce byte-identical HTML, envelopes, signatures and SSE frames, and they
accept and reject the same envelopes.

The shared golden fixtures in `engines/fixtures/` pin this down. Each
engine's test suite runs them: `signature.json` (messages, signatures,
verification decisions), `render.json` (fragments, pages, framing,
manifest) and the template roots in `render/`. `engines/fixtures/generate.py`
regenerates the JSON files from this document, without using any engine
code.

## Wire Format v2

A fragment travels as a JSON envelope:

```json
{"v":2,"slot":"feed","ts":1724771234,"html":"<ui-card>Live</ui-card>","sig":"0df0…327f"}
```

| Field | Type | Meaning |
|-------|------|---------|
| `v` | integer | Wire-format version. Always `2`. Serialized first. |
| `slot` | string | Target slot or dock. |
| `ts` | integer | Unix time in seconds when the fragment was rendered. |
| `html` | string | Rendered markup. |
| `sig` | string, optional | Lowercase hex signature. Absent when signing is off. |
| `css` | string, optional | Fragment CSS. Absent when there is none. |

Envelopes are serialized as compact JSON (no spaces) with the keys in the
order above and non-ASCII characters left as UTF-8. SSE frames are
`event: template\ndata: <json>\n\n`. WebSocket packets are the JSON alone.

## Signatures

The signature covers this exact byte string:

```text
message  = "anza-sig-v2\n" field(ts) field(slot) field(html) field(css)
field(x) = <decimal UTF-8 byte length of x> ":" x "\n"
```

`ts` is written in decimal ASCII. An absent `css` is the empty string. For
example, `{ts: 1, slot: "a:b", html: "c"}` signs
`anza-sig-v2\n1:1\n3:a:b\n1:c\n0:\n`. Every field is length-prefixed, so two
different envelopes never share a message. Version 1 signed `ts:slot:html`,
where `a:b` + `c` and `a` + `b:c` collided.

| Mode | Algorithm | Key | `sig` |
|------|-----------|-----|-------|
| `hmac` | HMAC-SHA256 | Secret of **at least 32 bytes** | 64 hex characters |
| `ed25519` | Ed25519 (RFC 8032) | **32-byte** private seed; optional 32-byte public key | 128 hex characters |
| `none` | — | — | absent |

Hex is strict everywhere: lowercase, even length, `0-9a-f` only. Uppercase,
odd lengths, trailing characters (`sig + "zz"`) and non-ASCII input are
rejected and never panic.

### Key Validation

Keys are checked once, when `Setup` runs. A bad key is a `CRYPTO` error at
setup, never an unsigned envelope or an error at render time:

- an HMAC secret that is missing or shorter than 32 bytes (a string counts
  its UTF-8 bytes);
- an Ed25519 private key that is not a 32-byte seed (TS also takes 64-char
  lowercase hex, PEM or a `KeyObject`; Python also takes 64-char lowercase hex
  or an `Ed25519PrivateKey`);
- an Ed25519 public key that is given but does not match the private key;
- in Rust, a key file passed to `Setup::ed25519` that cannot be read.

`Debug` (Rust), `inspect`/`JSON.stringify` (TS) and `repr` (Python) never
print key material. They print `<redacted>` instead.

### Verification

`verify_envelope` (Rust `anza::verify_envelope`, TS `verifyEnvelope`, Python
`verify_envelope`) takes a key, a received envelope and the options
`max_age_secs`, `slot`, `skew_secs` (default 5) and `now` (default: the
clock). `Engine.verify_envelope` does the same with the engine's own key. The
checks run in this order, and the first failure is a `CRYPTO` error with
exactly this message:

| Check | Message |
|-------|---------|
| `v` is `2` | `unsupported envelope version` |
| fields have the right types (TS, Python) | `malformed envelope` |
| `sig` is present | `envelope is not signed` |
| `sig` is strict hex | `malformed signature` |
| `ts <= now + skew_secs` | `envelope timestamp is in the future` |
| `now - ts <= max_age_secs` | `envelope expired` |
| `slot` equals the expected slot | `slot mismatch` |
| the signature verifies (constant-time) | `bad signature` |

A short HMAC secret or a malformed public key is `invalid verification key`.
The slot check stops a fragment signed for one slot from being replayed into
another one.

## Templates

### Syntax

`{{name}}` inserts a value. `{{{name}}}` inserts it raw. Whitespace around
the name is trimmed. An unclosed or empty placeholder is a `TEMPLATE` error.

### Escaping

With `escape` off (the default), `{{name}}` and `{{{name}}}` both insert the
value as-is. The caller escapes untrusted input with `escape_html`. With
`escape: true`, `{{name}}` is HTML-escaped and `{{{name}}}` is raw. Use
`{{{content}}}` in a shell when escaping is on.

`escape_html` (Rust `anza::escape_html`, TS `escapeHtml`, Python
`escape_html`) maps `&` `<` `>` `"` `'` to `&amp;` `&lt;` `&gt;` `&quot;`
`&#39;`. Its output is safe in element content and in quoted attribute
values.

### Values

| Value | Text |
|-------|------|
| string | as-is |
| `true` / `false` | `true` / `false` |
| integer | decimal (`42`, `-7`) |
| float | integral floats without `.0` (`3.0` → `3`), others in their shortest form (`1.5`) |
| `null` / `None` / `undefined`, missing key | nothing |
| array, list, tuple, plain object, dict | compact JSON (`[1,"a",true,null]`, `{"a":1}`) |
| anything else | the language's string conversion |

Floats outside `1e-6` to `1e21`, NaN, infinities and floats nested inside
JSON values follow each language's own formatting.

Parameters come from a map (Rust `HashMap`, `serde_json::Value` or any
`Serialize` type, TS object or `Map`, Python `dict`), from key/value pairs,
or from an object. TS reads own properties only (`Object.hasOwn`), so
`{{toString}}` and `{{__proto__}}` render nothing. Python reads public,
non-callable attributes only. Rust reads serialized fields.

### Names

A template name is a relative, `/`-separated path under the template root.
It has no leading `/`, no `\` or NUL, and no empty, `.` or `..` segment. A
malformed name is a `VALIDATION` error. Lookups only use the in-memory
cache. Request input never reaches the filesystem.

### Loading

At setup, every `.html` file under the root is loaded. A file larger than
`max_template_bytes` (default 1 MiB) is a `TEMPLATE` error. Symlinked
directories are not followed. Symlinked files load only when they resolve
inside the root. Errors name the template, never the absolute path.

The manifest maps each template name to the **SHA-256** of its content, in
lowercase hex. SHA-256 is available in every standard library (`node:crypto`,
`hashlib`, and the `sha2` crate the Rust engine already uses for HMAC), so
anyone can recompute a digest without BLAKE3. Digest speed doesn't matter
here: templates are hashed once at load.

With `watch` on, edits, additions and removals reach the cache. Rust uses
`notify` (the `watch` feature). TS uses `fs.watch` with a 50 ms debounce and
serialized reloads. Python uses a polling thread; stop it with
`Engine.close()`. A reload that fails keeps the last good templates.

## Fragments

`render_fragment(template, slot, params)` binds the template, stamps `ts`,
signs, and returns a v2 envelope. The optional `fragments` setup option is an
allowlist. An entry ending in `/` allows that prefix (`"fragments/"`). Any
other entry allows that exact name. A template outside the allowlist is
reported as `Template '<name>' not found`, the same as a missing one.

## Pages

`render_page(route, params)`:

1. `/` (or an empty route) selects `pages/home.html`. `/a/b` and `/a/b/`
   select `pages/a/b.html`.
2. When that template doesn't exist, `pages/index.html` is the catch-all.
3. Otherwise, or when the route is not a valid name (`..`, `\`, NUL), the
   result is `NOT_FOUND` with the message `Page not found`. The route is
   never echoed.
4. The page is bound with `params`. Then it goes into `layout/shell.html`,
   bound with `params` plus `content` (the engine's `content` wins), or into
   the default document below when there is no shell.

Routes only ever resolve under `pages/`. A route can't render a fragment,
a layout or any other cached template.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Anza App</title>
</head>
<body>
  <dock-main>
    <template shadowrootmode="open">
      <slot></slot>
    </template>
    <!-- page -->
  </dock-main>
</body>
</html>
```

## Setup Options

| Option | Rust `Setup` field | TS `SetupOptions` | Python `Setup` | Default |
|--------|--------------------|-------------------|----------------|---------|
| Template root | `root` | `root` | `root` | required |
| Signing | `signing: SignMode` | `signing: SignOptions` | `signing: SignOptions` | none |
| Reload on change | `watch` (feature `watch`) | `watch` | `watch` | off |
| Fragment allowlist | `fragments` | `fragments` | `fragments` | all templates |
| Escape `{{x}}` | `escape` | `escape` | `escape` | off |
| Max template size | `max_template_bytes` | `maxTemplateBytes` | `max_template_bytes` | 1 MiB |

## Errors

Every engine uses the same five codes. Rust has `Error::code()`, TS
`AnzaError.code` and Python `AnzaError.code`. Errors display as
`[Anza:CODE] message`.

| Code | Raised for |
|------|-----------|
| `VALIDATION` | missing template root, empty template, slot or route, malformed template name |
| `NOT_FOUND` | unknown template or page, template outside the fragment allowlist |
| `TEMPLATE` | unclosed or empty placeholder, oversized or non-UTF-8 template |
| `CRYPTO` | bad signing key at setup, any `verify_envelope` failure |
| `INTERNAL` | clock or lock failures |
