// Template size cap, symlinks out of the root, debounced ordered reloads (G10).
import test from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Setup, AnzaError } from '../src/index.js';

async function project(fn: (root: string, dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'anza-ts-limits-'));
  const root = path.join(dir, 'root');
  await fs.mkdir(root);
  try {
    await fn(root, dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('limits - oversized templates fail setup', async () => {
  await project(async (root, dir) => {
    await fs.writeFile(path.join(root, 'big.html'), 'x'.repeat(1024 * 1024 + 1));
    await assert.rejects(new Setup({ root }).run(), (err: unknown) => {
      assert.ok(err instanceof AnzaError);
      assert.strictEqual(err.code, 'TEMPLATE');
      assert.ok(err.message.includes('big.html'));
      assert.ok(!err.message.includes(dir));
      return true;
    });
    await fs.writeFile(path.join(root, 'big.html'), 'x'.repeat(1024 * 1024));
    await new Setup({ root }).run();
    await assert.rejects(new Setup({ root, maxTemplateBytes: 1024 }).run(), /larger than 1024 bytes/);
  });
});

test('limits - symlinks out of the root are not followed', async () => {
  await project(async (root, dir) => {
    await fs.mkdir(path.join(dir, 'outside'));
    await fs.writeFile(path.join(dir, 'outside', 'secret.html'), '<p>SECRET</p>');
    await fs.writeFile(path.join(root, 'real.html'), '<p>real</p>');
    await fs.symlink(path.join(dir, 'outside', 'secret.html'), path.join(root, 'leak.html'));
    await fs.symlink(path.join(dir, 'outside'), path.join(root, 'linked'));
    await fs.symlink(path.join(root, 'real.html'), path.join(root, 'alias.html'));
    const engine = await new Setup({ root }).run();
    assert.ok(engine.get('real.html'));
    assert.ok(engine.get('alias.html'), 'in-root symlinks still load');
    assert.throws(() => engine.get('leak.html'));
    assert.throws(() => engine.get('linked/secret.html'));
    assert.deepStrictEqual(Object.keys(engine.manifest().templates).sort(), ['alias.html', 'real.html']);
  });
});

async function waitFor(ok: () => boolean, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (ok()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

test('watch - a burst of writes reloads once, newest content wins', async () => {
  await project(async (root) => {
    await fs.writeFile(path.join(root, 'card.html'), '<p>v0</p>');
    const engine = await new Setup({ root, watch: true }).run();
    try {
      let loads = 0;
      const original = engine.cache;
      const descriptor = { get: () => (original as any)._t, set: (v: any) => { loads++; (original as any)._t = v; } };
      (original as any)._t = original.templates;
      Object.defineProperty(original, 'templates', descriptor);

      for (let i = 1; i <= 20; i++) await fs.writeFile(path.join(root, 'card.html'), `<p>v${i}</p>`);
      assert.ok(await waitFor(() => engine.get('card.html').bind() === '<p>v20</p>'), 'final write not loaded');
      await new Promise((r) => setTimeout(r, 200));
      await engine.watcher?.settled();
      assert.strictEqual(engine.get('card.html').bind(), '<p>v20</p>');
      assert.ok(loads >= 1 && loads <= 5, `expected a debounced reload, got ${loads}`);

      await fs.writeFile(path.join(root, 'new.html'), '<b>new</b>');
      assert.ok(await waitFor(() => engine.cache.has('new.html')), 'new template not loaded');
      await fs.rm(path.join(root, 'new.html'));
      assert.ok(await waitFor(() => !engine.cache.has('new.html')), 'removed template still cached');
    } finally {
      engine.watcher?.close();
    }
  });
});
