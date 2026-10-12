import * as crypto from 'node:crypto';
import { AnzaError } from '../errors/index.js';
import { privateKey, publicKey, rawPublicKey, type Ed25519Key } from './ed25519.js';
import { decodeLength } from './hex.js';

/** Minimum HMAC-SHA256 secret length, in bytes. */
export const HMAC_MIN_SECRET = 32;

export interface SignOptions {
  mode: 'ed25519' | 'hmac' | 'none';
  /** HMAC secret, at least 32 bytes (a string counts its UTF-8 bytes). */
  secret?: string | Uint8Array;
  /** Ed25519 private key: 32-byte seed, 64-char hex seed, PEM, or `KeyObject`. */
  privateKey?: Ed25519Key;
  /** Optional Ed25519 public key; must match `privateKey` when given. */
  publicKey?: Ed25519Key;
}

const INSPECT = Symbol.for('nodejs.util.inspect.custom');

/**
 * A validated signing key, built once at setup. A running engine never signs
 * with a missing, short or mismatched key, and `inspect`/`JSON.stringify`
 * never print key material.
 */
export class Signer {
  readonly mode: SignOptions['mode'];
  #hmac?: Buffer;
  #ed25519?: crypto.KeyObject;
  #public?: Buffer;

  private constructor(mode: SignOptions['mode']) {
    this.mode = mode;
  }

  /** Validate `options` and decode its keys. Throws `CRYPTO` on bad keys. */
  static from(options: SignOptions = { mode: 'none' }): Signer {
    const signer = new Signer(options.mode);
    switch (options.mode) {
      case 'none':
        return signer;
      case 'hmac': {
        const secret = options.secret;
        const bytes = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : secret ? Buffer.from(secret) : Buffer.alloc(0);
        if (bytes.length < HMAC_MIN_SECRET) {
          throw AnzaError.crypto(`HMAC secret must be at least ${HMAC_MIN_SECRET} bytes`);
        }
        signer.#hmac = bytes;
        return signer;
      }
      case 'ed25519': {
        if (!options.privateKey) throw AnzaError.crypto('Ed25519 signing needs a private key');
        const key = privateKey(options.privateKey);
        const pub = rawPublicKey(key);
        if (options.publicKey !== undefined) {
          const given = rawPublicKey(publicKey(options.publicKey));
          if (!crypto.timingSafeEqual(given, pub)) {
            throw AnzaError.crypto('Ed25519 public key does not match the private key');
          }
        }
        signer.#ed25519 = key;
        signer.#public = pub;
        return signer;
      }
      default:
        throw AnzaError.crypto(`Unknown signing mode '${String((options as SignOptions).mode)}'`);
    }
  }

  /** Lowercase-hex signature of `message`, or `undefined` when signing is off. */
  sign(message: string | Uint8Array): string | undefined {
    if (this.#hmac) return crypto.createHmac('sha256', this.#hmac).update(message).digest('hex');
    if (this.#ed25519) return crypto.sign(null, typeof message === 'string' ? Buffer.from(message, 'utf8') : message, this.#ed25519).toString('hex');
    return undefined;
  }

  /** Check a lowercase-hex signature made by this signer (constant-time). Always `false` when signing is off. */
  verify(message: string | Uint8Array, signatureHex: string): boolean {
    if (this.#hmac) {
      const actual = decodeLength(signatureHex, 32);
      if (!actual) return false;
      return crypto.timingSafeEqual(crypto.createHmac('sha256', this.#hmac).update(message).digest(), actual);
    }
    if (this.#ed25519) {
      const actual = decodeLength(signatureHex, 64);
      if (!actual) return false;
      const data = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
      return crypto.verify(null, data, crypto.createPublicKey(this.#ed25519), actual);
    }
    return false;
  }

  /** The raw 32-byte Ed25519 public key that verifies this signer's signatures. */
  get publicKey(): Buffer | undefined {
    return this.#public ? Buffer.from(this.#public) : undefined;
  }

  toJSON(): { mode: string } {
    return { mode: this.mode };
  }

  [INSPECT](): string {
    return this.mode === 'none' ? 'Signer { mode: none }' : `Signer { mode: ${this.mode}, key: <redacted> }`;
  }
}

/** A copy of `options` safe to log: key material replaced by `<redacted>`. */
export function redact(options: SignOptions): Record<string, string> {
  const out: Record<string, string> = { mode: options.mode };
  if (options.secret !== undefined) out.secret = '<redacted>';
  if (options.privateKey !== undefined) out.privateKey = '<redacted>';
  if (options.publicKey !== undefined) out.publicKey = '<set>';
  return out;
}
