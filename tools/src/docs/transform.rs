//! Markdown → HTML transforms (align with tasks/docs.js).

use std::path::{Component, Path, PathBuf};

use pulldown_cmark::{html, Options, Parser};

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

  let parser = Parser::new_ext(md, options);
  let mut html_out = String::new();
  html::push_html(&mut html_out, parser);

  let html_out = rewrite_links(&html_out, md_path, docs_root, base);
  let html_out = pre_to_view_code(&html_out);
  let html_out = wrap_tables(&html_out);
  Ok(html_out)
}

pub fn route_from_md(md_path: &Path, docs_root: &Path, base: &str) -> Result<String, String> {
  let rel = md_path
    .strip_prefix(docs_root)
    .map_err(|_| format!("{} is outside docs root", md_path.display()))?;
  let no_ext = rel.with_extension("");
  let s = no_ext.to_string_lossy().replace('\\', "/");
  if s == "index" || s.is_empty() {
    return Ok(base.trim_end_matches('/').to_string());
  }
  Ok(format!("{}/{}", base.trim_end_matches('/'), s))
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
  if !path_part.ends_with(".md") {
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
  if no_ext.is_empty() || no_ext == "index" {
    return base.trim_end_matches('/').to_string();
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
