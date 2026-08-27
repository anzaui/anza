import * as crypto from 'node:crypto';

export function sign(secret: string | Uint8Array, data: string | Uint8Array): string {
  const secretBuf = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
  const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return crypto.createHmac('sha256', secretBuf).update(dataBuf).digest('hex');
}

export function verify(secret: string | Uint8Array, data: string | Uint8Array, signatureHex: string): boolean {
  try {
    const expected = sign(secret, data);
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signatureHex, 'hex');
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
