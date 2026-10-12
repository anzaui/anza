use {
  crate::{
    engine::{cache::Engine, name},
    errors::{Error, Result},
    models::document::Document,
  },
  std::collections::HashMap,
};

/// The document used when the root has no `layout/shell.html`.
pub const DEFAULT_SHELL: (&str, &str) = (
  "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Anza App</title>\n</head>\n<body>\n  <dock-main>\n    <template shadowrootmode=\"open\">\n      <slot></slot>\n    </template>\n    ",
  "\n  </dock-main>\n</body>\n</html>",
);

/// Render the page for `route` (see `docs/engines/contract.md`):
/// 1. `/` is `pages/home.html`, `/a/b` is `pages/a/b.html`.
/// 2. Unknown routes use `pages/index.html` (the catch-all) when it exists.
/// 3. Otherwise (or for a malformed route) the result is `NotFound`.
/// 4. The page goes into `layout/shell.html` as `{{content}}`, or into a
///    minimal default document when there is no shell.
pub fn document(engine: &Engine, route: &str, params: &HashMap<String, String>) -> Result<Document> {
  let not_found = || Error::not_found("Page not found");
  let template = name::page(route).ok_or_else(not_found)?;
  let page = engine
    .get(&template)
    .or_else(|_| engine.get("pages/index.html"))
    .map_err(|_| not_found())?;
  let content = page.bind(params)?;

  let html = match engine.get("layout/shell.html") {
    Ok(shell) => {
      let mut shell_params = params.clone();
      shell_params.insert("content".into(), content);
      shell.bind(&shell_params)?
    }
    Err(_) => {
      let mut out = String::with_capacity(DEFAULT_SHELL.0.len() + content.len() + DEFAULT_SHELL.1.len());
      out.push_str(DEFAULT_SHELL.0);
      out.push_str(&content);
      out.push_str(DEFAULT_SHELL.1);
      out
    }
  };

  Ok(Document::new(html))
}
