use std::path::PathBuf;
use tokio::sync::broadcast;
use crate::{extract, server, types::HmrMessage, watcher};

#[derive(Debug, Clone)]
pub struct Dev {
  pub src: PathBuf,
  pub dist: PathBuf,
  pub port: u16,
  /// Bind address (`--host`, default `127.0.0.1`).
  pub host: String,
  pub entries: Vec<PathBuf>,
}

impl Dev {
  pub fn validate(&self) -> Result<(), String> {
    if self.port == 0 {
      return Err("port must be non-zero".into());
    }
    if self.host.trim().is_empty() {
      return Err("--host must not be empty".into());
    }
    Ok(())
  }

  pub async fn run(&self) -> Result<(), String> {
    self.validate()?;
    // Held until shutdown so `anza build` cannot wipe dist under the server.
    let _lock = crate::lock::Lock::acquire(&crate::lock::project_dir(&self.src), "dev")?;
    anza_logs::info!("Bootstrapping native dev pipeline...");

    extract::compile_dev(&self.src, &self.dist, &self.entries);

    let (tx, _rx) = broadcast::channel::<HmrMessage>(server::runner::HMR_CHANNEL);
    // Bumped after every rebuild so the server reloads its route manifest.
    let (rebuilt_tx, rebuilt_rx) = tokio::sync::watch::channel(0u64);
    let dist = self.dist.clone();
    let server_tx = tx.clone();
    let port = self.port;
    let host = self.host.clone();

    tokio::spawn(async move {
      server::run(&host, port, &dist, server_tx, rebuilt_rx).await;
    });

    watcher::start(self.src.clone(), self.dist.clone(), self.entries.clone(), tx, rebuilt_tx);
    tokio::signal::ctrl_c().await.map_err(|e| e.to_string())?;
    anza_logs::info!("Shutting down native pipeline safely.");
    Ok(())
  }
}
