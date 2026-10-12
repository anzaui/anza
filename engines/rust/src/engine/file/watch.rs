use {
  crate::{engine::cache::store::CacheStore, errors::Result},
  std::{path::Path, sync::Arc},
};

#[cfg(feature = "watch")]
use {
  crate::errors::Error,
  notify::{RecommendedWatcher, RecursiveMode, Watcher},
  std::{path::PathBuf, sync::mpsc::channel},
};

/// Keeps the template watcher alive. Dropping it stops reloading.
pub struct FileWatcher {
  #[cfg(feature = "watch")]
  _watcher: Option<RecommendedWatcher>,
}

/// Watch `root` and keep `cache` in sync with the `.html` templates under
/// it: a created or changed file is reloaded, a removed one is evicted.
/// Events are applied on a background thread that ends when the returned
/// [`FileWatcher`] is dropped. Without the `watch` feature this is a no-op.
pub fn listen(root: &Path, cache: Arc<CacheStore>, options: super::LoadOptions) -> Result<FileWatcher> {
  #[cfg(feature = "watch")]
  {
    let root = std::fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
    let (tx, rx) = channel::<notify::Result<notify::Event>>();
    let mut watcher = RecommendedWatcher::new(
      move |res| {
        let _ = tx.send(res);
      },
      notify::Config::default(),
    )
    .map_err(|e| Error::internal(format!("Watcher creation failed: {}", e)))?;

    if root.exists() {
      watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| Error::internal(format!("Watch failed on {}: {}", root.display(), e)))?;
    }

    // The receiver lives on this thread; the loop ends when the watcher
    // (and with it the sender) is dropped.
    std::thread::spawn(move || {
      for event in rx.into_iter().flatten() {
        for path in event.paths {
          apply(&root, &cache, &path, &options);
        }
      }
    });

    Ok(FileWatcher {
      _watcher: Some(watcher),
    })
  }

  #[cfg(not(feature = "watch"))]
  {
    let _ = (root, cache, options);
    Ok(FileWatcher {})
  }
}

/// Cache key of `path` (relative to `root`, `/`-separated like `load::one`).
#[cfg(feature = "watch")]
fn key(root: &Path, path: &Path) -> Option<(PathBuf, String)> {
  let rel = path.strip_prefix(root).ok()?.to_path_buf();
  let name = rel
    .components()
    .map(|c| c.as_os_str().to_string_lossy())
    .collect::<Vec<_>>()
    .join("/");
  Some((rel, name))
}

/// Bring the cache entry (or folder of entries) for `path` up to date.
#[cfg(feature = "watch")]
fn apply(root: &Path, cache: &CacheStore, path: &Path, options: &super::LoadOptions) {
  let Some((rel, name)) = key(root, path) else {
    return;
  };
  if path.is_dir() {
    // A folder (or a symlink to one) outside the root is never loaded.
    if !super::load::inside(root, path) {
      return;
    }
    // A folder moved in: load every template under it.
    if let Ok(templates) = super::load::all_with(path, options) {
      for (sub, tpl) in templates {
        let full = format!("{}/{}", name.trim_end_matches('/'), sub);
        cache.insert(full.clone(), tpl.renamed(full));
      }
    }
    return;
  }
  let is_html = path.extension().map_or(false, |ext| ext == "html");
  if path.is_file() {
    if is_html {
      // A half-written file fails to parse, an oversized or out-of-root one
      // is refused; the next event reloads it.
      if let Ok(tpl) = super::load::one_with(root, &rel, options) {
        cache.insert(name, tpl);
      }
    }
    return;
  }
  // Gone: the template itself, or a folder of templates.
  cache.remove(&name);
  let prefix = format!("{}/", name.trim_end_matches('/'));
  if let Ok(mut lock) = cache.templates.write() {
    lock.retain(|k, _| !k.starts_with(&prefix));
  }
}
