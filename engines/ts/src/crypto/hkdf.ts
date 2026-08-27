import * as crypto from 'node:crypto';
import { AnzaError } from '../errors/index.js';

export function deriveKey(
  ikm: string | Uint8Array,
  salt?: string | Uint8Array,
  info: string | Uint8Array = 'anza-stui-session-v1',
  keylen = 32
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ikmBuf = typeof ikm === 'string' ? Buffer.from(ikm, 'utf8') : Buffer.from(ikm);
    const saltBuf = salt ? (typeof salt === 'string' ? Buffer.from(salt, 'utf8') : Buffer.from(salt)) : Buffer.alloc(0);
    const infoBuf = typeof info === 'string' ? Buffer.from(info, 'utf8') : Buffer.from(info);

    crypto.hkdf('sha256', ikmBuf, saltBuf, infoBuf, keylen, (err, derivedKey) => {
      if (err) {
        reject(AnzaError.crypto(`HKDF key derivation failed: ${err.message}`));
      } else {
        resolve(Buffer.from(derivedKey));
      }
    });
  });
}
