//! Markdown → HTML transforms (align with tasks/docs.js).

use std::path::{Component, Path, PathBuf};

use std::collections::HashMap;

use pulldown_cmark::{html, CowStr, Event, Options, Parser, Tag};

pub fn md_to_html_body(
  md: &str,
  md_path: &Path,
  docs_root: &Path,
  base: &str,
) -> Result<String, String> {
  let mut options = Options::empty();
  options.insert(Options::ENABLE_TABLES);
  options.insert(Options::ENABLE_STRIKETHROUGH);
  options.insert(Options::ENABLE_TASKLISTS);
  options.insert(Options::ENABLE_FOOTNOTES);

  let mut ids = HeadingIds::default();
  let parser = Parser::new_ext(md, options).into_offset_iter().map(|(event, range)| match event {
    Event::Start(Tag::Heading { level, id: None, classes, attrs }) => {
      let id = ids.next(heading_source_text(&md[range])).map(CowStr::from);
      Event::Start(Tag::Heading { level, id, classes, attrs })
    }
    other => other,
  });
  let mut html_out = String::new();
  html::push_html(&mut html_out, parser);

  let html_out = rewrite_links(&html_out, md_path, docs_root, base);
  let html_out = pre_to_view_code(&html_out);
  let html_out = wrap_tables(&html_out);
  Ok(html_out)
}

/// GitHub-style heading slug, exactly as `slug()` in
/// tasks/doc-links-check.js computes it from the Markdown heading text:
/// drop `` ` ``, `*`, `_`, trim, lowercase, keep only ASCII word characters,
/// whitespace and `-`, then turn each whitespace character into `-`.
pub fn heading_slug(text: &str) -> String {
  let stripped: String = text.chars().filter(|c| !matches!(c, '`' | '*' | '_')).collect();
  stripped
    .trim()
    .to_lowercase()
    .chars()
    .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-' || c.is_whitespace())
    .map(|c| if c.is_whitespace() { '-' } else { c })
    .collect()
}

/// Markdown source of a heading → its text: ATX `#` markers or the setext
/// underline removed.
fn heading_source_text(raw: &str) -> &str {
  let raw = raw.trim_end_matches(['\n', '\r']);
  let trimmed = raw.trim_start();
  if trimmed.starts_with('#') {
    trimmed.trim_start_matches('#').trim()
  } else {
    // Setext: text lines, then a `===` / `---` underline.
    raw.rsplit_once('\n').map_or(raw, |(text, _)| text).trim()
  }
}

/// Unique heading ids for one page: repeats get `-1`, `-2`, … (GitHub).
#[derive(Default)]
struct HeadingIds {
  seen: HashMap<String, usize>,
}

impl HeadingIds {
  fn next(&mut self, text: &str) -> Option<String> {
    let base = heading_slug(text);
    if base.is_empty() {
      return None;
    }
    // Same scheme as github-slugger: `seen[base]` counts repeats, and every
    // emitted id is reserved so `Setup-1` after two `Setup`s is `setup-1-1`.
    let mut id = base.clone();
    if let Some(&count) = self.seen.get(&base) {
      let mut n = count;
      loop {
        n += 1;
        id = format!("{base}-{n}");
        if !self.seen.contains_key(&id) {
          break;
        }
      }
      self.seen.insert(base, n);
    }
    self.seen.insert(id.clone(), 0);
    Some(id)
  }
}

pub fn route_from_md(md_path: &Path, docs_root: &Path, base: &str) -> Result<String, String> {
  let rel = md_path
    .strip_prefix(docs_root)
    .map_err(|_| format!("{} is outside docs root", md_path.display()))?;
  let no_ext = rel.with_extension("");
  let s = no_ext.to_string_lossy().replace('\\', "/");
  let s = section_route(&s);
  if s.is_empty() {
    return Ok(base_home(base));
  }
  Ok(format!("{}/{}", base.trim_end_matches('/'), s))
}

