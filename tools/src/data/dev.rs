use std::path::PathBuf;
use tokio::sync::broadcast;
use crate::{extract, server, types::HmrMessage, watcher};

#[derive(Debug, Clone)]
pub struct Dev {
  pub src: PathBuf,
  pub dist: PathBuf,
  pub port: u16,
  pub entries: Vec<PathBuf>,
}

impl Dev {
  pub fn validate(&self) -> Result<(), String> {
    if self.port == 0 {
      return Err("port must be non-zero".into());
    }
    Ok(())
  }

  pub async fn run(&self) -> Result<(), String> {
    self.validate()?;
    anza_logs::info!("Bootstrapping native dev pipeline...");

    extract::compile(&self.src, &self.dist, false, &self.entries);

    let (tx, _rx) = broadcast::channel::<HmrMessage>(16);
    let dist = self.dist.clone();
    let server_tx = tx.clone();
    let port = self.port;

    tokio::spawn(async move {
      server::run(port, &dist, server_tx).await;
    });

    watcher::start(self.src.clone(), self.dist.clone(), self.entries.clone(), tx);
    tokio::signal::ctrl_c().await.map_err(|e| e.to_string())?;
    anza_logs::info!("Shutting down native pipeline safely.");
    Ok(())
  }
}
