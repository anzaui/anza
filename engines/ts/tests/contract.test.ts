// Rendering golden fixtures, shared by all three engines (GC1): value
// stringification, escaping, the page pipeline, SSE/WS framing and manifest
// digests.
import test from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Setup, Envelope, AnzaError, formatEvent, formatPacket } from '../src/index.js';

const FIXTURES = new URL('../../../fixtures/', import.meta.url);
const fx = JSON.parse(fs.readFileSync(new URL('render.json', FIXTURES), 'utf8'));
const rootOf = (name: string) => fileURLToPath(new URL(`render/${name}`, FIXTURES));

test('contract - fragments match the golden fixtures', async () => {
  for (const c of fx.fragments) {
    const engine = await new Setup({ root: rootOf(c.root), escape: Boolean(c.escape) }).run();
    assert.strictEqual(engine.get(c.template).bind(c.params), c.html, c.name);
    assert.strictEqual((await engine.renderFragment(c.template, 'main', c.params)).html, c.html, c.name);
    if (c.params) assert.strictEqual(engine.get(c.template).bind(new Map(Object.entries(c.params))), c.html, c.name);
  }
});

test('contract - pages match the golden fixtures', async () => {
  for (const c of fx.pages) {
    const engine = await new Setup({ root: rootOf(c.root) }).run();
    if (c.error) {
      await assert.rejects(engine.renderPage(c.route, c.params), (err: unknown) => err instanceof AnzaError && err.code === c.error, c.name);
    } else {
      assert.strictEqual((await engine.renderPage(c.route, c.params)).html, c.html, c.name);
    }
  }
});

test('contract - SSE and WS framing match the golden fixtures', () => {
  for (const c of fx.sse) {
    const e = c.envelope;
    const env = new Envelope(e.slot, e.ts, e.html, e.sig, e.css);
    assert.strictEqual(formatEvent(env), c.frame);
    assert.strictEqual(formatPacket(env), c.packet);
  }
});

test('contract - manifest matches the golden fixtures', async () => {
  const engine = await new Setup({ root: rootOf(fx.manifest.root) }).run();
  assert.deepStrictEqual({ ...engine.manifest().templates }, fx.manifest.templates);
});
