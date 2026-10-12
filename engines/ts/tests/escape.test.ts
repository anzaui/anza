// Opt-in HTML escaping (`{{x}}` escaped, `{{{x}}}` raw) and own-property
// lookups (G9).
import test from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Setup, escapeHtml, extract, compile } from '../src/index.js';

const EVIL = `<script>alert('x')</script> & "q"`;
const ESCAPED = '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;q&quot;';

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'anza-ts-escape-'));
  await fs.writeFile(path.join(root, 'card.html'), '<p title="{{x}}">{{x}}</p><div>{{{x}}}</div>');
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('escape - escapeHtml is shared', () => {
  assert.strictEqual(escapeHtml(EVIL), ESCAPED);
  assert.strictEqual(escapeHtml('plain'), 'plain');
});

test('escape - escape: true escapes {{x}} only', async () => {
  await withRoot(async (root) => {
    const engine = await new Setup({ root, escape: true }).run();
    const env = await engine.renderFragment('card.html', 'main', { x: EVIL });
    assert.strictEqual(env.html, `<p title="${ESCAPED}">${ESCAPED}</p><div>${EVIL}</div>`);
  });
});

test('escape - off by default', async () => {
  await withRoot(async (root) => {
    const engine = await new Setup({ root }).run();
    const env = await engine.renderFragment('card.html', 'main', { x: EVIL });
    assert.strictEqual(env.html, `<p title="${EVIL}">${EVIL}</p><div>${EVIL}</div>`);
  });
});

test('escape - triple braces parse', () => {
  assert.deepStrictEqual(extract('a{{{ b }}}c{{d}}'), [
    { type: 'static', value: 'a' },
    { type: 'raw', name: 'b' },
    { type: 'static', value: 'c' },
    { type: 'slot', name: 'd' },
  ]);
  assert.throws(() => extract('{{{x}}'));
});

test('bind - prototype properties are never read', () => {
  const render = compile(extract('[{{toString}}][{{constructor}}][{{__proto__}}][{{hasOwnProperty}}][{{own}}]'));
  assert.strictEqual(render({ own: 'yes' }), '[][][][][yes]');
  class Model {
    own = 'field';
    get computed() {
      return 'getter';
    }
  }
  assert.strictEqual(compile(extract('{{own}}|{{computed}}'))(new Model()), 'field|');
});
