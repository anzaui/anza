use std::path::PathBuf;

use clap::{Parser, Subcommand};
use tokio::sync::broadcast;

use anza::{
  data::{Build, Check, Create, Dev, Docs, Generate},
  extract,
  types::HmrMessage,
  watcher,
};

#[derive(Parser, Debug)]
#[command(
  name = "anza",
  version = "0.5.0",
  about = "Anza web platform library — reactive state, networking, offline, animations, custom elements. Instant build step. Pure browser ESM."
)]
struct Args {
  #[command(subcommand)]
  command: Option<Command>,

  #[arg(short, long, default_value = "src")]
  src: String,

  #[arg(short, long, default_value = "3000")]
  port: u16,

  #[arg(long, default_value = "dist")]
  dist: String,

  #[arg(short, long)]
  build: bool,

  /// Verbose logging (debug level, richer panic diagnostics).
  #[arg(short, long, global = true)]
  verbose: bool,
}

#[derive(Subcommand, Debug)]
enum Command {
  Scan {
    #[arg(short, long, default_value = "src")]
    src: String,

    #[arg(long)]
    watch: bool,

    #[arg(long, default_value = "dist/types")]
    types: String,
  },
  Build {
    #[arg(short, long, default_value = "src")]
    src: String,

    #[arg(long, default_value = "dist")]
    dist: String,

    /// Entry module(s) to resolve from. Defaults to src/index.js plus any
    /// HTML module scripts discovered under src.
    #[arg(short, long)]
    entry: Vec<String>,
  },
  Dev {
    #[arg(short, long, default_value = "src")]
    src: String,

    #[arg(short, long, default_value = "3000")]
    port: u16,

    #[arg(long, default_value = "dist")]
    dist: String,

    /// Entry module(s) to resolve from.
    #[arg(short, long)]
    entry: Vec<String>,
  },
  Doctor {
    #[arg(short, long, default_value = "src")]
    src: String,

    /// Promote warnings to failures (same severity as `anza check`).
    #[arg(long)]
    strict: bool,
  },
  /// Strict structure contract check for CI (`anza check && anza build`).
  Check {
    #[arg(short, long, default_value = "src")]
    src: String,
  },
  Create {
    /// Name of the new app directory.
    name: String,
  },
  /// Thin filesystem generator into structure slots (respects anza.json remaps).
  Generate {
    /// page | dock | view | part
    kind: String,
    /// Folder / registry name (kebab-case).
    name: String,
    #[arg(short, long, default_value = "src")]
    src: String,
    /// Page tree under src (must be listed in anza.json pages[] when set).
    #[arg(long)]
    tree: Option<String>,
    /// Page route (default /{name}).
    #[arg(long)]
    route: Option<String>,
    /// Comma-separated page via chain (default rootDock).
    #[arg(long)]
    via: Option<String>,
    /// Dock parent registry key (default rootDock).
    #[arg(long)]
    parent: Option<String>,
  },
  /// Generate docs site from markdown + docs/config.toml → dist-first tree.
  Docs {
    /// Path to docs/config.toml or docs/ directory.
    #[arg(long, default_value = "docs/config.toml")]
    config: String,
    /// Output directory (overrides config site.out).
    #[arg(long)]
    out: Option<String>,
    /// Emit every markdown under docs/ (default: sidebar + entry only).
    #[arg(long)]
    all: bool,
  },
}

#[tokio::main]
async fn main() {
  let args = Args::parse();
  anza_logs::init(args.verbose);

  if let Some(command) = args.command {
    match command {
      Command::Scan { src, watch, types } => {
        let src = PathBuf::from(src);
        let types = PathBuf::from(types);
        extract::run(&src, &types);

        if watch {
          let dist = types
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("dist"));
          let (tx, _rx) = broadcast::channel::<HmrMessage>(16);
          watcher::start(src, dist, Vec::new(), tx);
          tokio::signal::ctrl_c().await.unwrap();
        }
      }
      Command::Build { src, dist, entry } => {
        let entries = entry.into_iter().map(PathBuf::from).collect();
        let op = Build {
          src: PathBuf::from(src),
          dist: PathBuf::from(dist),
          entries,
          strict: true,
        };
        if let Err(e) = op.run() {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
      Command::Dev {
        src,
        port,
        dist,
        entry,
      } => {
        let entries = entry.into_iter().map(PathBuf::from).collect();
        let op = Dev {
          src: PathBuf::from(src),
          dist: PathBuf::from(dist),
          port,
          entries,
        };
        if let Err(e) = op.run().await {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
      Command::Doctor { src, strict } => {
        let op = Check {
          src: PathBuf::from(src),
          strict,
        };
        if let Err(e) = op.run() {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
      Command::Check { src } => {
        let op = Check {
          src: PathBuf::from(src),
          strict: true,
        };
        if let Err(e) = op.run() {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
      Command::Create { name } => {
        let target = std::env::current_dir()
          .unwrap_or_else(|_| PathBuf::from("."))
          .join(&name);
        let op = Create { target, name };
        if let Err(e) = op.run() {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
      Command::Generate {
        kind,
        name,
        src,
        tree,
        route,
        via,
        parent,
      } => {
        let op = Generate {
          src: PathBuf::from(src),
          kind,
          name,
          tree,
          route,
          via,
          parent,
        };
        match op.run() {
          Ok(g) => {
            anza_logs::success!(
              "Generated {} '{}' -> {}",
              g.kind.as_str(),
              g.name,
              g.dir.display()
            );
            anza_logs::info!("Barrel updated: {}", g.barrel.display());
          }
          Err(e) => {
            anza_logs::error!("{}", e);
            std::process::exit(1);
          }
        }
      }
      Command::Docs { config, out, all } => {
        let op = Docs {
          config: PathBuf::from(config),
          out: out.map(PathBuf::from),
          all,
        };
        if let Err(e) = op.run() {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
    }
    return;
  }

  let src = PathBuf::from(&args.src);
  let dist = PathBuf::from(&args.dist);

  if args.build {
    let op = Build {
      src,
      dist,
      entries: Vec::new(),
      strict: true,
    };
    if let Err(e) = op.run() {
      anza_logs::error!("{}", e);
      std::process::exit(1);
    }
    return;
  }

  let op = Dev {
    src,
    dist,
    port: args.port,
    entries: Vec::new(),
  };
  if let Err(e) = op.run().await {
    anza_logs::error!("{}", e);
    std::process::exit(1);
  }
}
