import test from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import { hmac, ed25519, digest, hkdf } from '../src/crypto/index.js';

test('crypto/digest - SHA-256 hash and hex formatting', () => {
  const message = 'anza-stui-payload';
  const hexHash = digest.hex(message);

  assert.strictEqual(hexHash.length, 64);
  assert.strictEqual(typeof hexHash, 'string');
});

test('crypto/hmac - signing and constant-time tamper rejection', () => {
  const secret = 'super-secret-key-32-bytes-long!!';
  const payload = '1724770000:feed:<ui-card>Live</ui-card>';

  // 1. Sign
  const sig = hmac.sign(secret, payload);
  assert.strictEqual(sig.length, 64);

  // 2. Verify valid payload
  const valid = hmac.verify(secret, payload, sig);
  assert.strictEqual(valid, true, 'Valid payload signature must succeed');

  // 3. Reject tampered payload
  const tamperedPayload = '1724770000:feed:<ui-card>Tampered</ui-card>';
  const invalid = hmac.verify(secret, tamperedPayload, sig);
  assert.strictEqual(invalid, false, 'Tampered payload must fail signature verification');

  // 4. Reject tampered signature
  const corruptedSig = '00' + sig.slice(2);
  const invalidSig = hmac.verify(secret, payload, corruptedSig);
  assert.strictEqual(invalidSig, false, 'Corrupted signature must fail verification');
});

test('crypto/ed25519 - asymmetric keypair signing and verification', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const payload = '1724770000:feed:<article>Signed with Ed25519</article>';

  // 1. Sign with private key
  const sig = ed25519.sign(privateKey, payload);
  assert.strictEqual(sig.length, 128); // 64 bytes in hex

  // 2. Verify with public key
  const valid = ed25519.verify(publicKey, payload, sig);
  assert.strictEqual(valid, true, 'Ed25519 public key verification must succeed');

  // 3. Reject tampered payload
  const invalid = ed25519.verify(publicKey, 'tampered-payload', sig);
  assert.strictEqual(invalid, false, 'Ed25519 must reject tampered payload');
});

test('crypto/hkdf - per-user session key derivation', async () => {
  const ikm = 'user-session-token-abc-123';
  const salt = 'anza-salt-456';

  const key1 = await hkdf.deriveKey(ikm, salt, 'user-stream');
  const key2 = await hkdf.deriveKey(ikm, salt, 'user-stream');
  const key3 = await hkdf.deriveKey('different-user', salt, 'user-stream');

  assert.strictEqual(key1.length, 32);
  assert.deepStrictEqual(key1, key2, 'Deterministic derivation for identical IKM');
  assert.notDeepStrictEqual(key1, key3, 'Different users must yield distinct keys');
});
