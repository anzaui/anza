import * as crypto from 'node:crypto';

export function hash(data: string | Uint8Array): Uint8Array {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return new Uint8Array(crypto.createHash('sha256').update(buf).digest());
}

export function hex(data: string | Uint8Array): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return crypto.createHash('sha256').update(buf).digest('hex');
}