/// A section's `index.md` is the section page: `router/index` → `router`
/// (one URL per page; `/docs/router/index` is never canonical).
pub fn section_route(path: &str) -> &str {
  if path == "index" {
    return "";
  }
  path.strip_suffix("/index").unwrap_or(path)
}

/// Route of the docs root: the base itself, or `/` for an empty base.
pub fn base_home(base: &str) -> String {
  let base = base.trim_end_matches('/');
  if base.is_empty() { "/".into() } else { base.into() }
}

pub fn tag_from_route(route: &str, base: &str) -> String {
  if route == base.trim_end_matches('/') {
    return "page-docs".into();
  }
  let rest = route
    .trim_start_matches(base.trim_end_matches('/'))
    .trim_start_matches('/');
  format!("doc-{}", rest.replace('/', "-"))
}

/// Port of tasks/docs.js rewriteLinks / mdHrefToRoute.
pub fn rewrite_links(html: &str, current_md: &Path, docs_root: &Path, base: &str) -> String {
  let mut out = String::with_capacity(html.len());
  let mut rest = html;
  while let Some(i) = rest.find("href=\"") {
    out.push_str(&rest[..i]);
    out.push_str("href=\"");
    rest = &rest[i + 6..];
    let Some(end) = rest.find('"') else {
      out.push_str(rest);
      return out;
    };
    let href = &rest[..end];
    out.push_str(&rewrite_one_href(href, current_md, docs_root, base));
    out.push('"');
    rest = &rest[end + 1..];
  }
  out.push_str(rest);
  out
}

fn rewrite_one_href(href: &str, current_md: &Path, docs_root: &Path, base: &str) -> String {
  let hash_idx = href.find('#');
  let (path_part, hash) = match hash_idx {
    Some(i) => (&href[..i], &href[i..]),
    None => (href, ""),
  };
  // Only relative links to markdown files are pages: absolute URLs
  // (`https://…/x.md`, `//host/x.md`, `mailto:`) and site-root paths are
  // left exactly as written.
  if !path_part.ends_with(".md") || path_part.starts_with('/') || has_scheme(path_part) {
    return href.to_string();
  }

  // Reject escapes outside docs_root (string normalize; no canonicalize required).
  let route = md_href_to_route(path_part, current_md, docs_root, base);
  if !route.starts_with(base.trim_end_matches('/')) {
    return href.to_string();
  }
  let rel_check = {
    let current_dir = current_md.parent().unwrap_or(Path::new("."));
    pathdiff_under(docs_root, &normalize_join(current_dir, path_part))
  };
  if rel_check.starts_with("..") {
    return href.to_string();
  }
  format!("{route}{hash}")
}

/// `scheme:` prefix (RFC 3986: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )).
fn has_scheme(href: &str) -> bool {
  match href.split_once(':') {
    Some((scheme, _)) => {
      let mut chars = scheme.chars();
      chars.next().map_or(false, |c| c.is_ascii_alphabetic())
        && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
    }
    None => false,
  }
}

fn md_href_to_route(href: &str, current_md: &Path, docs_root: &Path, base: &str) -> String {
  let current_rel = current_md
    .strip_prefix(docs_root)
    .unwrap_or(current_md)
    .to_string_lossy()
    .replace('\\', "/");
  let current_dir = Path::new(&current_rel)
    .parent()
    .map(|p| p.to_path_buf())
    .unwrap_or_else(|| PathBuf::from(""));
  let joined = if current_dir.as_os_str().is_empty() {
    PathBuf::from(href)
  } else {
    current_dir.join(href)
  };
  let normalized = normalize_components(&joined);
  let no_ext = normalized
    .to_string_lossy()
    .trim_end_matches(".md")
    .replace('\\', "/");
  let no_ext = section_route(&no_ext);
  if no_ext.is_empty() {
    return base_home(base);
  }
  format!("{}/{}", base.trim_end_matches('/'), no_ext.trim_start_matches('/'))
}

fn normalize_join(base: &Path, rel: &str) -> PathBuf {
  normalize_components(&base.join(rel))
}

