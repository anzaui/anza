/**
 * Strict lowercase hex, the only encoding used for signatures and digests on
 * the wire. `decode` rejects uppercase digits, odd lengths and any other
 * character, so a signature has exactly one accepted spelling
 * (`Buffer.from(s, 'hex')` silently stops at the first bad character).
 */

const STRICT = /^(?:[0-9a-f]{2})*$/;

/** Lowercase hex of `bytes`. */
export function encode(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('hex');
}

/** Decode lowercase, even-length hex. `null` for anything else. */
export function decode(text: string): Buffer | null {
  if (typeof text !== 'string' || !STRICT.test(text)) return null;
  return Buffer.from(text, 'hex');
}

/** Decode exactly `length` bytes of lowercase hex. `null` for anything else. */
export function decodeLength(text: string, length: number): Buffer | null {
  if (typeof text !== 'string' || text.length !== length * 2) return null;
  return decode(text);
}
