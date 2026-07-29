//! Unified logging facade for the Anza CLI binary.

pub mod error;
pub mod fmt;
pub mod panic;
pub mod port;

use std::io::IsTerminal;

#[doc(hidden)]
pub use tracing;

pub use error::{die, exit_with, print_error};
pub use port::{is_addr_in_use, next_port, port_attempts, DEFAULT_MAX_PORT_ATTEMPTS};

/// Initialize colorized logging and install the branded panic hook.
///
/// Call exactly once at process startup. When `verbose` is true, default filter
/// is `debug`; otherwise `info`. `RUST_LOG` still overrides when set.
pub fn init(verbose: bool) {
  panic::set_verbose(verbose);
  panic::install_panic_hook();
  init_subscriber(verbose);
}

fn init_subscriber(verbose: bool) {
  use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

  let default_level = if verbose { "debug" } else { "info" };
  let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
    .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(default_level));

  let fmt_layer = tracing_subscriber::fmt::layer()
    .event_format(fmt::CustomFormatter::default())
    .with_writer(std::io::stdout)
    .with_ansi(std::io::stdout().is_terminal() && std::env::var("NO_COLOR").is_err());

  tracing_subscriber::registry()
    .with(env_filter)
    .with(fmt_layer)
    .init();
}

#[macro_export]
macro_rules! info {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "info", $($arg)+) };
}

#[macro_export]
macro_rules! debug {
  ($($arg:tt)+) => { $crate::tracing::debug!(target: "debug", $($arg)+) };
}

#[macro_export]
macro_rules! trace {
  ($($arg:tt)+) => { $crate::tracing::trace!(target: "trace", $($arg)+) };
}

#[macro_export]
macro_rules! error {
  ($($arg:tt)+) => { $crate::tracing::error!(target: "error", $($arg)+) };
}

#[macro_export]
macro_rules! warn {
  ($($arg:tt)+) => { $crate::tracing::warn!(target: "warn", $($arg)+) };
}

#[macro_export]
macro_rules! success {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "success", $($arg)+) };
}

/// Log a fatal error and exit with code 1.
#[macro_export]
macro_rules! fatal {
  ($($arg:tt)+) => {{
    $crate::tracing::error!(target: "fatal", $($arg)+);
    $crate::error::die(format!($($arg)+));
  }};
}

// Dev pipeline context categories
#[macro_export]
macro_rules! watcher {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "watcher", $($arg)+) };
}

#[macro_export]
macro_rules! compiler {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "compiler", $($arg)+) };
}

#[macro_export]
macro_rules! server {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "server", $($arg)+) };
}

#[macro_export]
macro_rules! hmr {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "hmr", $($arg)+) };
}

#[macro_export]
macro_rules! sync {
  ($($arg:tt)+) => { $crate::tracing::info!(target: "sync", $($arg)+) };
}
