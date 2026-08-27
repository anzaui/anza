import * as crypto from 'node:crypto';
import { AnzaError } from '../errors/index.js';

export function sign(privateKey: string | Uint8Array | crypto.KeyObject, data: string | Uint8Array): string {
  try {
    const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    let key: crypto.KeyObject;
    
    if (typeof privateKey === 'string' || privateKey instanceof Uint8Array) {
      const keyBuf = Buffer.from(privateKey);
      if (keyBuf.length === 32) {
        // Raw 32-byte seed
        key = crypto.createPrivateKey({
          key: Buffer.concat([
            Buffer.from('302e020100300506032b657004220420', 'hex'),
            keyBuf,
          ]),
          format: 'der',
          type: 'pkcs8',
        });
      } else {
        key = crypto.createPrivateKey(keyBuf);
      }
    } else {
      key = privateKey;
    }

    const signature = crypto.sign(null, dataBuf, key);
    return signature.toString('hex');
  } catch (err: any) {
    throw AnzaError.crypto(`Ed25519 signing failed: ${err.message}`);
  }
}

export function verify(publicKey: string | Uint8Array | crypto.KeyObject, data: string | Uint8Array, signatureHex: string): boolean {
  try {
    const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    const sigBuf = Buffer.from(signatureHex, 'hex');
    let key: crypto.KeyObject;

    if (typeof publicKey === 'string' || publicKey instanceof Uint8Array) {
      const keyBuf = Buffer.from(publicKey);
      if (keyBuf.length === 32) {
        // Raw 32-byte public key
        key = crypto.createPublicKey({
          key: Buffer.concat([
            Buffer.from('302a300506032b6570032100', 'hex'),
            keyBuf,
          ]),
          format: 'der',
          type: 'spki',
        });
      } else {
        key = crypto.createPublicKey(keyBuf);
      }
    } else {
      key = publicKey;
    }

    return crypto.verify(null, dataBuf, key, sigBuf);
  } catch {
    return false;
  }
}
