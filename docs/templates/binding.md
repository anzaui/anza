# Data Binding

Anza engines bind backend data (Rust Serde structs, Python dataclasses, TypeScript objects) to `{{token}}` placeholders. Values are converted to strings and inserted without HTML escaping.

## What You Get

| Language | Engine Package | Binding Mechanism |
|---|---|---|
| **Rust** | `anza` | Direct `serde::Serialize` structs & `serde_json::Value` |
| **Python** | `anza` | `@dataclass`, Pydantic models, or standard `dict` |
| **TypeScript** | `@anzaui/engine` | Typed `Record<string, unknown>` and plain objects |

## Rust Engine Binding

In Rust, any struct deriving `serde::Serialize` can be passed to `Template::render`:

```rust
use anza::Setup;
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

let engine = Setup::new("templates").run()?;

let article = Article {
    id: 42,
    slug: "zero-js-architecture".into(),
    title: "Zero-JS Architecture with STUI".into(),
    summary: "How server-templated components eliminate frontend bundle bloat.".into(),
    author: "Elena Vance".into(),
    created: "2026-08-28".into(),
};

// Render component template
let html = engine.get("feed/card.html")?.render(&article)?;
```

## Python Engine Binding

In Python, pass dataclasses, Pydantic models or dicts; attributes are read by name:

```python
from dataclasses import dataclass
from anza import Setup

@dataclass
class Article:
    id: int
    slug: str
    title: str
    summary: str
    author: str
    created: str

engine = Setup(root="templates").run()

article = Article(
    id=42,
    slug="zero-js-architecture",
    title="Zero-JS Architecture with STUI",
    summary="How server-templated components eliminate frontend bundle bloat.",
    author="Elena Vance",
    created="2026-08-28"
)

html = engine.get_template("feed/card.html").bind(article)
```

## TypeScript Engine Binding

In TypeScript (Node.js, Deno, Bun, or Cloudflare Workers), bind typed objects with `@anzaui/engine`:

```typescript
import { Setup } from '@anzaui/engine';

interface Article {
  id: number;
  slug: string;
  title: string;
  summary: string;
  author: string;
  created: string;
}

const engine = await new Setup({ root: './templates' }).run();

const article: Article = {
  id: 42,
  slug: 'zero-js-architecture',
  title: 'Zero-JS Architecture with STUI',
  summary: 'How server-templated components eliminate frontend bundle bloat.',
  author: 'Elena Vance',
  created: '2026-08-28'
};

const html = engine.get('feed/card.html').bind(article);
```

## Slotted Child Composition

When combining parent and child templates, pass the rendered child strings into the parent's data payload:

```rust
// 1. Render all feed cards
let card = engine.get("feed/card.html")?;
let cards_html: String = articles
    .iter()
    .map(|a| card.render(a))
    .collect::<Result<Vec<_>, _>>()?
    .join("\n");

// 2. Render the "/" page with the cards bound into {{articles}};
//    Page also binds layout/shell.html with the page in {{content}}
let full_doc = Page::new("/")
    .param("title", "Home — Anza Blog")
    .param("description", "High-performance STUI blog powered by Anza.")
    .param("count", articles.len().to_string())
    .param("articles", cards_html)
    .run(&engine)?;
```
