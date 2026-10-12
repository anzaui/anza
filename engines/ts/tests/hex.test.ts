// Signatures use strict lowercase hex: malformed input is rejected and there
// is exactly one accepted spelling (G3, G8).
import test from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import { hmac, ed25519, hex } from '../src/crypto/index.js';

const SECRET = '0123456789abcdef0123456789abcdef';
const SEED = Buffer.alloc(32, 7);

test('hex - strict decode', () => {
  assert.strictEqual(hex.encode(Uint8Array.from([0, 0xab, 0xff])), '00abff');
  assert.deepStrictEqual(hex.decode('00abff'), Buffer.from([0, 0xab, 0xff]));
  for (const bad of ['ABFF', 'abf', 'zz', '€a', 'a€', '+1', ' 0', '0 ']) {
    assert.strictEqual(hex.decode(bad), null, bad);
  }
  assert.strictEqual(hex.decodeLength('abff', 2)?.length, 2);
  assert.strictEqual(hex.decodeLength('abffab', 2), null);
});

test('hex - non-ASCII signatures are rejected', () => {
  for (const sig of ['€a', '€'.repeat(32), 'ü'.repeat(64)]) {
    assert.strictEqual(hmac.verify(SECRET, 'm', sig), false);
    assert.strictEqual(ed25519.verify(SEED, 'm', sig), false);
  }
});

test('hex - trailing garbage is rejected (sig + "zz")', () => {
  const sig = hmac.sign(SECRET, 'm');
  assert.strictEqual(hmac.verify(SECRET, 'm', sig), true);
  assert.strictEqual(hmac.verify(SECRET, 'm', sig + 'zz'), false);
  assert.strictEqual(hmac.verify(SECRET, 'm', sig + '00'), false);
  assert.strictEqual(hmac.verify(SECRET, 'm', sig.slice(0, 62)), false);

  const edSig = ed25519.sign(SEED, 'm');
  const pub = publicOf(SEED);
  assert.strictEqual(ed25519.verify(pub, 'm', edSig), true);
  assert.strictEqual(ed25519.verify(pub, 'm', edSig + 'zz'), false);
  assert.strictEqual(ed25519.verify(pub, 'm', edSig + '00'), false);
});

test('hex - uppercase is rejected', () => {
  const sig = hmac.sign(SECRET, 'm');
  assert.strictEqual(sig, sig.toLowerCase());
  assert.strictEqual(hmac.verify(SECRET, 'm', sig.toUpperCase()), false);
  const edSig = ed25519.sign(SEED, 'm');
  assert.strictEqual(ed25519.verify(publicOf(SEED), 'm', edSig.toUpperCase()), false);
});

function publicOf(seed: Buffer): Buffer {
  const key = crypto.createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const spki = crypto.createPublicKey(key).export({ format: 'der', type: 'spki' });
  return spki.subarray(spki.length - 32);
}
