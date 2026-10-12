use {
  crate::{
    engine::cache::Engine,
    errors::Result,
    models::document::Document,
  },
  std::collections::HashMap,
};

/// Escape text for HTML content and attribute values.
fn escape_html(s: &str) -> String {
  let mut out = String::with_capacity(s.len());
  for c in s.chars() {
    match c {
      '&' => out.push_str("&amp;"),
      '<' => out.push_str("&lt;"),
      '>' => out.push_str("&gt;"),
      '"' => out.push_str("&quot;"),
      '\'' => out.push_str("&#39;"),
      _ => out.push(c),
    }
  }
  out
}

/// A route usable as a template name: no `.`/`..` segments, backslashes or
/// NULs. Templates are looked up in the in-memory cache only (never read
/// from disk here), and cache keys are paths under the root, so this is
/// defense in depth: a route can never name a template outside `pages/` by
/// walking up, nor anything outside the root.
fn safe_route(route: &str) -> bool {
  !route.contains('\\')
    && !route.contains('\0')
    && route.split('/').all(|seg| seg != ".." && seg != ".")
}

pub fn document(engine: &Engine, route: &str, params: &HashMap<String, String>) -> Result<Document> {
  // Normalize route to template path e.g. "/" -> "pages/home.html" or "pages/index.html"
  let clean_route = route.trim_matches('/');
  let template_name = if clean_route.is_empty() {
    "pages/home.html".to_string()
  } else {
    format!("pages/{}.html", clean_route)
  };

  // Try specific page template or fallback to route.html
  let page_tpl = if safe_route(clean_route) {
    engine
      .get(&template_name)
      .or_else(|_| engine.get(&format!("{}.html", clean_route)))
      .or_else(|_| engine.get("pages/index.html"))
  } else {
    engine.get("pages/index.html")
  };

  let content = match page_tpl {
    Ok(tpl) => tpl.bind(params)?,
    // The route comes from the request URL: never write it unescaped.
    Err(_) => format!("<div class=\"content\">Route: {}</div>", escape_html(route)),
  };

  // Check if shell.html exists
  let full_html = if let Ok(shell) = engine.get("layout/shell.html") {
    let mut shell_params = params.clone();
    shell_params.insert("slot_main".into(), content.clone());
    shell_params.insert("content".into(), content);
    shell.bind(&shell_params)?
  } else {
    // Default standard SSR shell with open DSD container
    format!(
      r#"<!DOCTYPE html>
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
    {}
  </dock-main>
</body>
</html>"#,
      content
    )
  };

  Ok(Document::new(full_html))
}
