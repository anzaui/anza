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
}

impl fmt::Display for Error {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Self::Validation(msg) => write!(f, "Validation error: {}", msg),
      Self::NotFound(msg) => write!(f, "Not found: {}", msg),
      Self::Template(msg) => write!(f, "Template error: {}", msg),
      Self::Crypto(msg) => write!(f, "Cryptographic error: {}", msg),
      Self::Internal(msg) => write!(f, "Internal error: {}", msg),
    }
  }
}

impl std::error::Error for Error {}

pub type Result<T> = std::result::Result<T, Error>;