fn normalize_components(path: &Path) -> PathBuf {
  let mut out = PathBuf::new();
  for c in path.components() {
    match c {
      Component::CurDir => {}
      Component::ParentDir => {
        out.pop();
      }
      Component::RootDir => out.push("/"),
      Component::Normal(s) => out.push(s),
      Component::Prefix(p) => out.push(p.as_os_str()),
    }
  }
  out
}

fn pathdiff_under(root: &Path, target: &Path) -> String {
  let t = normalize_components(target);
  match t.strip_prefix(root) {
    Ok(rel) => rel.to_string_lossy().replace('\\', "/"),
    Err(_) => {
      // Try string-based relative from root
      let root_s = root.to_string_lossy();
      let t_s = t.to_string_lossy();
      if let Some(rest) = t_s.strip_prefix(root_s.as_ref()) {
        rest.trim_start_matches('/').to_string()
      } else {
        format!("../{}", t_s)
      }
    }
  }
}

fn pre_to_view_code(html: &str) -> String {
  // <pre><code class="language-X">BODY</code></pre>
  let mut out = html.to_string();
  out = replace_all_pre_lang(&out);
  out = replace_all_pre_plain(&out);
  out
}

fn lang_alias(lang: &str) -> String {
  let key = lang.trim().to_lowercase();
  match key.as_str() {
    "js" => "javascript".into(),
    "ts" => "typescript".into(),
    "sh" | "shell" => "bash".into(),
    "" => "text".into(),
    _ => key,
  }
}

fn replace_all_pre_lang(html: &str) -> String {
  let mut out = String::new();
  let mut rest = html;
  let open = "<pre><code class=\"language-";
  while let Some(i) = rest.find(open) {
    out.push_str(&rest[..i]);
    rest = &rest[i + open.len()..];
    let Some(end_lang) = rest.find('"') else {
      out.push_str(open);
      break;
    };
    let lang = lang_alias(&rest[..end_lang]);
    rest = &rest[end_lang + 1..];
    if rest.starts_with('>') {
      rest = &rest[1..];
    }
    let Some(end_code) = rest.find("</code></pre>") else {
      out.push_str(&format!("<view-code language=\"{lang}\">"));
      break;
    };
    let body = &rest[..end_code];
    rest = &rest[end_code + "</code></pre>".len()..];
    out.push_str(&format!(
      "<view-code language=\"{lang}\">{body}</view-code>"
    ));
  }
  out.push_str(rest);
  out
}

fn replace_all_pre_plain(html: &str) -> String {
  let mut out = String::new();
  let mut rest = html;
  let open = "<pre><code>";
  while let Some(i) = rest.find(open) {
    // Skip if already view-code context — plain pre only
    out.push_str(&rest[..i]);
    rest = &rest[i + open.len()..];
    let Some(end_code) = rest.find("</code></pre>") else {
      out.push_str(open);
      break;
    };
    let body = &rest[..end_code];
    rest = &rest[end_code + "</code></pre>".len()..];
    out.push_str(&format!(
      "<view-code language=\"text\">{body}</view-code>"
    ));
  }
  out.push_str(rest);
  out
}

fn wrap_tables(html: &str) -> String {
  let mut out = String::new();
  let mut rest = html;
  while let Some(i) = rest.find("<table") {
    let before = &rest[..i];
    // Skip if already wrapped
    let tail = before.trim_end();
    if tail.ends_with("<div class=\"table-wrap\">") || tail.ends_with("<div class=\"table-wrap\" >")
    {
      // find end of this table and copy through
      if let Some(end) = rest[i..].find("</table>") {
        let end_abs = i + end + "</table>".len();
        out.push_str(&rest[..end_abs]);
        rest = &rest[end_abs..];
        continue;
      }
    }
    out.push_str(before);
    if let Some(end) = rest[i..].find("</table>") {
      let end_abs = i + end + "</table>".len();
      let table = &rest[i..end_abs];
      out.push_str("<div class=\"table-wrap\">");
      out.push_str(table);
      out.push_str("</div>");
      rest = &rest[end_abs..];
    } else {
      out.push_str(&rest[i..]);
      return out;
    }
  }
  out.push_str(rest);
  out
}

