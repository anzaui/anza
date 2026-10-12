// tools/src/server/dev.rs
//
// Dev-only response handling: the HMR client is injected while serving
// (never written to dist).

use axum::{
  body::{to_bytes, Body},
  http::{header, HeaderValue, Request, Response, StatusCode},
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

/// Served for `/sw.js` in dev: replaces any service worker a browser kept
/// from a production build, wipes its caches and unregisters itself (R1).
pub const NOOP_SW: &str = r#"// anza dev: no-op service worker. Removes any stale worker and its caches.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
"#;

/// Handler for `/sw.js` in dev ([`NOOP_SW`], never cached).
pub async fn noop_sw() -> Response<Body> {
  Response::builder()
    .header(header::CONTENT_TYPE, "text/javascript; charset=utf-8")
    .header(header::CACHE_CONTROL, "no-store")
    .body(Body::from(NOOP_SW))
    .unwrap()
}

/// Strong ETag of a response body (content hash + length).
pub fn etag(bytes: &[u8]) -> String {
  use std::hash::{Hash, Hasher};
  let mut hasher = std::collections::hash_map::DefaultHasher::new();
  bytes.hash(&mut hasher);
  format!("\"{:016x}-{:x}\"", hasher.finish(), bytes.len())
}

/// True when an `If-None-Match` header value matches `tag` (`*` or a list).
fn none_match(header: &str, tag: &str) -> bool {
  header.split(',').map(str::trim).any(|t| t == "*" || t == tag || t.strip_prefix("W/") == Some(tag))
}

/// Dev response layer, on everything except the `/hmr` stream:
/// - injects the HMR client into HTML documents (R2);
/// - `Cache-Control: no-cache` unless the handler set one, so the browser
///   always revalidates (R3);
/// - a strong ETag on 200 responses, answering `If-None-Match` with 304.
///   `Last-Modified` (one-second resolution) is dropped so two saves within
///   a second can never revalidate as unchanged.
pub async fn layer(mut req: Request<Body>, next: Next) -> Response<Body> {
  if req.uri().path() == "/hmr" {
    return next.run(req).await;
  }
  let if_none_match = req
    .headers_mut()
    .remove(header::IF_NONE_MATCH)
    .and_then(|v| v.to_str().ok().map(str::to_string));
  req.headers_mut().remove(header::IF_MODIFIED_SINCE);
  req.headers_mut().remove(header::IF_UNMODIFIED_SINCE);

  let res = next.run(req).await;
  let (mut parts, body) = res.into_parts();
  parts.headers.remove(header::LAST_MODIFIED);
  if !parts.headers.contains_key(header::CACHE_CONTROL) {
    parts.headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
  }
  let event_stream = parts
    .headers
    .get(header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .map_or(false, |v| v.starts_with("text/event-stream"));
  if parts.status != StatusCode::OK || event_stream {
    return Response::from_parts(parts, body);
  }

  let bytes = match to_bytes(body, usize::MAX).await {
    Ok(bytes) => bytes,
    Err(_) => return Response::from_parts(parts, Body::empty()),
  };
  let html = parts
    .headers
    .get(header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .map_or(false, |v| v.starts_with("text/html"));
  let bytes = match html.then(|| std::str::from_utf8(&bytes).ok().and_then(inject_hmr)).flatten() {
    Some(injected) => axum::body::Bytes::from(injected),
    None => bytes,
  };

  let tag = etag(&bytes);
  if let Ok(value) = HeaderValue::from_str(&tag) {
    parts.headers.insert(header::ETAG, value);
  }
  if if_none_match.as_deref().map_or(false, |h| none_match(h, &tag)) {
    parts.status = StatusCode::NOT_MODIFIED;
    parts.headers.remove(header::CONTENT_LENGTH);
    parts.headers.remove(header::CONTENT_TYPE);
    return Response::from_parts(parts, Body::empty());
  }
  parts.headers.insert(header::CONTENT_LENGTH, HeaderValue::from(bytes.len()));
  Response::from_parts(parts, Body::from(bytes))
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
