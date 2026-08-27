use {
  crate::errors::Result,
  std::path::Path,
};

#[cfg(feature = "watch")]
use {
  crate::errors::Error,
  notify::{RecommendedWatcher, RecursiveMode, Watcher},
  std::sync::mpsc::channel,
};

pub struct FileWatcher {
  #[cfg(feature = "watch")]
  _watcher: Option<RecommendedWatcher>,
}

pub fn listen(path: &Path) -> Result<FileWatcher> {
  #[cfg(feature = "watch")]
  {
    let (tx, _rx) = channel::<notify::Result<notify::Event>>();
    let mut watcher = RecommendedWatcher::new(
      move |res| {
        let _ = tx.send(res);
      },
      notify::Config::default(),
    )
    .map_err(|e| Error::internal(format!("Watcher creation failed: {}", e)))?;

    if path.exists() {
      watcher
        .watch(path, RecursiveMode::Recursive)
        .map_err(|e| Error::internal(format!("Watch failed on {}: {}", path.display(), e)))?;
    }

    Ok(FileWatcher {
      _watcher: Some(watcher),
    })
  }

  #[cfg(not(feature = "watch"))]
  {
    let _ = path;
    Ok(FileWatcher {})
  }
}
