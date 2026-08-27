// tools/src/build/html.rs
//
// HTML post-processing: strips existing inline import maps and injects
// a `<script type="importmap" src="/importmap.json">` link plus an HMR
// live-reload script in dev mode.
//
// Also: `opaque_view_code` — docs `<view-code>` hosts intentionally embed raw
// HTML/JS samples. Structural walks (SEO extract, tags.json, entry discovery)
// must treat that interior as text so nested `<button>` / `</dialog>` / etc.
// are not parsed as real document structure.

use std::collections::HashMap;

/// Docs code-snippet custom element whose children are opaque sample text.
const VIEW_CODE: &str = "view-code";

/// Treat `<view-code…>…</view-code>` interiors as opaque text (HTML-escaped)
/// so nested sample tags / stray closers cannot confuse string HTML walks or
/// `scraper` parses.
///
/// The host open/close tags are preserved (so `view-code` still appears in tag
/// descriptors). Unclosed hosts escape the remainder as text. Does **not**
/// mutate emission paths — callers use this only for structural analysis.
pub fn opaque_view_code(html: &str) -> String {
  opaque_element_content(html, VIEW_CODE)
}

fn opaque_element_content(html: &str, tag: &str) -> String {
  let open = format!("<{}", tag);
  let close = format!("</{}>", tag);
  let lower = html.to_ascii_lowercase();
  let open_l = open.to_ascii_lowercase();
  let close_l = close.to_ascii_lowercase();

  let mut out = String::with_capacity(html.len());
  let mut search_from = 0usize;

  while let Some(tail) = lower.get(search_from..) {
    let Some(rel) = tail.find(&open_l) else {
      break;
    };
    let start = search_from + rel;
    let after_name = start + open.len();
    let boundary = html.as_bytes().get(after_name).copied().unwrap_or(b'>');
    if !is_tag_name_boundary(boundary) {
      // Prefix false positive (`<view-code-extra`); copy through the match and continue.
      let Some(chunk) = html.get(search_from..after_name) else {
        break;
      };
      out.push_str(chunk);
      search_from = after_name;
      continue;
    }

    if let Some(chunk) = html.get(search_from..start) {
      out.push_str(chunk);
    }

    let gt = match memchr::memchr(b'>', html.as_bytes().get(after_name..).unwrap_or(&[])) {
      Some(i) => after_name + i,
      None => {
        if let Some(rest) = html.get(start..) {
          out.push_str(rest);
        }
        return out;
      }
    };

    let Some(open_tag) = html.get(start..=gt) else {
      return out;
    };

    // Self-closing `<view-code … />` — keep as-is.
    if html.as_bytes().get(gt.saturating_sub(1)) == Some(&b'/') {
      out.push_str(open_tag);
      search_from = gt + 1;
      continue;
    }

    let content_start = gt + 1;
    let end = match lower.get(content_start..).and_then(|s| s.find(&close_l)) {
      Some(i) => content_start + i,
      None => {
        // Unclosed host: keep the open tag, escape the rest so nested markup
        // cannot participate in further structural analysis.
        out.push_str(open_tag);
        if let Some(rest) = html.get(content_start..) {
          out.push_str(&escape_text(rest));
        }
        return out;
      }
    };

    let close_end = end + close.len();
    let Some(close_tag) = html.get(end..close_end) else {
      out.push_str(open_tag);
      return out;
    };

    out.push_str(open_tag);
    // Escape opaque interior so sample tags / stray closers are plain text.
    if let Some(inner) = html.get(content_start..end) {
      out.push_str(&escape_text(inner));
    }
    out.push_str(close_tag);
    search_from = close_end;
  }

  if let Some(rest) = html.get(search_from..) {
    out.push_str(rest);
  }
  out
}

fn is_tag_name_boundary(b: u8) -> bool {
  matches!(b, b'>' | b'/' | b' ' | b'\n' | b'\r' | b'\t')
}

fn escape_text(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
}

/// Remove any existing inline `<script type="importmap">` blocks.
pub fn strip_importmap(html: &str) -> String {
  let mut result = html.to_string();
  while let Some(start) = result.find("<script type=\"importmap\"") {
    if let Some(end) = result[start..].find("</script>") {
      let absolute_end = start + end + 9;
      result.drain(start..absolute_end);
    } else {
      break;
    }
  }
  result
}

