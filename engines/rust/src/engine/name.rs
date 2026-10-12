//! Template names and page routes (see `docs/engines/contract.md`).
//!
//! A template name is a relative, `/`-separated path under the template
//! root: not empty, no leading `/`, no `\` or NUL, and no empty, `.` or `..`
//! segment. Names are only ever looked up in the in-memory cache; request
//! input never reaches the filesystem.

/// Whether `name` is a well-formed template name.
pub fn valid(name: &str) -> bool {
  !name.is_empty()
    && !name.starts_with('/')
    && !name.contains(['\\', '\0'])
    && name.split('/').all(|seg| !seg.is_empty() && seg != "." && seg != "..")
}

/// The page template for a request route: `/` is `pages/home.html`, `/a/b`
/// is `pages/a/b.html`. `None` when the route is not a valid name.
pub fn page(route: &str) -> Option<String> {
  let clean = route.trim_matches('/');
  if clean.is_empty() {
    return Some("pages/home.html".into());
  }
  valid(clean).then(|| format!("pages/{clean}.html"))
}

/// Whether a fragment may render `name` under the `fragments` allowlist:
/// empty allows every template; an entry ending in `/` allows that prefix,
/// any other entry allows that exact name.
pub fn allowed(list: &[String], name: &str) -> bool {
  list.is_empty()
    || list.iter().any(|entry| {
      if entry.ends_with('/') {
        name.starts_with(entry.as_str())
      } else {
        name == entry
      }
    })
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn names() {
    for ok in ["a.html", "feed/card.html", "a..b.html", ".hidden/x.html"] {
      assert!(valid(ok), "{ok}");
    }
    for bad in ["", "/a.html", "a//b.html", "../a.html", "a/../b.html", "./a.html", "a/.", "a\\b.html", "a\0.html", "a/"] {
      assert!(!valid(bad), "{bad:?}");
    }
  }

  #[test]
  fn pages() {
    assert_eq!(page("/").as_deref(), Some("pages/home.html"));
    assert_eq!(page("").as_deref(), Some("pages/home.html"));
    assert_eq!(page("/about/").as_deref(), Some("pages/about.html"));
    assert_eq!(page("/a/b").as_deref(), Some("pages/a/b.html"));
    assert_eq!(page("/../secret"), None);
    assert_eq!(page("/a\\b"), None);
    assert_eq!(page("//a"), Some("pages/a.html".into()));
  }

  #[test]
  fn allowlist() {
    let list = vec!["feed/".to_string(), "card.html".to_string()];
    assert!(allowed(&[], "anything.html"));
    assert!(allowed(&list, "feed/x.html"));
    assert!(allowed(&list, "card.html"));
    assert!(!allowed(&list, "layout/shell.html"));
    assert!(!allowed(&list, "feedx.html"));
  }
}
