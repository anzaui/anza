// tools/src/main.rs

use clap::{Parser, Subcommand};
use std::path::PathBuf;
use tokio::sync::broadcast;

mod build;
mod create;
mod docs;
mod extract;
mod generate;
mod server;
mod structure;
mod types;
mod watcher;

use types::HmrMessage;

#[derive(Parser, Debug)]
#[command(
  name = "anza",
  version = "0.3.9",
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
        let entries: Vec<PathBuf> = entry.into_iter().map(PathBuf::from).collect();
        extract::build(&PathBuf::from(src), &PathBuf::from(dist), &entries);
      }
      Command::Dev {
        src,
        port,
        dist,
        entry,
      } => {
        let entries: Vec<PathBuf> = entry.into_iter().map(PathBuf::from).collect();
        run_dev(PathBuf::from(src), PathBuf::from(dist), port, entries).await;
      }
      Command::Doctor { src, strict } => {
        run_structure(PathBuf::from(src), if strict {
          structure::Mode::Check
        } else {
          structure::Mode::Doctor
        });
      }
      Command::Check { src } => {
        run_structure(PathBuf::from(src), structure::Mode::Check);
      }
      Command::Create { name } => {
        let target = std::env::current_dir()
          .unwrap_or_else(|_| PathBuf::from("."))
          .join(&name);
        create::run(&target, &name);
        return;
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
        let kind = match generate::Kind::parse(&kind) {
          Ok(k) => k,
          Err(e) => {
            anza_logs::error!("{}", e);
            std::process::exit(1);
          }
        };
        let via = via.map(|v| {
          v.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
        });
        let opts = generate::Options {
          name,
          tree,
          route,
          via,
          parent,
        };
        match generate::run(&PathBuf::from(src), kind, &opts) {
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
        return;
      }
      Command::Docs { config, out, all } => {
        let opts = docs::DocsOptions {
          config: PathBuf::from(config),
          out: out.map(PathBuf::from),
          sidebar_only: !all,
        };
        if let Err(e) = docs::run(&opts) {
          anza_logs::error!("{}", e);
          std::process::exit(1);
        }
        return;
      }
    }
    return;
  }

  let src = PathBuf::from(&args.src);
  let dist = PathBuf::from(&args.dist);

  if args.build {
    extract::build(&src, &dist, &[]);
    return;
  }

  run_dev(src, dist, args.port, Vec::new()).await;
}

async fn run_dev(src: PathBuf, dist: PathBuf, port: u16, entries: Vec<PathBuf>) {
  anza_logs::info!("Bootstrapping native dev pipeline...");

  // 1. Initial full compile: extraction + import-graph resolution into dist.
  //    Non-fatal so the dev server starts even with errors to iterate on.
  extract::compile(&src, &dist, false, &entries);

  // 2. Setup communication channels for HMR events
  let (tx, _rx) = broadcast::channel::<HmrMessage>(16);

  // 3. Spawn Axum static + SSE Server serving the generated dist
  let server_dist = dist.clone();
  let server_tx = tx.clone();
  tokio::spawn(async move {
    server::run(port, &server_dist, server_tx).await;
  });

  // 4. Start concurrent watcher thread (rebuilds dist on change)
  watcher::start(src, dist, entries, tx);

  // 5. Run until terminate signal
  tokio::signal::ctrl_c().await.unwrap();
  anza_logs::info!("Shutting down native pipeline safely.");
}

fn run_structure(src: PathBuf, mode: structure::Mode) {
  let label = match mode {
    structure::Mode::Doctor => "doctor",
    structure::Mode::Check => "check",
  };
  anza_logs::info!("Running anza {}…", label);

  let (project, hint) = structure::project_from_src(&src);
  anza_logs::info!("Project: {}", project.display());
  anza_logs::info!("Source hint: {}", hint);

  let report = structure::check(&project, &hint, mode);
  report.print();

  let errors = report.error_count();
  let warns = report.warn_count();
  if report.failed(mode) {
    anza_logs::error!(
      "{} failed: {} error(s), {} warning(s) — see {} (Troubleshooting + required tables)",
      label,
      errors,
      warns,
      structure::DOC
    );
    std::process::exit(1);
  }
  anza_logs::success!(
    "{} passed ({} error(s), {} warning(s))",
    label,
    errors,
    warns
  );
}
