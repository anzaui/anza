import * as crypto from 'node:crypto';
import { AnzaError } from '../errors/index.js';
import { decodeLength } from './hex.js';

/** Ed25519 key material: a 32-byte raw key, 64-char lowercase hex, PEM, or a `KeyObject`. */
export type Ed25519Key = string | Uint8Array | crypto.KeyObject;

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const HEX_KEY = /^[0-9a-f]{64}$/;

function raw(input: string | Uint8Array): Buffer | null {
  if (typeof input === 'string') return HEX_KEY.test(input) ? Buffer.from(input, 'hex') : null;
  return input.length === 32 ? Buffer.from(input) : null;
}

/** Parse an Ed25519 private key. Throws `CRYPTO` for anything else. */
export function privateKey(input: Ed25519Key): crypto.KeyObject {
  let key: crypto.KeyObject;
  try {
    if (input instanceof crypto.KeyObject) {
      key = input;
    } else {
      const seed = raw(input);
      key = seed
        ? crypto.createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' })
        : crypto.createPrivateKey(typeof input === 'string' ? input : Buffer.from(input));
    }
  } catch {
    throw AnzaError.crypto('Ed25519 private key must be a 32-byte seed, 64-char hex, PEM, or a KeyObject');
  }
  if (key.type !== 'private' || key.asymmetricKeyType !== 'ed25519') {
    throw AnzaError.crypto('Ed25519 private key must be an Ed25519 private key');
  }
  return key;
}

/** Parse an Ed25519 public key. Throws `CRYPTO` for anything else. */
export function publicKey(input: Ed25519Key): crypto.KeyObject {
  let key: crypto.KeyObject;
  try {
    if (input instanceof crypto.KeyObject) {
      key = input.type === 'private' ? crypto.createPublicKey(input) : input;
    } else {
      const bytes = raw(input);
      key = bytes
        ? crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, bytes]), format: 'der', type: 'spki' })
        : crypto.createPublicKey(typeof input === 'string' ? input : Buffer.from(input));
    }
  } catch {
    throw AnzaError.crypto('Ed25519 public key must be 32 bytes, 64-char hex, PEM, or a KeyObject');
  }
  if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') {
    throw AnzaError.crypto('Ed25519 public key must be an Ed25519 public key');
  }
  return key;
}

/** The raw 32-byte form of an Ed25519 public (or private) key. */
export function rawPublicKey(key: crypto.KeyObject): Buffer {
  const pub = key.type === 'private' ? crypto.createPublicKey(key) : key;
  const spki = pub.export({ format: 'der', type: 'spki' });
  return Buffer.from(spki.subarray(spki.length - 32));
}

/** Sign `data`; returns a lowercase-hex signature. */
export function sign(key: Ed25519Key, data: string | Uint8Array): string {
  const k = privateKey(key);
  const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return crypto.sign(null, dataBuf, k).toString('hex');
}

/**
 * Verify a lowercase-hex Ed25519 signature. Malformed keys or signatures
 * (wrong length, non-hex, uppercase) return `false`.
 */
export function verify(key: Ed25519Key, data: string | Uint8Array, signatureHex: string): boolean {
  const sigBuf = decodeLength(signatureHex, 64);
  if (!sigBuf) return false;
  try {
    const k = publicKey(key);
    const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.verify(null, dataBuf, k, sigBuf);
  } catch {
    return false;
  }
}
