// Signature v2 golden fixtures, shared by all three engines (G4, GC1).
import test from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Envelope, Setup, AnzaError, verifyEnvelope, type VerifyKey, type Engine } from '../src/index.js';
import { hmac, ed25519 } from '../src/crypto/index.js';

const fx = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/signature.json', import.meta.url), 'utf8'));
const SECRET: string = fx.keys.hmac_secret;
const SEED = Buffer.from(fx.keys.ed25519_seed, 'hex');
const PUBLIC = Buffer.from(fx.keys.ed25519_public, 'hex');

test('signature v2 - message and signatures match the golden fixtures', () => {
  for (const c of fx.cases) {
    const e = c.envelope;
    const env = new Envelope(e.slot, e.ts, e.html, undefined, e.css);
    const msg = env.message();
    assert.strictEqual(msg.toString('hex'), c.message_hex, c.name);
    assert.strictEqual(hmac.sign(SECRET, msg), c.hmac, c.name);
    assert.strictEqual(ed25519.sign(SEED, msg), c.ed25519, c.name);
  }
  assert.notStrictEqual(fx.cases[3].message_hex, fx.cases[4].message_hex);
});

function mutate(mode: 'hmac' | 'ed25519', rule: any) {
  const base = fx.cases.find((c: any) => c.name === fx.verify.base);
  const env: any = { ...base.envelope, sig: base[mode] };
  for (const [k, v] of Object.entries(rule.set ?? {})) {
    if (v === null) delete env[k];
    else env[k] = v;
  }
  const op: string = rule.sig ?? 'keep';
  if (op === 'drop') delete env.sig;
  else if (op === 'upper') env.sig = env.sig.toUpperCase();
  else if (op.startsWith('append:')) env.sig += op.slice(7);
  else if (op.startsWith('literal:')) env.sig = op.slice(8);
  const o = { ...fx.verify.options, ...(rule.options ?? {}) };
  return { env, options: { slot: o.slot, maxAgeSecs: o.max_age_secs, now: o.now } };
}

async function engineWith(signing: any): Promise<{ engine: Engine; dir: string }> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'anza-ts-sig-'));
  await fsp.writeFile(path.join(dir, 'card.html'), '<b>{{x}}</b>');
  return { engine: await new Setup({ root: dir, signing }).run(), dir };
}

test('signature v2 - verifyEnvelope follows the golden rules', async () => {
  const hm = await engineWith({ mode: 'hmac', secret: SECRET });
  const ed = await engineWith({ mode: 'ed25519', privateKey: SEED });
  try {
    const modes: Array<['hmac' | 'ed25519', VerifyKey, Engine]> = [
      ['hmac', { mode: 'hmac', secret: SECRET }, hm.engine],
      ['ed25519', { mode: 'ed25519', publicKey: PUBLIC }, ed.engine],
    ];
    for (const [mode, key, engine] of modes) {
      for (const rule of fx.verify.accept) {
        const { env, options } = mutate(mode, rule);
        verifyEnvelope(key, env, options);
        engine.verifyEnvelope(env, options);
      }
      for (const rule of fx.verify.reject) {
        const { env, options } = mutate(mode, rule);
        for (const run of [() => verifyEnvelope(key, env, options), () => engine.verifyEnvelope(env, options)]) {
          assert.throws(run, (err: unknown) => {
            assert.ok(err instanceof AnzaError, `${mode} ${rule.name}`);
            assert.strictEqual(err.code, 'CRYPTO');
            assert.strictEqual(err.message, `[Anza:CRYPTO] ${rule.reason}`, `${mode} ${rule.name}`);
            return true;
          });
        }
      }
    }
  } finally {
    await fsp.rm(hm.dir, { recursive: true, force: true });
    await fsp.rm(ed.dir, { recursive: true, force: true });
  }
});

test('signature v2 - rendered envelopes carry v: 2 and verify', async () => {
  const { engine, dir } = await engineWith({ mode: 'hmac', secret: SECRET });
  try {
    const env = await engine.renderFragment('card.html', 'feed', { x: 1 });
    assert.strictEqual(env.v, 2);
    assert.ok(JSON.stringify(env).startsWith('{"v":2,'));
    const parsed = JSON.parse(JSON.stringify(env));
    verifyEnvelope({ mode: 'hmac', secret: SECRET }, parsed, { slot: 'feed', maxAgeSecs: 60 });
    assert.throws(() => verifyEnvelope({ mode: 'hmac', secret: SECRET }, parsed, { slot: 'main', maxAgeSecs: 60 }));
    assert.throws(() => verifyEnvelope({ mode: 'hmac', secret: 'short' }, parsed, { slot: 'feed', maxAgeSecs: 60 }), /invalid verification key/);
    assert.throws(() => verifyEnvelope({ mode: 'hmac', secret: SECRET }, { ...parsed, ts: '1' }, { slot: 'feed', maxAgeSecs: 60 }), /malformed envelope/);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
