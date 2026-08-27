use {
  crate::{
    engine::cache::Engine,
    errors::Result,
    models::document::Document,
  },
  std::collections::HashMap,
};

pub fn document(engine: &Engine, route: &str, params: &HashMap<String, String>) -> Result<Document> {
  // Normalize route to template path e.g. "/" -> "pages/home.html" or "pages/index.html"
  let clean_route = route.trim_matches('/');
  let template_name = if clean_route.is_empty() {
    "pages/home.html".to_string()
  } else {
    format!("pages/{}.html", clean_route)
  };

  // Try specific page template or fallback to route.html
  let page_tpl = engine.get(&template_name)
    .or_else(|_| engine.get(&format!("{}.html", clean_route)))
    .or_else(|_| engine.get("pages/index.html"));

  let content = match page_tpl {
    Ok(tpl) => tpl.bind(params)?,
    Err(_) => format!("<div class=\"content\">Route: {}</div>", route),
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