/// Inject importmap link and optional HMR script into an HTML string.
pub fn inject_assets(html: &str, map: &HashMap<String, String>, dev: bool) -> String {
  let clean = strip_importmap(html);

  let json = serde_json::json!({ "imports": map });
  let text = serde_json::to_string_pretty(&json).unwrap_or_default();
  let tag = format!(
    "\n<script type=\"importmap\">\n{}\n</script>\n",
    text
  );

  let hmr = if dev {
    r#"
<!-- Native HMR Live-Reload Script -->
<script type="module">
  let sse;
  let retry = 500;

  function connect() {
    sse = new EventSource('/hmr');

    sse.addEventListener('message', async (e) => {
      retry = 500; // reset back-off on successful message
      try {
        const msg = JSON.parse(e.data);

        if (msg.kind === 'css') {
          // Hot-swap: update all <link> tags that reference this file.
          const links = document.querySelectorAll(`link[rel="stylesheet"]`);
          for (const link of links) {
            const url = new URL(link.href, location.origin);
            if (url.pathname.includes(msg.path)) {
              url.searchParams.set('t', Date.now());
              link.href = url.href;
            }
          }
          // Also notify any constructable-stylesheet consumers.
          const res = await fetch(`/dist/${msg.path}?t=${Date.now()}`);
          if (res.ok) {
            const css = await res.text();
            window.dispatchEvent(new CustomEvent('anza:hmr:css', {
              detail: { path: msg.path, css }
            }));
          }
        } else if (msg.kind === 'html') {
          const res = await fetch(`/dist/${msg.path}?t=${Date.now()}`);
          if (res.ok) {
            const html = await res.text();
            window.dispatchEvent(new CustomEvent('anza:hmr:html', {
              detail: { path: msg.path, html }
            }));
          }
        } else if (msg.kind === 'js' || msg.kind === 'reload') {
          location.reload();
        }
      } catch (err) {
        console.warn('[HMR] Failed to process event:', err);
      }
    });

    sse.onerror = () => {
      // Server restarted or connection dropped — reconnect with back-off.
      sse.close();
      setTimeout(() => {
        retry = Math.min(retry * 2, 10_000);
        connect();
      }, retry);
    };
  }

  connect();
</script>
"#
  } else {
    ""
  };

  let mut out = clean;
  if let Some(pos) = out.find("<head>") {
    let insert = pos + 6;
    out.insert_str(insert, &tag);
  } else if let Some(pos) = out.find("<html>") {
    let insert = pos + 6;
    let combined = format!("<head>{}</head>", tag);
    out.insert_str(insert, &combined);
  } else {
    out.insert_str(0, &tag);
  }

  if dev {
    if let Some(pos) = out.rfind("</body>") {
      out.insert_str(pos, hmr);
    } else {
      out.push_str(hmr);
    }
  }

  out
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn opaque_view_code_escapes_nested_sample_tags() {
    let html = r#"
<p>Intro.</p>
<view-code language="html">
<button></button>
<dialog></dialog>
</some-el></some-el>
</view-code>
<p>After.</p>
"#;
    let out = opaque_view_code(html);
    assert!(out.contains("<view-code language=\"html\">"));
    assert!(out.contains("</view-code>"));
    assert!(out.contains("&lt;button&gt;"));
    assert!(out.contains("&lt;/some-el&gt;"));
    // Raw nested markup must not survive for structural analysis.
    assert!(!out.contains("<button>"));
    assert!(!out.contains("<dialog>"));
    assert!(!out.contains("</some-el>"));
    assert!(out.contains("<p>Intro.</p>"));
    assert!(out.contains("<p>After.</p>"));
  }

  #[test]
  fn opaque_view_code_keeps_already_escaped_samples_as_text() {
    let html = r#"<view-code language="html">&lt;button&gt;&lt;/button&gt;</view-code>"#;
    let out = opaque_view_code(html);
    assert!(out.starts_with("<view-code language=\"html\">"));
    assert!(out.ends_with("</view-code>"));
    // Already-escaped samples are re-escaped for analysis (safe, still text).
    assert!(out.contains("&amp;lt;button&amp;gt;"));
    assert!(!out.contains("<button>"));
  }

  #[test]
  fn opaque_view_code_ignores_prefix_false_positives() {
    let html = r#"<view-code-extra><button></button></view-code-extra>"#;
    let out = opaque_view_code(html);
    assert_eq!(out, html);
  }

  #[test]
  fn opaque_view_code_escapes_unclosed_remainder() {
    let html = r#"<view-code><button></button>"#;
    let out = opaque_view_code(html);
    assert!(out.starts_with("<view-code>"));
    assert!(out.contains("&lt;button&gt;"));
    assert!(!out.contains("<button>"));
  }

  #[test]
  fn opaque_view_code_handles_consecutive_stray_closers() {
    // Regression: nested-looking closers inside view-code must not panic or
    // leak into surrounding structure during SEO / tags analysis.
    let html = concat!(
      "<article><h1>X</h1>",
      "<view-code language=\"html\">",
      "</some-el></some-el>",
      "<ui-button></ui-button>",
      "</view-code>",
      "<p>Keep me.</p></article>",
    );
    let out = opaque_view_code(html);
    assert!(out.contains("<view-code language=\"html\">"), "got: {out}");
    assert!(out.contains("&lt;/some-el&gt;&lt;/some-el&gt;"), "got: {out}");
    assert!(out.contains("&lt;ui-button&gt;"), "got: {out}");
    assert!(!out.contains("</some-el>"));
    assert!(!out.contains("<ui-button>"));
    assert!(out.contains("<p>Keep me.</p>"));
  }

  #[test]
  fn opaque_view_code_is_case_insensitive() {
    let html = r#"<View-Code Lang="JS"><button></button></View-Code><p>ok</p>"#;
    let out = opaque_view_code(html);
    assert!(out.contains("<View-Code Lang=\"JS\">"));
    assert!(out.contains("</View-Code>"));
    assert!(out.contains("&lt;button&gt;"));
    assert!(!out.contains("<button>"));
    assert!(out.contains("<p>ok</p>"));
  }
}

