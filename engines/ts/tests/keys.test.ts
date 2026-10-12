// Signing keys are validated at setup and never printed (G2, G7).
import test from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { inspect } from 'node:util';
import { Setup, AnzaError, type SignOptions } from '../src/index.js';
import { rawPublicKey, privateKey } from '../src/crypto/ed25519.js';

const SEED = Buffer.alloc(32, 7);

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'anza-ts-keys-'));
  await fs.writeFile(path.join(root, 'card.html'), '<p>{{x}}</p>');
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function rejects(root: string, signing: SignOptions) {
  await assert.rejects(new Setup({ root, signing }).run(), (err: unknown) => {
    assert.ok(err instanceof AnzaError);
    assert.strictEqual(err.code, 'CRYPTO');
    return true;
  });
}

test('keys - missing HMAC secret fails at setup (no unsigned envelopes)', async () => {
  await withRoot(async (root) => {
    await rejects(root, { mode: 'hmac' });
    await rejects(root, { mode: 'hmac', secret: '' });
    await rejects(root, { mode: 'hmac', secret: 'x'.repeat(31) });
    await rejects(root, { mode: 'hmac', secret: new Uint8Array(31) });
    const engine = await new Setup({ root, signing: { mode: 'hmac', secret: 'x'.repeat(32) } }).run();
    assert.ok((await engine.renderFragment('card.html', 'main', {})).sig);
  });
});

test('keys - Ed25519 seed must be 32 bytes', async () => {
  await withRoot(async (root) => {
    await rejects(root, { mode: 'ed25519' });
    await rejects(root, { mode: 'ed25519', privateKey: new Uint8Array(31) });
    await rejects(root, { mode: 'ed25519', privateKey: new Uint8Array(64) });
    await rejects(root, { mode: 'ed25519', privateKey: 'not a key' });
    const engine = await new Setup({ root, signing: { mode: 'ed25519', privateKey: SEED } }).run();
    assert.strictEqual((await engine.renderFragment('card.html', 'main', {})).sig?.length, 128);
    // 64-char hex seed and PEM work too.
    await new Setup({ root, signing: { mode: 'ed25519', privateKey: SEED.toString('hex') } }).run();
    const pem = privateKey(SEED).export({ format: 'pem', type: 'pkcs8' }) as string;
    await new Setup({ root, signing: { mode: 'ed25519', privateKey: pem } }).run();
  });
});

test('keys - Ed25519 public key must match the private key', async () => {
  await withRoot(async (root) => {
    const pub = rawPublicKey(privateKey(SEED));
    await new Setup({ root, signing: { mode: 'ed25519', privateKey: SEED, publicKey: pub } }).run();
    const other = crypto.generateKeyPairSync('ed25519').publicKey;
    await rejects(root, { mode: 'ed25519', privateKey: SEED, publicKey: other });
    await rejects(root, { mode: 'ed25519', privateKey: SEED, publicKey: new Uint8Array(31) });
  });
});

test('keys - inspect and JSON never print key material', async () => {
  await withRoot(async (root) => {
    const secret = 'this-is-a-very-secret-hmac-key-0';
    const setup = new Setup({ root, signing: { mode: 'hmac', secret } });
    const engine = await setup.run();
    for (const printed of [inspect(setup), JSON.stringify(setup), inspect(engine), inspect(engine.signer), JSON.stringify(engine.signer)]) {
      assert.ok(!printed.includes('very-secret'), printed);
    }
    const ed = new Setup({ root, signing: { mode: 'ed25519', privateKey: SEED.toString('hex') } });
    const edEngine = await ed.run();
    for (const printed of [inspect(ed), JSON.stringify(ed), inspect(edEngine, { depth: 5 })]) {
      assert.ok(!printed.includes('0707070707'), printed);
    }
  });
});
