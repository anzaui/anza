use std::path::PathBuf;

use clap::{Parser, Subcommand};
use tokio::sync::broadcast;

use anza_cli::{
  data::{Build, Check, Create, Dev, Docs, Generate},
  extract,
  types::HmrMessage,
  watcher,
};

#[derive(Parser, Debug)]
#[command(
  name = "anza",
  version,
  about = "Anza web platform library — reactive state, networking, offline, animations, custom elements. Instant build step. Pure browser ESM."
)]
struct Args {
  #[command(subcommand)]
  command: Option<Command>,

  #[arg(short, long, default_value = "src")]
  src: String,

  #[arg(short, long, default_value = "3000")]
  port: u16,

  /// Dev server bind address (default loopback only).
  #[arg(long, default_value = "127.0.0.1")]
  host: String,

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

    /// Type declarations output directory.
    #[arg(long, default_value = "types")]
    types: String,

    #[arg(long, default_value = "dist")]
    dist: String,
  },
  Build {
    #[arg(short, long, default_value = "src")]
    src: String,

    #[arg(long, default_value = "dist")]
    dist: String,

    /// Type declarations output directory (default: `types/` beside dist).
    #[arg(long)]
    types: Option<String>,

    /// Keep the unbundled module output (no Rolldown chunks).
    #[arg(long)]
    no_bundle: bool,

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

    /// Bind address. Default `127.0.0.1` (this machine only); use
    /// `0.0.0.0` to serve the LAN.
    #[arg(long, default_value = "127.0.0.1")]
    host: String,

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
  /// Generate docs from markdown + docs/config.toml: a standalone site, or
  /// with --pages the app's page folders (web/src/docs).
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
    /// Generate Anza page folders for an app (config `[pages]`, default
    /// ../web/src/docs) instead of a standalone site.
    #[arg(long)]
    pages: bool,
  },
}

#[tokio::main]
async fn main() {
  let args = Args::parse();
  anza_logs::init(args.verbose);

  if let Some(command) = args.command {
    match command {
      Command::Scan { src, watch, types, dist } => {
        let src = PathBuf::from(src);
        let types = PathBuf::from(types);
        let dist = PathBuf::from(dist);
        if let Err(errors) = extract::run(&src, &dist, &types) {
          extract::report_errors(&errors);
          if !watch {
            anza_logs::error!("Scan failed: {} error(s)", errors.len());
            std::process::exit(1);
          }
        }

        if watch {
          let (tx, _rx) = broadcast::channel::<HmrMessage>(16);
          watcher::start(src, dist, Vec::new(), tx, tokio::sync::watch::channel(0u64).0);
          tokio::signal::ctrl_c().await.unwrap();
        }
      }
      Command::Build { src, dist, types, no_bundle, entry } => {
        let entries = entry.into_iter().map(PathBuf::from).collect();
        let op = Build {
          src: PathBuf::from(src),
          dist: PathBuf::from(dist),
          entries,
          strict: true,
          types: types.map(PathBuf::from),
          no_bundle,
        };
        if let Err(e) = op.run() {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
      }
      Command::Dev {
        src,
        port,
        host,
        dist,
        entry,
      } => {
        let entries = entry.into_iter().map(PathBuf::from).collect();
        let op = Dev {
          src: PathBuf::from(src),
          dist: PathBuf::from(dist),
          port,
          host,
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
        let op = Create { name };
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
      Command::Docs { config, out, all, pages } => {
        let op = Docs {
          config: PathBuf::from(config),
          out: out.map(PathBuf::from),
          all,
          pages,
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
      types: None,
      no_bundle: false,
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
    host: args.host,
    entries: Vec::new(),
  };
  if let Err(e) = op.run().await {
    anza_logs::error!("{}", e);
    std::process::exit(1);
  }
}
