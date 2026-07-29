//! Human-readable error reporting and process exit helpers.

use owo_colors::OwoColorize;
use std::fmt::Display;
use std::io::IsTerminal;
use std::process;

fn use_color() -> bool {
  std::io::stderr().is_terminal() && std::env::var("NO_COLOR").is_err()
}

/// Standard exit codes for the Anza CLI.
pub mod exit {
  pub const SUCCESS: i32 = 0;
  pub const GENERAL: i32 = 1;
  pub const USAGE: i32 = 2;
  pub const CONFIG: i32 = 3;
  pub const IO: i32 = 4;
  pub const BIND: i32 = 5;
  pub const PANIC: i32 = 101;
}

/// Print a formatted error line to stderr (color when supported).
pub fn print_error(message: impl Display) {
  let color = use_color();
  let prefix = if color {
    " ERROR ".bold().red().to_string()
  } else {
    " ERROR ".to_string()
  };
  eprintln!("  |{prefix}  {message}");
}

/// Print an error and terminate with the given exit code.
pub fn exit_with(code: i32, message: impl Display) -> ! {
  print_error(message);
  process::exit(code);
}

/// Print an error and terminate with [`exit::GENERAL`].
pub fn die(message: impl Display) -> ! {
  exit_with(exit::GENERAL, message);
}

#[cfg(test)]
mod tests {
  use super::exit;

  #[test]
  fn exit_codes_are_distinct() {
    assert_ne!(exit::SUCCESS, exit::GENERAL);
    assert_ne!(exit::BIND, exit::PANIC);
  }
}
