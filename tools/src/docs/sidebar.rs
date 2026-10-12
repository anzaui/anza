//! Sidebar generated from the docs folder tree (D10).
//!
//! One section per top-level folder, plus "Overview" for loose top-level
//! files. A folder's `index.md` front matter names (`title`) and orders
//! (`order`) its section, and is listed first as "Overview". Other pages are
//! labelled by front-matter `title`, else their first `# heading`, else the
//! file name, and sorted by `order`, then file name.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use super::config::{SidebarItem, SidebarSection};
use super::front;

struct Entry {
  rel: String,
  file: String,
  label: String,
  order: Option<i64>,
  index: bool,
}

fn first_heading(body: &str) -> Option<String> {
  body
    .lines()
    .find_map(|l| l.strip_prefix("# "))
    .map(|t| t.trim().to_string())
    .filter(|t| !t.is_empty())
}

fn title_case(name: &str) -> String {
  let mut chars = name.chars();
  match chars.next() {
    Some(c) => c.to_uppercase().chain(chars).collect(),
    None => String::new(),
  }
}

/// Build sidebar sections for `pages` (markdown files under `docs_root`);
/// `home` (the docs home page) is not listed.
pub fn generate(docs_root: &Path, pages: &[PathBuf], home: &Path) -> Vec<SidebarSection> {
  // Section key ("" for top-level files) → entries.
  let mut groups: BTreeMap<String, Vec<Entry>> = BTreeMap::new();
  let mut section_meta: BTreeMap<String, (Option<String>, Option<i64>)> = BTreeMap::new();

  for path in pages {
    if path == home {
      continue;
    }
    let Ok(rel) = path.strip_prefix(docs_root) else {
      continue;
    };
    let rel_s = rel.to_string_lossy().replace('\\', "/");
    let raw = std::fs::read_to_string(path).unwrap_or_default();
    let (fm, body) = front::parse(&raw);
    let file = rel
      .file_stem()
      .and_then(|s| s.to_str())
      .unwrap_or_default()
      .to_string();
    let key = match rel_s.split_once('/') {
      Some((dir, _)) => dir.to_string(),
      None => String::new(),
    };
    let index = file == "index" && !key.is_empty() && rel_s == format!("{key}/index.md");
    if index {
      section_meta.insert(key.clone(), (fm.title.clone(), fm.order));
    }
    let label = if index {
      "Overview".to_string()
    } else {
      fm.title
        .clone()
        .or_else(|| first_heading(&body))
        .unwrap_or_else(|| file.clone())
    };
    groups.entry(key).or_default().push(Entry {
      rel: rel_s,
      file,
      label,
      order: if index { None } else { fm.order },
      index,
    });
  }

  let mut sections: Vec<(Option<i64>, String, SidebarSection)> = Vec::new();
  for (key, mut entries) in groups {
    entries.sort_by(|a, b| {
      b.index
        .cmp(&a.index)
        .then_with(|| match (a.order, b.order) {
          (Some(x), Some(y)) => x.cmp(&y),
          (Some(_), None) => std::cmp::Ordering::Less,
          (None, Some(_)) => std::cmp::Ordering::Greater,
          (None, None) => std::cmp::Ordering::Equal,
        })
        .then_with(|| a.file.cmp(&b.file))
        .then_with(|| a.rel.cmp(&b.rel))
    });
    let (title, order) = section_meta.get(&key).cloned().unwrap_or((None, None));
    let title = title.unwrap_or_else(|| {
      if key.is_empty() {
        "Overview".to_string()
      } else {
        title_case(&key)
      }
    });
    // Loose top-level pages come first.
    let order = if key.is_empty() { Some(i64::MIN) } else { order };
    let items = entries
      .into_iter()
      .enumerate()
      .map(|(i, e)| SidebarItem {
        path: e.rel,
        label: Some(e.label),
        hide: false,
        order: Some(i as i32),
      })
      .collect();
    let id = if key.is_empty() { "overview".to_string() } else { key.clone() };
    sections.push((order, key, SidebarSection { id, title, items }));
  }

  sections.sort_by(|a, b| {
    match (a.0, b.0) {
      (Some(x), Some(y)) => x.cmp(&y),
      (Some(_), None) => std::cmp::Ordering::Less,
      (None, Some(_)) => std::cmp::Ordering::Greater,
      (None, None) => std::cmp::Ordering::Equal,
    }
    .then_with(|| a.1.cmp(&b.1))
  });
  sections.into_iter().map(|(_, _, s)| s).collect()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn sections_and_items_follow_front_matter_then_names() {
    let root = std::env::temp_dir().join(format!("anza-sidebar-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    let files = [
      ("index.md", "# Home\n"),
      ("faq.md", "# FAQ\n"),
      ("zeta/index.md", "---\ntitle: Getting Started\norder: 1\n---\n# Intro\n"),
      ("zeta/b.md", "# Bee\n"),
      ("zeta/a.md", "---\ntitle: Last\norder: 9\n---\n# A\n"),
      ("zeta/c.md", "no heading\n"),
      ("alpha/x.md", "# X\n"),
    ];
    let mut pages = Vec::new();
    for (rel, body) in files {
      let path = root.join(rel);
      std::fs::create_dir_all(path.parent().unwrap()).unwrap();
      std::fs::write(&path, body).unwrap();
      pages.push(path);
    }
    let sections = generate(&root, &pages, &root.join("index.md"));
    let titles: Vec<&str> = sections.iter().map(|s| s.title.as_str()).collect();
    assert_eq!(titles, ["Overview", "Getting Started", "Alpha"]);
    let zeta: Vec<(&str, &str)> = sections[1]
      .items
      .iter()
      .map(|i| (i.path.as_str(), i.label.as_deref().unwrap()))
      .collect();
    assert_eq!(
      zeta,
      [("zeta/index.md", "Overview"), ("zeta/a.md", "Last"), ("zeta/b.md", "Bee"), ("zeta/c.md", "c")]
    );
    assert_eq!(sections[0].items[0].path, "faq.md");
    let _ = std::fs::remove_dir_all(&root);
  }
}
