/**
 * tests/core/security/crypto.test.js
 *
 * Core SubtleCrypto facade execution test suite.
 *
 * Source: plan.md Phase 6-A, core/security/crypto.js
 */

import { uuid, hash, generateKey, deriveKey, encrypt, decrypt, sign, verify } from '@anzaui/anza/security';

describe('Web Cryptography Facade', () => {
  it('should generate valid crypto random UUID strings', () => {
    const id1 = uuid();
    const id2 = uuid();

    if (typeof id1 !== 'string' || id1.length !== 36) {
      throw new Error(`Invalid UUID: ${id1}`);
    }
    if (id1 === id2) {
      throw new Error('UUID generated identical values');
    }
  });

  it('should compute valid ArrayBuffer hash digests', async () => {
    const rawHash = await hash('Hello World', 'SHA-256');
    if (!(rawHash instanceof ArrayBuffer)) {
      throw new Error('Expected ArrayBuffer hash output');
    }
    if (rawHash.byteLength !== 32) {
      throw new Error(`Expected 32 bytes for SHA-256 digest, got ${rawHash.byteLength}`);
    }
  });

  it('should support symmetric AES-GCM encrypt and decrypt cycles', async () => {
    // Generate AES key directly
    const key = await generateKey('AES-GCM');
    const msg = 'Secret core text';

    const cipher = await encrypt(key, msg);
    if (!(cipher instanceof ArrayBuffer)) {
      throw new Error('Expected ArrayBuffer combined cipher transit output');
    }

    const decryptedBuf = await decrypt(key, cipher);
    const decodedMsg = new TextDecoder().decode(decryptedBuf);

    if (decodedMsg !== msg) {
      throw new Error(`Expected "${msg}", got decrypted: "${decodedMsg}"`);
    }
  });

  it('should derive secure non-extractable keys from passwords via PBKDF2', async () => {
    const salt = 'random-salt-bytes';
    // Use lower iterations for fast unit test execution
    const derived = await deriveKey('SuperSecurePassword123', salt, 1000);

    if (!derived || derived.type !== 'secret') {
      throw new Error('Failed to derive AES-GCM secret key from password');
    }
    if (derived.extractable) {
      throw new Error('Derived key should be marked non-extractable by default');
    }

    // Encrypt/Decrypt with derived key to check validity
    const original = 'Password protected data';
    const cipher = await encrypt(derived, original);
    const decrypted = await decrypt(derived, cipher);
    const decoded = new TextDecoder().decode(decrypted);

    if (decoded !== original) {
      throw new Error(`Derive check fail: expected "${original}", got "${decoded}"`);
    }
  });

  it('should sign and verify data using HMAC', async () => {
    const key = await generateKey('HMAC', ['sign', 'verify']);
    const data = 'integrity-check-payload';

    const sig = await sign(key, data);
    if (!(sig instanceof ArrayBuffer)) {
      throw new Error('Expected ArrayBuffer signature output from HMAC sign');
    }

    const valid = await verify(key, sig, data);
    if (!valid) {
      throw new Error('HMAC verify returned false for a valid signature');
    }

    // Tamper check: verification must fail for modified data
    const invalid = await verify(key, sig, data + '-tampered');
    if (invalid) {
      throw new Error('HMAC verify returned true for tampered data');
    }
  });

  it('should sign and verify data using ECDSA', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify']
    );
    const data = 'ecdsa-payload';

    const sig = await sign(keyPair.privateKey, data);
    if (!(sig instanceof ArrayBuffer)) {
      throw new Error('Expected ArrayBuffer signature from ECDSA sign');
    }

    const valid = await verify(keyPair.publicKey, sig, data);
    if (!valid) {
      throw new Error('ECDSA verify returned false for a valid signature');
    }

    const invalid = await verify(keyPair.publicKey, sig, data + '-tampered');
    if (invalid) {
      throw new Error('ECDSA verify returned true for tampered data');
    }
  });
});
