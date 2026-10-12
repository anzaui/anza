/**
 * Envelope signatures, wire format v2 (see `docs/engines/contract.md`).
 *
 * ```text
 * message  = "anza-sig-v2\n" field(ts) field(slot) field(html) field(css)
 * field(x) = <decimal UTF-8 byte length of x> ":" x "\n"
 * ```
 *
 * `ts` is written in decimal; an absent `css` is the empty string.
 */
import { AnzaError } from '../errors/index.js';
import type { EnvelopeData } from '../models/envelope.js';
import { decode } from './hex.js';
import * as hmac from './hmac.js';
import * as ed25519 from './ed25519.js';
import { HMAC_MIN_SECRET } from './signer.js';

/** Envelope wire-format version produced and accepted by this engine. */
export const ENVELOPE_VERSION = 2;

/** Domain-separation prefix of every v2 signature message. */
export const SIGNATURE_DOMAIN = 'anza-sig-v2\n';

/** Default tolerance for a timestamp ahead of the verifier's clock. */
export const DEFAULT_SKEW_SECS = 5;

const field = (value: string): string => `${Buffer.byteLength(value, 'utf8')}:${value}\n`;

/**
 * The v2 message as a string; its UTF-8 encoding is the signed bytes. Hashing
 * this directly avoids building intermediate buffers.
 */
export function signatureText(ts: number, slot: string, html: string, css?: string | null): string {
  return SIGNATURE_DOMAIN + field(String(ts)) + field(slot) + field(html) + field(css ?? '');
}

/** The exact bytes a v2 signature covers. */
export function signatureMessage(ts: number, slot: string, html: string, css?: string | null): Buffer {
  return Buffer.from(signatureText(ts, slot, html, css), 'utf8');
}

/** The key that checks an envelope signature. */
export type VerifyKey =
  | { mode: 'hmac'; secret: string | Uint8Array }
  | { mode: 'ed25519'; publicKey: ed25519.Ed25519Key };

export interface VerifyOptions {
  /** Reject envelopes older than this many seconds. */
  maxAgeSecs: number;
  /** The slot the envelope must target (stops replay into another slot). */
  slot: string;
  /** Accept timestamps this many seconds in the future (clock skew). Default 5. */
  skewSecs?: number;
  /** The verifier's clock, in Unix seconds. Default: `Date.now()`. */
  now?: number;
}

/** Envelope as received: a parsed JSON object or an `Envelope`. */
export type ReceivedEnvelope = Partial<EnvelopeData> & { v?: unknown; ts?: unknown };

/** @internal Every check except the signature, then `checkSig`. Throws `CRYPTO`. */
export function verifyWith(
  envelope: ReceivedEnvelope,
  options: VerifyOptions,
  checkSig: (message: string, sig: string) => boolean
): void {
  if (!envelope || envelope.v !== ENVELOPE_VERSION) throw AnzaError.crypto('unsupported envelope version');
  const { ts, slot, html, css, sig } = envelope;
  if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts < 0 || typeof slot !== 'string' || typeof html !== 'string' || (css != null && typeof css !== 'string')) {
    throw AnzaError.crypto('malformed envelope');
  }
  if (sig === undefined || sig === null) throw AnzaError.crypto('envelope is not signed');
  if (typeof sig !== 'string' || decode(sig) === null) throw AnzaError.crypto('malformed signature');
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const skew = options.skewSecs ?? DEFAULT_SKEW_SECS;
  if (ts > now + skew) throw AnzaError.crypto('envelope timestamp is in the future');
  if (now - ts > options.maxAgeSecs) throw AnzaError.crypto('envelope expired');
  if (slot !== options.slot) throw AnzaError.crypto('slot mismatch');
  if (!checkSig(signatureText(ts, slot, html, css), sig)) throw AnzaError.crypto('bad signature');
}

/**
 * Verify a received envelope: version, signature format, freshness
 * (`maxAgeSecs`, plus `skewSecs` into the future), the expected slot, then
 * the signature (constant-time). Throws an `AnzaError` with code `CRYPTO`
 * whose message names the failed check; returns normally when valid.
 */
export function verifyEnvelope(key: VerifyKey, envelope: ReceivedEnvelope, options: VerifyOptions): void {
  if (key.mode === 'hmac') {
    const secret = typeof key.secret === 'string' ? Buffer.from(key.secret, 'utf8') : key.secret;
    if (!secret || secret.length < HMAC_MIN_SECRET) throw AnzaError.crypto('invalid verification key');
    return verifyWith(envelope, options, (msg, sig) => hmac.verify(secret, msg, sig));
  }
  if (key.mode === 'ed25519') {
    let pub;
    try {
      pub = ed25519.publicKey(key.publicKey);
    } catch {
      throw AnzaError.crypto('invalid verification key');
    }
    return verifyWith(envelope, options, (msg, sig) => ed25519.verify(pub, msg, sig));
  }
  throw AnzaError.crypto('invalid verification key');
}
