// tools/src/watcher/runner.rs

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tokio::sync::broadcast;

use crate::types::{ChangeKind, HmrMessage};

/// A batch of changes waits until no new event has arrived for this long
/// (editors emit several events per save), capped at [`MAX_BATCH`].
const QUIET: Duration = Duration::from_millis(25);
const MAX_BATCH: Duration = Duration::from_millis(300);

/// One batch for the rebuild worker: `hot` events were already copied to dist
/// and broadcast; `after` events are broadcast once the rebuild finished.
struct Batch {
  hot: Vec<HmrMessage>,
  after: Vec<HmrMessage>,
}

/// Starts the file system watcher.
///
/// Changes are handled by kind (P6):
/// - a CSS file, or an HTML template fragment, already in dist is copied
///   (atomically) and its HMR event is sent right away;
/// - everything else (JS, new files, full documents) waits for the rebuild.
///
/// The rebuild (`compile_dev`, a full but cached build: unchanged files are
/// skipped by mtime/size and hash) runs on a worker that coalesces batches
/// arriving while it runs, so at most one rebuild is pending at a time.
pub fn start(
  src_path: PathBuf,
  dist_path: PathBuf,
  entries: Vec<PathBuf>,
  tx: broadcast::Sender<HmrMessage>,
  rebuilt: tokio::sync::watch::Sender<u64>,
) {
  let (event_tx, mut event_rx) = tokio::sync::mpsc::unbounded_channel();

  let watcher = match SystemWatcher::new(&src_path, event_tx) {
    Ok(w) => w,
    Err(err) => {
      anza_logs::error!("Failed to initialize file watcher: {:?}", err);
      return;
    }
  };

  anza_logs::watcher!("Watching for changes in '{}' folder...", src_path.display());

  let base = crate::build::base::load_deploy_base(&dist_path);
  let hot_src = watcher.src_path.clone();
  let (batch_tx, batch_rx) = tokio::sync::mpsc::unbounded_channel::<Batch>();
  tokio::spawn(rebuild_worker(
    batch_rx,
    src_path.clone(),
    dist_path.clone(),
    entries,
    base.clone(),
    tx.clone(),
    rebuilt,
  ));

  tokio::spawn(async move {
    loop {
      let first = match event_rx.recv().await {
        Some(Ok(evt)) => evt,
        Some(Err(_)) => continue,
        None => break,
      };

      let mut events = vec![first];
      let started = Instant::now();
      loop {
        let left = MAX_BATCH.saturating_sub(started.elapsed()).min(QUIET);
        if left.is_zero() {
          break;
        }
        tokio::select! {
          res = event_rx.recv() => match res {
            Some(Ok(evt)) => events.push(evt),
            Some(Err(_)) => {}
            None => break,
          },
          _ = tokio::time::sleep(left) => break,
        }
      }

      let messages = watcher.messages(events);
      if messages.is_empty() {
        continue;
      }

      let mut batch = Batch { hot: Vec::new(), after: Vec::new() };
      for msg in messages {
        if hot_copy(&hot_src, &dist_path, &msg, &base) {
          anza_logs::watcher!("HMR (hot): {:?} -> {}", msg.kind, msg.path);
          let _ = tx.send(msg.clone());
          batch.hot.push(msg);
        } else {
          batch.after.push(msg);
        }
      }
      if batch_tx.send(batch).is_err() {
        break;
      }
    }
  });
}

/// Rebuild worker: one `compile_dev` per group of pending batches, then the
/// deferred events. Hot-copied files are re-checked after a rebuild so a
/// rebuild that read an older save can never leave stale output behind.
async fn rebuild_worker(
  mut rx: tokio::sync::mpsc::UnboundedReceiver<Batch>,
  src: PathBuf,
  dist: PathBuf,
  entries: Vec<PathBuf>,
  base: String,
  tx: broadcast::Sender<HmrMessage>,
  rebuilt: tokio::sync::watch::Sender<u64>,
) {
  let canonical = std::fs::canonicalize(&src).unwrap_or_else(|_| src.clone());
  let mut pending: Option<Batch> = None;
  loop {
    let mut batch = match pending.take() {
      Some(batch) => batch,
      None => match rx.recv().await {
        Some(batch) => batch,
        None => return,
      },
    };
    while let Ok(more) = rx.try_recv() {
      merge(&mut batch, more);
    }

    let (s, d, e) = (src.clone(), dist.clone(), entries.clone());
    let started = Instant::now();
    tokio::task::spawn_blocking(move || crate::extract::compile_dev(&s, &d, &e))
      .await
      .ok();
    anza_logs::watcher!("Rebuilt in {:?}", started.elapsed());
    rebuilt.send_modify(|n| *n += 1);

    for msg in &batch.after {
      anza_logs::watcher!("HMR: {:?} -> {}", msg.kind, msg.path);
      let _ = tx.send(msg.clone());
    }

    // Saves that arrived during the rebuild were hot-copied already, but the
    // rebuild may have written an older copy over them: copy again and resend.
    let mut next: Option<Batch> = None;
    while let Ok(more) = rx.try_recv() {
      match next.as_mut() {
        Some(n) => merge(n, more),
        None => next = Some(more),
      }
    }
    if let Some(ref n) = next {
      for msg in &n.hot {
        if !in_sync(&canonical, &dist, &msg.path) && hot_copy(&canonical, &dist, msg, &base) {
          let _ = tx.send(msg.clone());
        }
      }
    }
    pending = next;
  }
}

