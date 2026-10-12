// tools/src/build/inline.rs
//
// Production builds put each definition module's relative style, template
// and tags descriptor into the module itself (AUDIT P1/P4, DIST step 4), so
// an element costs one request instead of four. The prelude registers the
// values in `globalThis.__anzaInline`, keyed by the URL the runtime would
// fetch (`new URL(spec, import.meta.url).href`); the runtime
// (`core/ui/define/utils.js`) uses an entry instead of fetching. Dev builds
// never inline, so edits and HMR keep working on the files.

use std::path::{Path, PathBuf};

/// The registration statement prepended to a module, or an empty string when
/// none of `assets` can be inlined.
///
/// `assets` are (specifier as written, resolved source file), in source
/// order. CSS is minified; CSS with `@import` or relative `url()` stays a
/// file (a constructed sheet would resolve them against the document).
/// A template `x.html` also registers `x.tags.json` (`null` when absent, so
/// the runtime does not request it). A `x.tags.json` asset (a `page()`
/// template, whose HTML is not inlined) registers only the descriptor.
pub fn prelude(assets: &[(String, PathBuf)]) -> Result<String, String> {
  let mut entries: Vec<(String, String)> = Vec::new();
  for (spec, file) in assets {
    let ext = file.extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext {
      "css" => {
        let css = read(file)?;
        if !self_contained(&css) {
          continue;
        }
        let min = super::css::minify_inline(&css);
        entries.push((spec.clone(), json_string(&min)));
      }
      "html" => {
        let html = read(file)?;
        entries.push((spec.clone(), json_string(&html)));
        if let Some(stem) = spec.strip_suffix(".html") {
          entries.push((format!("{}.tags.json", stem), tags(&file.with_extension("tags.json"))?));
        }
      }
      // A page template's descriptor alone (its HTML stays a file).
      "json" if spec.ends_with(".tags.json") => entries.push((spec.clone(), tags(file)?)),
      _ => {}
    }
  }
  if entries.is_empty() {
    return Ok(String::new());
  }
  let list: Vec<String> = entries
    .iter()
    .map(|(spec, value)| format!("[{},{}]", json_string(spec), value))
    .collect();
  Ok(format!(
    "{}for(const[k,v]of[{}])m.set(new URL(k,b).href,v)}})(globalThis.__anzaInline??=new Map(),import.meta.url);\n",
    PRELUDE_START,
    list.join(",")
  ))
}

const PRELUDE_START: &str = "((m,b)=>{";

/// Renames one registry key in a module's prelude (its first line, when it
/// has one). SSG moves a page fragment from `./index.html` to
/// `./template.html`, so the descriptor key must follow
/// (`./index.tags.json` -> `./template.tags.json`): the runtime derives the
/// tags URL from the template URL.
pub fn rename_key(module: &str, from: &str, to: &str) -> String {
  if !module.starts_with(PRELUDE_START) {
    return module.to_string();
  }
  let split = module.find('\n').map_or(module.len(), |i| i + 1);
  let (first, rest) = module.split_at(split);
  let from = format!("[{},", json_string(from));
  let to = format!("[{},", json_string(to));
  format!("{}{}", first.replacen(&from, &to, 1), rest)
}

/// A tags descriptor as compact JSON, or `null` when the file is absent.
fn tags(file: &Path) -> Result<String, String> {
  match std::fs::read_to_string(file) {
    Ok(text) => serde_json::from_str::<serde_json::Value>(&text)
      .map(|value| value.to_string())
      .map_err(|e| format!("invalid {}: {}", file.display(), e)),
    Err(_) => Ok("null".to_string()),
  }
}

fn read(file: &Path) -> Result<String, String> {
  std::fs::read_to_string(file).map_err(|e| format!("cannot read {}: {}", file.display(), e))
}

/// A JS string literal (JSON strings are valid JS since ES2019). `</` is
/// escaped so the text is also safe inside an inline `<script>`.
fn json_string(text: &str) -> String {
  serde_json::to_string(text)
    .unwrap_or_else(|_| "\"\"".to_string())
    .replace("</", "<\\/")
}