#[cfg(test)]
mod heading_tests {
  use super::*;

  #[test]
  fn slugs_match_doc_links_check() {
    // Expected values computed with slug() from tasks/doc-links-check.js.
    let cases = [
      ("Dev Server", "dev-server"),
      ("`anza dev` — flags", "anza-dev--flags"),
      ("Mode A SSG (Declarative Shadow DOM)", "mode-a-ssg-declarative-shadow-dom"),
      ("**Bold** and _em_ snake_case", "bold-and-em-snakecase"),
      ("What's new in 0.6.0?", "whats-new-in-060"),
      ("  Spaced   out  ", "spaced---out"),
      ("ui-button / ui-input", "ui-button--ui-input"),
      ("Café crème", "caf-crme"),
    ];
    for (text, want) in cases {
      assert_eq!(heading_slug(text), want, "{text}");
    }
  }

  #[test]
  fn section_index_pages_route_to_the_section() {
    let root = Path::new("/d");
    assert_eq!(route_from_md(Path::new("/d/router/index.md"), root, "/docs").unwrap(), "/docs/router");
    assert_eq!(route_from_md(Path::new("/d/index.md"), root, "/docs").unwrap(), "/docs");
    assert_eq!(route_from_md(Path::new("/d/router/api.md"), root, "/docs").unwrap(), "/docs/router/api");
    assert_eq!(route_from_md(Path::new("/d/a/index/x.md"), root, "/docs").unwrap(), "/docs/a/index/x");
    let html = rewrite_links(
      "<a href=\"../ui/index.md#props\">x</a><a href=\"index.md\">y</a>",
      Path::new("/d/router/api.md"),
      root,
      "/docs",
    );
    assert_eq!(html, "<a href=\"/docs/ui#props\">x</a><a href=\"/docs/router\">y</a>");
  }

  #[test]
  fn only_relative_markdown_links_are_rewritten() {
    let root = Path::new("/d");
    let md = Path::new("/d/a/b.md");
    for href in [
      "https://example.com/a.md",
      "http://example.com/x/index.md#h",
      "//example.com/a.md",
      "/elsewhere/a.md",
      "mailto:a.md",
      "../../outside.md",
    ] {
      let html = format!("<a href=\"{href}\">x</a>");
      assert_eq!(rewrite_links(&html, md, root, "/eng"), html, "{href}");
    }
    assert_eq!(
      rewrite_links("<a href=\"./c.md\">x</a><a href=\"../index.md\">h</a>", md, root, "/eng"),
      "<a href=\"/eng/a/c\">x</a><a href=\"/eng\">h</a>"
    );
    assert_eq!(rewrite_links("<a href=\"index.md\">h</a>", Path::new("/d/x.md"), root, ""), "<a href=\"/\">h</a>");
  }

  #[test]
  fn headings_get_unique_ids() {
    let md = "# Title\n\n## Setup\n\ntext\n\n## Setup\n\n### `api()` *call*\n\nSetup\n-----\n\n## Setup-1\n";
    let html = md_to_html_body(md, Path::new("/d/a.md"), Path::new("/d"), "/docs").unwrap();
    assert!(html.contains("<h1 id=\"title\">Title</h1>"), "{html}");
    assert!(html.contains("<h2 id=\"setup\">Setup</h2>"), "{html}");
    assert!(html.contains("<h2 id=\"setup-1\">Setup</h2>"), "{html}");
    assert!(html.contains("<h3 id=\"api-call\">"), "{html}");
    assert!(html.contains("<h2 id=\"setup-2\">Setup</h2>"), "{html}");
    assert!(html.contains("<h2 id=\"setup-1-1\">Setup-1</h2>"), "{html}");
  }
}