fn merge(into: &mut Batch, more: Batch) {
  for msg in more.hot {
    if !into.hot.iter().any(|m| m.path == msg.path && m.kind == msg.kind) {
      into.hot.push(msg);
    }
  }
  for msg in more.after {
    if !into.after.iter().any(|m| m.path == msg.path && m.kind == msg.kind) {
      into.after.push(msg);
    }
  }
}

/// True when dist holds the same bytes as src for `rel`.
fn in_sync(src: &Path, dist: &Path, rel: &str) -> bool {
  match (std::fs::read(src.join(rel)), std::fs::read(dist.join(rel))) {
    (Ok(a), Ok(b)) => a == b,
    _ => false,
  }
}

/// Copy a changed CSS file or HTML template fragment straight into dist so
/// its HMR event can go out before the rebuild. Only for files the last build
/// already put in dist unchanged (CSS is copied verbatim; fragments are when
/// no deploy base rewrites them). Returns false when the change must wait
/// for the rebuild instead (JS, new files, documents, SSG output paths).
pub fn hot_copy(src: &Path, dist: &Path, msg: &HmrMessage, base: &str) -> bool {
  let from = src.join(&msg.path);
  let to = dist.join(&msg.path);
  if !from.is_file() || !to.is_file() {
    return false;
  }
  match msg.kind {
    ChangeKind::Css if from.extension().map_or(false, |e| e == "css") => {
      crate::fs_atomic::copy(&from, &to).is_ok()
    }
    ChangeKind::Html if base.is_empty() => {
      let Ok(content) = std::fs::read_to_string(&from) else {
        return false;
      };
      let Ok(current) = std::fs::read_to_string(&to) else {
        return false;
      };
      // A document gets the import map; an SSG page may sit at this path.
      if crate::build::html::is_document(&content) || crate::build::html::is_document(&current) {
        return false;
      }
      crate::fs_atomic::write(&to, content).is_ok()
    }
    _ => false,
  }
}

pub struct SystemWatcher {
  _watcher: RecommendedWatcher,
  src_path: PathBuf,
}

impl SystemWatcher {
  pub fn new(
    src_path: &Path,
    tx: tokio::sync::mpsc::UnboundedSender<notify::Result<notify::Event>>,
  ) -> Result<Self, notify::Error> {
    // Canonicalize so that absolute paths returned by inotify events can be
    // strip_prefix'd correctly. Falls back to the original path on failure.
    let canonical = std::fs::canonicalize(src_path).unwrap_or_else(|_| src_path.to_path_buf());

    let mut watcher = RecommendedWatcher::new(
      move |res| {
        let _ = tx.send(res);
      },
      Config::default(),
    )?;

    watcher.watch(&canonical, RecursiveMode::Recursive)?;

    Ok(Self {
      _watcher: watcher,
      src_path: canonical,
    })
  }

  /// Event path under the (canonical) watched root. Paths notify reports under
  /// the root are used as-is: a removed file cannot be canonicalized, so
  /// canonicalizing first used to drop remove events. Otherwise canonicalize
  /// the parent directory (which still exists) and re-attach the file name.
  fn absolute(&self, path: &Path) -> PathBuf {
    if path.starts_with(&self.src_path) {
      return path.to_path_buf();
    }
    if let Ok(abs) = std::fs::canonicalize(path) {
      return abs;
    }
    match (path.parent(), path.file_name()) {
      (Some(parent), Some(name)) => std::fs::canonicalize(parent)
        .map(|p| p.join(name))
        .unwrap_or_else(|_| path.to_path_buf()),
      _ => path.to_path_buf(),
    }
  }

  /// Classify a batch of notify events, deduplicated, in arrival order.
  fn messages(&self, events: Vec<notify::Event>) -> Vec<HmrMessage> {
    let mut messages: Vec<HmrMessage> = Vec::new();
    for event in events {
      let relevant = matches!(
        event.kind,
        notify::EventKind::Modify(notify::event::ModifyKind::Data(_))
          | notify::EventKind::Modify(notify::event::ModifyKind::Name(_))
          | notify::EventKind::Create(_)
          | notify::EventKind::Remove(_)
      );
      if !relevant {
        continue;
      }
      for path in event.paths {
        if let Some(msg) = self.classify(&path) {
          if !messages.iter().any(|m| m.path == msg.path && m.kind == msg.kind) {
            messages.push(msg);
          }
        }
      }
    }
    messages
  }

