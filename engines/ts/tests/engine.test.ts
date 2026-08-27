import test from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { extract, compile, string } from '../src/engine/slot/index.js';
import { Setup } from '../src/data/in/setup.js';
import { Page } from '../src/data/in/page.js';
import { Fragment } from '../src/data/in/fragment.js';

test('engine/slot - parsing and single-pass chunk extraction', () => {
  const template = '<ui-card><span slot="title">{{title}}</span><div class="count">{{count}}</div></ui-card>';
  const chunks = extract(template);

  assert.strictEqual(chunks.length, 5);
  assert.deepStrictEqual(chunks[0], { type: 'static', value: '<ui-card><span slot="title">' });
  assert.deepStrictEqual(chunks[1], { type: 'slot', name: 'title' });
  assert.deepStrictEqual(chunks[2], { type: 'static', value: '</span><div class="count">' });
  assert.deepStrictEqual(chunks[3], { type: 'slot', name: 'count' });
  assert.deepStrictEqual(chunks[4], { type: 'static', value: '</div></ui-card>' });
});

test('engine/slot - ultra-fast parameter binding', () => {
  const template = '<article id="art-{{id}}"><h1>{{title}}</h1><span>By {{author}}</span></article>';
  const chunks = extract(template);
  const fn = compile(chunks);

  // 1. Plain Object
  const res1 = fn({ id: 101, title: 'Zero-Overhead STUI', author: 'Sarah Lin' });
  assert.strictEqual(res1, '<article id="art-101"><h1>Zero-Overhead STUI</h1><span>By Sarah Lin</span></article>');

  // 2. Map
  const map = new Map<string, any>([
    ['id', 202],
    ['title', 'Map Title'],
    ['author', 'Alex Rivera'],
  ]);
  const res2 = fn(map);
  assert.strictEqual(res2, '<article id="art-202"><h1>Map Title</h1><span>By Alex Rivera</span></article>');

  // 3. Array of tuples
  const res3 = fn([
    ['id', 303],
    ['title', 'Tuple Title'],
    ['author', 'Marcus Vance'],
  ]);
  assert.strictEqual(res3, '<article id="art-303"><h1>Tuple Title</h1><span>By Marcus Vance</span></article>');
});

test('engine/file & render - full SSR compilation and open DSD', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anza-ts-test-'));
  await fs.mkdir(path.join(tempDir, 'pages'), { recursive: true });

  const homeHtml = '<page-home><template shadowrootmode="open"><h1>{{title}}</h1></template></page-home>';
  await fs.writeFile(path.join(tempDir, 'pages', 'home.html'), homeHtml, 'utf8');

  const engine = await new Setup({
    root: tempDir,
    signing: { mode: 'none' },
    watch: false,
  }).run();

  const doc = await new Page('/', { title: 'Welcome to Anza TS' }).run(engine);

  assert.ok(doc.html.includes('<!DOCTYPE html>'));
  assert.ok(doc.html.includes('<dock-main>'));
  assert.ok(doc.html.includes('<template shadowrootmode="open">'));
  assert.ok(doc.html.includes('<h1>Welcome to Anza TS</h1>'));

  await fs.rm(tempDir, { recursive: true, force: true });
});

test('engine/fragment - dynamic signed envelope generation', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anza-ts-frag-'));
  await fs.mkdir(path.join(tempDir, 'feed'), { recursive: true });

  const cardHtml = '<ui-card><div class="title">{{title}}</div><ui-badge>{{status}}</ui-badge></ui-card>';
  await fs.writeFile(path.join(tempDir, 'feed', 'card.html'), cardHtml, 'utf8');

  const secret = 'test-secret-key-32-bytes-long!!';
  const engine = await new Setup({
    root: tempDir,
    signing: { mode: 'hmac', secret },
    watch: false,
  }).run();

  const envelope = await new Fragment('feed/card.html', 'feed', {
    title: 'Live TS Component',
    status: 'online',
  }).run(engine);

  assert.strictEqual(envelope.slot, 'feed');
  assert.ok(envelope.html.includes('<div class="title">Live TS Component</div>'));
  assert.ok(envelope.sig, 'Signature must be generated');

  await fs.rm(tempDir, { recursive: true, force: true });
});
