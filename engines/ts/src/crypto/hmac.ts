import * as crypto from 'node:crypto';
import { decodeLength } from './hex.js';

export function sign(secret: string | Uint8Array, data: string | Uint8Array): string {
  const secretBuf = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
  const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return crypto.createHmac('sha256', secretBuf).update(dataBuf).digest('hex');
}

/**
 * Verify a lowercase-hex HMAC-SHA256 signature in constant time. Malformed
 * signatures (wrong length, non-hex, uppercase) return `false`.
 */
export function verify(secret: string | Uint8Array, data: string | Uint8Array, signatureHex: string): boolean {
  const actual = decodeLength(signatureHex, 32);
  if (!actual) return false;
  try {
    const secretBuf = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
    const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    const expected = crypto.createHmac('sha256', secretBuf).update(dataBuf).digest();
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
