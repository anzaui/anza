//! Envelope signatures, wire format v2 (see `docs/engines/contract.md`).
//!
//! ```text
//! message  = "anza-sig-v2\n" field(ts) field(slot) field(html) field(css)
//! field(x) = <decimal UTF-8 byte length of x> ":" x "\n"
//! ```
//!
//! `ts` is written in decimal; an absent `css` is the empty string. Every
//! field is length-prefixed, so no two envelopes share a message.

use {
  crate::{
    crypto::{ed25519, hex, hmac, signer::HMAC_MIN_SECRET},
    errors::{Error, Result},
    models::envelope::Envelope,
  },
  std::time::{SystemTime, UNIX_EPOCH},
};

/// Envelope wire-format version produced and accepted by this engine.
pub const VERSION: u32 = 2;

/// Domain-separation prefix of every v2 signature message.
pub const DOMAIN: &str = "anza-sig-v2\n";

/// Default tolerance for a timestamp ahead of the verifier's clock.
pub const DEFAULT_SKEW_SECS: u64 = 5;

fn field(out: &mut Vec<u8>, value: &[u8]) {
  out.extend_from_slice(value.len().to_string().as_bytes());
  out.push(b':');
  out.extend_from_slice(value);
  out.push(b'\n');
}

/// The exact bytes a v2 signature covers.
pub fn message(ts: u64, slot: &str, html: &str, css: Option<&str>) -> Vec<u8> {
  let css = css.unwrap_or("");
  let mut out = Vec::with_capacity(DOMAIN.len() + slot.len() + html.len() + css.len() + 48);
  out.extend_from_slice(DOMAIN.as_bytes());
  field(&mut out, ts.to_string().as_bytes());
  field(&mut out, slot.as_bytes());
  field(&mut out, html.as_bytes());
  field(&mut out, css.as_bytes());
  out
}

/// The key that checks an envelope signature.
#[derive(Clone, Copy)]
pub enum VerifyKey<'a> {
  /// The shared HMAC-SHA256 secret (at least 32 bytes).
  Hmac(&'a [u8]),
  /// The 32-byte Ed25519 public key.
  Ed25519(&'a [u8]),
}

impl std::fmt::Debug for VerifyKey<'_> {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::Hmac(_) => f.write_str("VerifyKey::Hmac(<redacted>)"),
      Self::Ed25519(key) => write!(f, "VerifyKey::Ed25519({})", hex::encode(key)),
    }
  }
}

/// What a verifier expects of an envelope.
#[derive(Debug, Clone)]
pub struct VerifyOptions<'a> {
  /// Reject envelopes older than this many seconds.
  pub max_age_secs: u64,
  /// The slot the envelope must target (stops replay into another slot).
  pub slot: &'a str,
  /// Accept timestamps this many seconds in the future (clock skew).
  pub skew_secs: u64,
  /// The verifier's clock, in Unix seconds. `None` uses the system clock.
  pub now: Option<u64>,
}

impl<'a> VerifyOptions<'a> {
  pub fn new(slot: &'a str, max_age_secs: u64) -> Self {
    Self {
      max_age_secs,
      slot,
      skew_secs: DEFAULT_SKEW_SECS,
      now: None,
    }
  }
}

pub(crate) fn now() -> Result<u64> {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_secs())
    .map_err(|_| Error::internal("Clock error"))
}

/// Run every check except the signature itself, then `check_sig`.
pub(crate) fn verify_with(
  envelope: &Envelope,
  options: &VerifyOptions<'_>,
  check_sig: impl FnOnce(&[u8], &str) -> bool,
) -> Result<()> {
  if envelope.v != VERSION {
    return Err(Error::crypto("unsupported envelope version"));
  }
  let Some(sig) = envelope.sig.as_deref() else {
    return Err(Error::crypto("envelope is not signed"));
  };
  if hex::decode(sig).is_none() {
    return Err(Error::crypto("malformed signature"));
  }
  let now = match options.now {
    Some(now) => now,
    None => now()?,
  };
  if envelope.ts > now.saturating_add(options.skew_secs) {
    return Err(Error::crypto("envelope timestamp is in the future"));
  }
  if now.saturating_sub(envelope.ts) > options.max_age_secs {
    return Err(Error::crypto("envelope expired"));
  }
  if envelope.slot != options.slot {
    return Err(Error::crypto("slot mismatch"));
  }
  if !check_sig(&envelope.message(), sig) {
    return Err(Error::crypto("bad signature"));
  }
  Ok(())
}

/// Verify a received envelope: version, signature format, freshness
/// (`max_age_secs`, plus `skew_secs` into the future), the expected slot,
/// then the signature (constant-time). Every failure is an
/// [`Error::Crypto`] whose message names the failed check.
pub fn verify(key: VerifyKey<'_>, envelope: &Envelope, options: &VerifyOptions<'_>) -> Result<()> {
  match key {
    VerifyKey::Hmac(secret) if secret.len() < HMAC_MIN_SECRET => Err(Error::crypto("invalid verification key")),
    VerifyKey::Ed25519(public) if public.len() != 32 => Err(Error::crypto("invalid verification key")),
    VerifyKey::Hmac(secret) => verify_with(envelope, options, |msg, sig| hmac::verify::check(secret, msg, sig)),
    VerifyKey::Ed25519(public) => verify_with(envelope, options, |msg, sig| ed25519::verify::check(public, msg, sig)),
  }
}
