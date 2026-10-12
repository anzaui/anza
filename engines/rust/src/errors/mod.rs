use std::fmt;

#[derive(Debug, Clone)]
pub enum Error {
  Validation(String),
  NotFound(String),
  Template(String),
  Crypto(String),
  Internal(String),
}

impl Error {
  pub fn validation<S: Into<String>>(msg: S) -> Self {
    Self::Validation(msg.into())
  }

  pub fn not_found<S: Into<String>>(msg: S) -> Self {
    Self::NotFound(msg.into())
  }

  pub fn template<S: Into<String>>(msg: S) -> Self {
    Self::Template(msg.into())
  }

  pub fn crypto<S: Into<String>>(msg: S) -> Self {
    Self::Crypto(msg.into())
  }

  pub fn internal<S: Into<String>>(msg: S) -> Self {
    Self::Internal(msg.into())
  }

  /// The error code shared by all three engines: `VALIDATION`, `NOT_FOUND`,
  /// `TEMPLATE`, `CRYPTO` or `INTERNAL`.
  pub fn code(&self) -> &'static str {
    match self {
      Self::Validation(_) => "VALIDATION",
      Self::NotFound(_) => "NOT_FOUND",
      Self::Template(_) => "TEMPLATE",
      Self::Crypto(_) => "CRYPTO",
      Self::Internal(_) => "INTERNAL",
    }
  }

  /// The message without the code prefix.
  pub fn message(&self) -> &str {
    match self {
      Self::Validation(m) | Self::NotFound(m) | Self::Template(m) | Self::Crypto(m) | Self::Internal(m) => m,
    }
  }
}

impl fmt::Display for Error {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    // Same shape as the TS and Python engines: `[Anza:CODE] message`.
    write!(f, "[Anza:{}] {}", self.code(), self.message())
  }
}

impl std::error::Error for Error {}

pub type Result<T> = std::result::Result<T, Error>;