  /// Map a changed file path to an `HmrMessage`.
  ///
  /// Files under `tokens/` or `styles/` are always treated as CSS so the
  /// browser hot-swaps them without a full reload.  Other `.css` files get
  /// the same treatment.  `.js` and `.html` files trigger a full reload.
  fn classify(&self, path: &Path) -> Option<HmrMessage> {
    let abs = self.absolute(path);
    let ext = abs.extension()?.to_str()?;
    let rel = abs
      .strip_prefix(&self.src_path)
      .ok()?
      .to_string_lossy()
      .into_owned();

    let first_component = abs
      .strip_prefix(&self.src_path)
      .ok()
      .and_then(|p| p.components().next())
      .and_then(|c| {
        if let std::path::Component::Normal(s) = c {
          s.to_str()
        } else {
          None
        }
      })
      .unwrap_or("");

    let kind = match ext {
      "css" => ChangeKind::Css,
      "js" => {
        // Design-token and style files that have a .js extension should still
        // trigger a full reload.
        if first_component == "tokens" || first_component == "styles" {
          ChangeKind::Css
        } else {
          ChangeKind::Js
        }
      }
      "html" => ChangeKind::Html,
      _ => return None,
    };

    Some(HmrMessage { kind, path: rel })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn hot_copy_only_takes_css_and_fragments_already_in_dist() {
    let root = std::env::temp_dir().join(format!("anza-hot-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    let (src, dist) = (root.join("src"), root.join("dist"));
    for dir in [&src, &dist] {
      std::fs::create_dir_all(dir.join("p")).unwrap();
    }
    let put = |p: &Path, s: &str| std::fs::write(p, s).unwrap();
    let msg = |kind, path: &str| HmrMessage { kind, path: path.into() };

    put(&src.join("p/a.css"), "new");
    put(&dist.join("p/a.css"), "old");
    assert!(hot_copy(&src, &dist, &msg(ChangeKind::Css, "p/a.css"), ""));
    assert_eq!(std::fs::read_to_string(dist.join("p/a.css")).unwrap(), "new");

    // Not in dist yet (new file): the rebuild decides.
    put(&src.join("p/b.css"), "b");
    assert!(!hot_copy(&src, &dist, &msg(ChangeKind::Css, "p/b.css"), ""));

    // Fragment: copied. With a deploy base it is rewritten, so wait.
    put(&src.join("p/t.html"), "<h1>new</h1>");
    put(&dist.join("p/t.html"), "<h1>old</h1>");
    assert!(!hot_copy(&src, &dist, &msg(ChangeKind::Html, "p/t.html"), "/base"));
    assert!(hot_copy(&src, &dist, &msg(ChangeKind::Html, "p/t.html"), ""));
    assert_eq!(std::fs::read_to_string(dist.join("p/t.html")).unwrap(), "<h1>new</h1>");

    // dist path holds an SSG document: never overwrite it with the fragment.
    put(&src.join("p/index.html"), "<h1>x</h1>");
    put(&dist.join("p/index.html"), "<!DOCTYPE html><html></html>");
    assert!(!hot_copy(&src, &dist, &msg(ChangeKind::Html, "p/index.html"), ""));

    // JS (and .js under styles/ classified as css) always wait.
    put(&src.join("p/m.js"), "1");
    put(&dist.join("p/m.js"), "0");
    assert!(!hot_copy(&src, &dist, &msg(ChangeKind::Js, "p/m.js"), ""));
    assert!(!hot_copy(&src, &dist, &msg(ChangeKind::Css, "p/m.js"), ""));
    let _ = std::fs::remove_dir_all(&root);
  }

  #[test]
  fn classifies_removed_files() {
    let root = std::env::temp_dir().join(format!("anza-watch-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(root.join("pages")).unwrap();
    let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
    let watcher = SystemWatcher::new(&root, tx).unwrap();

    let file = watcher.src_path.join("pages/gone.js");
    std::fs::write(&file, "x").unwrap();
    std::fs::remove_file(&file).unwrap();
    let msg = watcher.classify(&file).expect("removed file still classified");
    assert_eq!(msg.kind, ChangeKind::Js);
    assert_eq!(msg.path, "pages/gone.js");

    // A non-canonical path to a removed file resolves through its parent.
    let dotted = std::path::Path::new(&root).join("pages").join("gone.css");
    let msg = watcher.classify(&dotted).expect("non-canonical path classified");
    assert_eq!(msg.path, "pages/gone.css");
    let _ = std::fs::remove_dir_all(&root);
  }
}
