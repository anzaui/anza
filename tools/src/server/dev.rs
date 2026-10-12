// tools/src/server/dev.rs
//
// Dev-only response handling: the HMR client is injected while serving
// (never written to dist).

use axum::{
  body::{to_bytes, Body},
  http::{header, HeaderValue, Request, Response},
  middleware::Next,
};

/// Live-reload client added to every HTML document served by `anza dev`.
pub const HMR_CLIENT: &str = r#"
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
"#;

/// Add [`HMR_CLIENT`] to an HTML document (before the last `</body>`, or at
/// the end). Fragments and documents that already carry it are unchanged.
pub fn inject_hmr(html: &str) -> Option<String> {
  if !crate::build::html::is_document(html) || html.contains("new EventSource('/hmr')") {
    return None;
  }
  let mut out = String::with_capacity(html.len() + HMR_CLIENT.len());
  match html.rfind("</body>") {
    Some(pos) => {
      out.push_str(&html[..pos]);
      out.push_str(HMR_CLIENT);
      out.push_str(&html[pos..]);
    }
    None => {
      out.push_str(html);
      out.push_str(HMR_CLIENT);
    }
  }
  Some(out)
}

fn is_html(res: &Response<Body>) -> bool {
  res
    .headers()
    .get(header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .map_or(false, |v| v.starts_with("text/html"))
}

/// Dev response layer: injects the HMR client into HTML documents.
pub async fn layer(req: Request<Body>, next: Next) -> Response<Body> {
  if req.uri().path() == "/hmr" {
    return next.run(req).await;
  }
  let res = next.run(req).await;
  if !is_html(&res) || !res.status().is_success() {
    return res;
  }
  let (mut parts, body) = res.into_parts();
  let bytes = match to_bytes(body, usize::MAX).await {
    Ok(bytes) => bytes,
    Err(_) => return Response::from_parts(parts, Body::empty()),
  };
  let injected = std::str::from_utf8(&bytes).ok().and_then(inject_hmr);
  match injected {
    Some(html) => {
      parts.headers.remove(header::CONTENT_LENGTH);
      if let Ok(len) = HeaderValue::from_str(&html.len().to_string()) {
        parts.headers.insert(header::CONTENT_LENGTH, len);
      }
      Response::from_parts(parts, Body::from(html))
    }
    None => Response::from_parts(parts, Body::from(bytes)),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn injects_only_into_documents() {
    let doc = "<!DOCTYPE html><html><body><p>x</p></body></html>";
    let out = inject_hmr(doc).unwrap();
    assert!(out.contains("EventSource"));
    assert!(out.find("EventSource").unwrap() < out.rfind("</body>").unwrap());
    assert!(inject_hmr("<template><p>x</p></template>").is_none());
    assert!(inject_hmr("<div>fragment</div>").is_none());
    // Never twice.
    assert!(inject_hmr(&out).is_none());
  }
}
