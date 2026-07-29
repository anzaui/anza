// tools/src/watcher/runner.rs

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tokio::sync::broadcast;

use crate::types::{ChangeKind, HmrMessage};

/// Starts the file system directory watcher and starts polling changes concurrently.
///
/// On any source change the dist is recompiled (import-graph resolution, non-fatal)
/// and an HMR event is broadcast to connected browsers.
pub fn start(
  src_path: PathBuf,
  dist_path: PathBuf,
  entries: Vec<PathBuf>,
  tx: broadcast::Sender<HmrMessage>,
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

  tokio::spawn(async move {
    let debounce = Duration::from_millis(150);

    loop {
      // Await the first filesystem event asynchronously without blocking the
      // Tokio executor.
      let first = match event_rx.recv().await {
        Some(Ok(evt)) => evt,
        _ => continue,
      };

      let mut events = vec![first];
      let mut last_activity = Instant::now();

      // Drain any rapid successive saves within the debounce window.
      while last_activity.elapsed() < debounce {
        tokio::select! {
          res = event_rx.recv() => {
            if let Some(Ok(evt)) = res {
              events.push(evt);
              last_activity = Instant::now();
            }
          }
          _ = tokio::time::sleep(Duration::from_millis(20)) => {}
        }
      }

      // Classify changed paths, deduplicating within the batch.
      let mut messages: Vec<HmrMessage> = Vec::new();
      for event in events {
        let is_mod = match event.kind {
          notify::EventKind::Modify(notify::event::ModifyKind::Data(_)) |
          notify::EventKind::Modify(notify::event::ModifyKind::Name(_)) |
          notify::EventKind::Create(_) |
          notify::EventKind::Remove(_) => true,
          _ => false,
        };
        if !is_mod {
          continue;
        }

        for path in event.paths {
          if let Some(msg) = watcher.classify(&path) {
            if !messages.iter().any(|m: &HmrMessage| m.path == msg.path && m.kind == msg.kind) {
              messages.push(msg);
            }
          }
        }
      }

      if messages.is_empty() {
        continue;
      }

      // Determine whether we need to recompile.
      let needs_rebuild = messages.iter().any(|m| {
        matches!(m.kind, ChangeKind::Js | ChangeKind::Html | ChangeKind::Css)
      });

      // Run the (blocking) compile on a dedicated OS thread so the Tokio
      // executor stays responsive and SSE connections stay alive during the
      // rebuild. After the rebuild finishes, broadcast the HMR events.
      if needs_rebuild {
        let src = src_path.clone();
        let dist = dist_path.clone();
        let ents = entries.clone();
        let tx2 = tx.clone();

        tokio::task::spawn_blocking(move || {
          crate::extract::compile(&src, &dist, false, &ents);
        })
        .await
        .ok();

        // Broadcast each changed-file event to all connected browser clients.
        for msg in &messages {
          anza_logs::watcher!("HMR: {:?} -> {}", msg.kind, msg.path);
          let _ = tx2.send(msg.clone());
        }
      } else {
        // Non-rebuild events (e.g. assets we don't track) — just log.
        for msg in &messages {
          anza_logs::watcher!("Changed (no rebuild): {} ", msg.path);
        }
      }
    }
  });
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

  /// Map a changed file path to an `HmrMessage`.
  ///
  /// Files under `tokens/` or `styles/` are always treated as CSS so the
  /// browser hot-swaps them without a full reload.  Other `.css` files get
  /// the same treatment.  `.js` and `.html` files trigger a full reload.
  fn classify(&self, path: &Path) -> Option<HmrMessage> {
    // Canonicalize the event path so strip_prefix works regardless of whether
    // notify returned an absolute or relative path.
    let abs = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
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