/// True when the CSS does not depend on its own URL: no `@import` and every
/// `url()` is absolute, root-relative, a data URI or a fragment.
fn self_contained(css: &str) -> bool {
  if css.contains("@import") {
    return false;
  }
  let mut rest = css;
  while let Some(at) = rest.find("url(") {
    let target = rest[at + 4..]
      .trim_start()
      .trim_start_matches(|c| c == '"' || c == '\'');
    let ok = ["data:", "http:", "https:", "//", "/", "#"]
      .iter()
      .any(|p| target.starts_with(p));
    if !ok {
      return false;
    }
    rest = &rest[at + 4..];
  }
  true
}

#[cfg(test)]
mod tests {
  use super::*;

  fn tmp(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("anza-inline-{}-{}", name, std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
  }

  #[test]
  fn prelude_registers_css_html_and_tags() {
    let dir = tmp("all");
    std::fs::write(dir.join("style.css"), ":host {\n  display: block;\n}\n").unwrap();
    std::fs::write(dir.join("index.html"), "<p ref=\"x\">hi</p><script></script>").unwrap();
    std::fs::write(dir.join("index.tags.json"), "{\"version\":1,\"refs\":[\"x\"]}").unwrap();
    let out = prelude(&[
      ("./style.css".into(), dir.join("style.css")),
      ("./index.html".into(), dir.join("index.html")),
    ])
    .unwrap();
    assert!(out.starts_with("((m,b)=>{"), "{}", out);
    assert!(out.contains(r#"["./style.css",":host{display:block}"]"#), "{}", out);
    assert!(out.contains(r#"["./index.html","<p ref=\"x\">hi<\/p><script><\/script>"]"#), "{}", out);
    assert!(out.contains(r#"["./index.tags.json",{"refs":["x"],"version":1}]"#), "{}", out);
    assert!(out.ends_with("(globalThis.__anzaInline??=new Map(),import.meta.url);\n"));
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[test]
  fn missing_tags_register_null_and_relative_urls_stay_files() {
    let dir = tmp("partial");
    std::fs::write(dir.join("a.css"), ".x { background: url(./bg.png) }").unwrap();
    std::fs::write(dir.join("t.html"), "<b>x</b>").unwrap();
    let out = prelude(&[
      ("./a.css".into(), dir.join("a.css")),
      ("./t.html".into(), dir.join("t.html")),
    ])
    .unwrap();
    assert!(!out.contains("./a.css"), "{}", out);
    assert!(out.contains(r#"["./t.tags.json",null]"#), "{}", out);
    assert_eq!(prelude(&[("./a.css".into(), dir.join("a.css"))]).unwrap(), "");
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[test]
  fn page_tags_register_alone_and_follow_the_template_rename() {
    let dir = tmp("page");
    std::fs::write(dir.join("index.tags.json"), "{\"version\":1,\"refs\":[\"msg\"]}").unwrap();
    let out = prelude(&[
      ("./index.tags.json".into(), dir.join("index.tags.json")),
      ("./gone.tags.json".into(), dir.join("gone.tags.json")),
    ])
    .unwrap();
    assert!(out.contains(r#"["./index.tags.json",{"refs":["msg"],"version":1}]"#), "{}", out);
    assert!(out.contains(r#"["./gone.tags.json",null]"#), "{}", out);
    assert!(!out.contains(".html"), "{}", out);

    let module = format!("{}page('/a', {{ template: {{ html: './index.html' }} }}); // \"./index.tags.json\"\n", out);
    let renamed = rename_key(&module, "./index.tags.json", "./template.tags.json");
    assert!(renamed.contains(r#"["./template.tags.json",{"refs""#), "{}", renamed);
    assert!(!renamed.lines().next().unwrap().contains("./index.tags.json"), "{}", renamed);
    // Only the prelude line changes.
    assert!(renamed.ends_with("// \"./index.tags.json\"\n"), "{}", renamed);
    // Modules without a prelude are left alone.
    let plain = "const k = [\"./index.tags.json\",1];\n";
    assert_eq!(rename_key(plain, "./index.tags.json", "./template.tags.json"), plain);
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[test]
  fn self_contained_css() {
    assert!(self_contained(".a{background:url(data:image/png;base64,x)}"));
    assert!(self_contained(".a{background:url('/img/x.png')}"));
    assert!(!self_contained(".a{background:url(\"img/x.png\")}"));
    assert!(!self_contained("@import './x.css';"));
  }
}
