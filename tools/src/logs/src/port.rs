//! Port selection helpers for dev-server bind retry.

use std::io;

/// Maximum port bind attempts when the requested port is occupied.
pub const DEFAULT_MAX_PORT_ATTEMPTS: u16 = 10;

/// Returns true when an I/O error indicates the address is already in use.
pub fn is_addr_in_use(err: &io::Error) -> bool {
  err.kind() == io::ErrorKind::AddrInUse
}

/// Iterator over ports to try: `start`, `start + 1`, … capped by attempts and 65535.
pub fn port_attempts(start: u16, max_attempts: u16) -> impl Iterator<Item = u16> {
  (0..max_attempts).filter_map(move |offset| start.checked_add(offset))
}

/// Compute the nth retry port (0-based offset from start).
pub fn next_port(start: u16, offset: u16) -> Option<u16> {
  start.checked_add(offset)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn port_attempts_increments_until_cap() {
    let ports: Vec<_> = port_attempts(3000, 3).collect();
    assert_eq!(ports, vec![3000, 3001, 3002]);
  }

  #[test]
  fn port_attempts_stops_at_max_u16() {
    let ports: Vec<_> = port_attempts(65534, 5).collect();
    assert_eq!(ports, vec![65534, 65535]);
  }

  #[test]
  fn next_port_returns_none_when_overflow() {
    assert_eq!(next_port(65535, 1), None);
    assert_eq!(next_port(3000, 1), Some(3001));
  }

  #[test]
  fn is_addr_in_use_detects_kind() {
    let err = io::Error::new(io::ErrorKind::AddrInUse, "busy");
    assert!(is_addr_in_use(&err));
    let other = io::Error::new(io::ErrorKind::PermissionDenied, "nope");
    assert!(!is_addr_in_use(&other));
  }
}
