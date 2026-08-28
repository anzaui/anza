# Data Binding

Anza engines bind typed backend data structures—such as Rust Serde structs, Python dataclasses, and TypeScript interfaces—directly to server template tokens with zero runtime overhead.

## What You Get

| Language | Engine Package | Binding Mechanism |
|---|---|---|
| **Rust** | `anza` | Direct `serde::Serialize` structs & `serde_json::Value` |
| **Python** | `anza` | `@dataclass`, Pydantic models, or standard `dict` |
| **TypeScript** | `@anzaui/engine` | Typed `Record<string, unknown>` and plain objects |

## Rust Engine Binding

In Rust, any struct deriving `serde::Serialize` can be passed directly to `render`:

```rust
use anza::Engine;
use serde::Serialize;

#[derive(Serialize)]
struct Article {
    id: i64,
    slug: String,
    title: String,
    summary: String,
    author: String,
    created: String,
}

let engine = Engine::new("templates")?;

let article = Article {
    id: 42,
    slug: "zero-js-architecture".into(),
    title: "Zero-JS Architecture with STUI".into(),
    summary: "How server-templated components eliminate frontend bundle bloat.".into(),
    author: "Elena Vance".into(),
    created: "2026-08-28".into(),
};

// Render component template
let html = engine.render("feed/card.html", &article)?;
```

## Python Engine Binding

In Python, use standard dataclasses or Pydantic models with `anza.render`:

```python
from dataclasses import dataclass, asdict
import anza

@dataclass
class Article:
    id: int
    slug: str
    title: str
    summary: str
    author: str
    created: str

engine = anza.Engine("templates")

article = Article(
    id=42,
    slug="zero-js-architecture",
    title="Zero-JS Architecture with STUI",
    summary="How server-templated components eliminate frontend bundle bloat.",
    author="Elena Vance",
    created="2026-08-28"
)

html = engine.render("feed/card.html", asdict(article))
```

## TypeScript Engine Binding

In TypeScript (Node.js, Deno, Bun, or Cloudflare Workers), bind typed objects with `@anzaui/engine`:

```typescript
import { Engine } from '@anzaui/engine';

interface Article {
  id: number;
  slug: string;
  title: string;
  summary: string;
  author: string;
  created: string;
}

const engine = new Engine({ path: './templates' });

const article: Article = {
  id: 42,
  slug: 'zero-js-architecture',
  title: 'Zero-JS Architecture with STUI',
  summary: 'How server-templated components eliminate frontend bundle bloat.',
  author: 'Elena Vance',
  created: '2026-08-28'
};

const html = await engine.render('feed/card.html', article);
```

## Slotted Child Composition

When combining parent and child templates, pass the rendered child strings into the parent's data payload:

```rust
// 1. Render all feed cards
let cards_html: String = articles
    .iter()
    .map(|a| engine.render("feed/card.html", a))
    .collect::<Result<Vec<_>, _>>()?
    .join("\n");

// 2. Render page with cards bound into {{articles}} slot
let page_html = engine.render("pages/home.html", &json!({
    "count": articles.len(),
    "articles": cards_html
}))?;

// 3. Render outer shell with page bound into {{content}} slot
let full_doc = engine.render_shell(&json!({
    "title": "Home — Anza Blog",
    "description": "High-performance STUI blog powered by Anza.",
    "content": page_html
}))?;
```
