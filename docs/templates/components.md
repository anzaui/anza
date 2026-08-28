# Components & Partials

Anza Server Partials are self-contained `.html` fragments designed for rendering list items, cards, modals, or real-time UI stream slices. Partials encapsulate their own markup, local `<style>` definitions, and interactive action endpoints.

## What You Get

| Feature | Description |
|---|---|
| **Self-Contained Styling** | Component-level `<style>` block included directly in the template |
| **Reusable Partial Rendering** | Loop over database records or collections and map to partial fragments |
| **Direct Action Endpoints** | Integrated action triggers (`[delete]`, `[sig]`, forms) within component markup |
| **Streamable Chunks** | Rendered partials can be dispatched directly across SSE or WebSocket streams |

## Card Component Anatomy (`feed/card.html`)

Below is the standard article card component template:

```html
<article class="post-card" id="article-{{id}}">
  <style>
    .post-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      background: var(--surface);
      transition: border-color 0.15s ease;
    }

    .post-card:hover {
      border-color: var(--accent);
    }

    .post-header-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.5rem;
    }

    .post-title {
      font-size: 1.15rem;
      font-weight: 600;
    }

    .post-title a {
      color: var(--text);
      text-decoration: none;
    }

    .post-title a:hover {
      color: var(--accent);
    }

    .post-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      gap: 0.5rem;
    }

    .post-summary {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .post-footer-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .read-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    .post-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .post-actions button {
      background: none;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 0.8rem;
    }
  </style>

  <div class="post-header-line">
    <h2 class="post-title">
      <a href="/article/{{slug}}">{{title}}</a>
    </h2>
    <div class="post-meta">
      <time datetime="{{created}}">{{created}}</time>
      <span>&bull;</span>
      <span>{{author}}</span>
    </div>
  </div>

  <p class="post-summary">{{summary}}</p>

  <div class="post-footer-line">
    <a href="/article/{{slug}}" class="read-link">read full article &rarr;</a>
    <div class="post-actions">
      <a href="/article/{{slug}}/envelope" target="_blank" title="Inspect Signed STUI Envelope">[sig]</a>
      <form method="POST" action="/articles/{{id}}/delete" style="margin: 0; display: inline;">
        <button type="submit" onclick="return confirm('Delete article?');">[delete]</button>
      </form>
    </div>
  </div>
</article>
```

## Rendering Multiple Partials

In server route handlers, query records from your database and map each item to a rendered partial string:

### In Rust (Axum)
```rust
let articles: Vec<Article> = db::get_recent_articles(&pool).await?;

let feed_html: String = articles
    .iter()
    .map(|article| engine.render("feed/card.html", &article))
    .collect::<Result<Vec<_>, _>>()?
    .join("\n");

let page_html = engine.render_page("pages/home.html", &json!({
    "count": articles.len(),
    "articles": feed_html
}))?;
```

### In Python (FastAPI)
```python
articles = await db.get_recent_articles()

feed_html = "\n".join([
    engine.render("feed/card.html", article.to_dict())
    for article in articles
])

return engine.render_page("pages/home.html", {
    "count": len(articles),
    "articles": feed_html
})
```

## Live Stream Dispatch

When a new article is created, render its partial immediately and broadcast a signed STUI envelope to all connected stream clients:

```rust
let card_html = engine.render("feed/card.html", &new_article)?;
let envelope = engine.sign_envelope("dock-feed", &card_html, anza::StreamMode::Prepend)?;

// Broadcast envelope to SSE clients
sse_broadcaster.send(envelope)?;
```
