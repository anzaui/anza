//! Branded panic hook — replaces default Rust panic dumps with a clean fatal message.

use owo_colors::OwoColorize;
use std::io::IsTerminal;
use std::panic::PanicHookInfo;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;

static VERBOSE: AtomicBool = AtomicBool::new(false);
static INSTALLED: OnceLock<()> = OnceLock::new();

fn use_color() -> bool {
  std::io::stdout().is_terminal() && std::env::var("NO_COLOR").is_err()
}

/// Record whether verbose / debug diagnostics are enabled for panic output.
pub fn set_verbose(verbose: bool) {
  VERBOSE.store(verbose, Ordering::Relaxed);
}

pub fn verbose() -> bool {
  VERBOSE.load(Ordering::Relaxed)
}

/// Install the Anza panic hook once. Safe to call multiple times.
pub fn install_panic_hook() {
  INSTALLED.get_or_init(|| {
    std::panic::set_hook(Box::new(panic_hook));
  });
}

fn panic_hook(info: &PanicHookInfo<'_>) {
  let color = use_color();
  let dim = |s: &str| {
    if color {
      s.dimmed().to_string()
    } else {
      s.to_string()
    }
  };
  let red_bold = |s: &str| {
    if color {
      s.bold().red().to_string()
    } else {
      s.to_string()
    }
  };
  let white = |s: &str| {
    if color {
      s.bold().white().to_string()
    } else {
      s.to_string()
    }
  };

  eprintln!();
  eprintln!(
    "  {}  {}",
    dim("|"),
    red_bold("FATAL")
  );

  let message = panic_message(info);

  eprintln!("  {}  {}", dim("|"), white(&message));

  if verbose() || cfg!(debug_assertions) {
    if let Some(loc) = info.location() {
      eprintln!(
        "  {}  {} {}:{}",
        dim("|"),
        dim("at"),
        loc.file(),
        loc.line()
      );
    }
  }

  if cfg!(debug_assertions) {
    eprintln!("  {}  {}", dim("|"), dim("backtrace:"));
    eprintln!("{}", std::backtrace::Backtrace::force_capture());
  }

  eprintln!(
    "  {}  {}",
    dim("|"),
    dim("anza exited unexpectedly — re-run with RUST_BACKTRACE=1 for details")
  );
  eprintln!();

  std::process::exit(101);
}

fn panic_message(info: &PanicHookInfo<'_>) -> String {
  if let Some(s) = info.payload().downcast_ref::<&str>() {
    return (*s).to_string();
  }
  if let Some(s) = info.payload().downcast_ref::<String>() {
    return s.clone();
  }
  "unexpected internal error".to_string()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn verbose_flag_roundtrip() {
    set_verbose(true);
    assert!(verbose());
    set_verbose(false);
    assert!(!verbose());
  }
}
