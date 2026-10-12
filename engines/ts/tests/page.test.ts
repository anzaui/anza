// Page routes only reach `pages/`, malformed routes and names are refused
// without touching the filesystem, and errors never echo paths (G5, G6).
import test from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Setup, AnzaError, validName, pageTemplate, type Engine } from '../src/index.js';

async function project(fn: (root: string, dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'anza-ts-page-'));
  const root = path.join(dir, 'root');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(path.join(root, 'feed'), { recursive: true });
  await fs.writeFile(path.join(root, 'pages', 'about.html'), '<h1>About</h1>');
  await fs.writeFile(path.join(root, 'feed', 'card.html'), '<p>card</p>');
  await fs.writeFile(path.join(dir, 'secret.html'), '<p>SECRET</p>');
  await fs.writeFile(path.join(root, 'secret.html'), '<p>ROOT-LEVEL</p>');
  try {
    await fn(root, dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function notFound(engine: Engine, route: string) {
  await assert.rejects(engine.renderPage(route), (err: unknown) => {
    assert.ok(err instanceof AnzaError, route);
    assert.strictEqual(err.code, 'NOT_FOUND', route);
    assert.strictEqual(err.message, '[Anza:NOT_FOUND] Page not found', route);
    return true;
  });
}

test('names - validName and pageTemplate', () => {
  for (const ok of ['a.html', 'feed/card.html', 'a..b.html']) assert.ok(validName(ok), ok);
  for (const bad of ['', '/a.html', 'a//b.html', '../a.html', 'a/../b.html', './a.html', 'a\\b.html', 'a\0.html', 'a/']) {
    assert.ok(!validName(bad), JSON.stringify(bad));
  }
  assert.strictEqual(pageTemplate('/'), 'pages/home.html');
  assert.strictEqual(pageTemplate('/a/b/'), 'pages/a/b.html');
  assert.strictEqual(pageTemplate('/../secret'), null);
});

test('render/page - unknown routes are NOT_FOUND and never reflected', async () => {
  await project(async (root) => {
    const engine = await new Setup({ root }).run();
    for (const route of ["/<script>alert('x')</script>", '/missing', '/"><img src=x>']) await notFound(engine, route);
    assert.ok((await engine.renderPage('/about')).html.includes('<h1>About</h1>'));
  });
});

test('render/page - routes only reach pages/ (no bare-route fallback)', async () => {
  await project(async (root) => {
    const engine = await new Setup({ root }).run();
    for (const route of ['/secret', '/../secret', '/../../secret', '/pages/../secret', '/./secret/..', '/..\\secret', '/feed/card', '/about\0']) {
      await notFound(engine, route);
    }
  });
});

test('render/page - the catch-all never serves malformed routes', async () => {
  await project(async (root) => {
    await fs.writeFile(path.join(root, 'pages', 'index.html'), '<p>INDEX</p>');
    const engine = await new Setup({ root }).run();
    assert.ok((await engine.renderPage('/no/such/page')).html.includes('INDEX'));
    assert.ok((await engine.renderPage('/secret')).html.includes('INDEX'));
    await notFound(engine, '/../secret');
  });
});

test('engine - malformed template names are rejected, errors are path-free', async () => {
  await project(async (root, dir) => {
    const engine = await new Setup({ root }).run();
    for (const name of ['../secret.html', '/feed/card.html', 'feed\\card.html', 'feed/./card.html', 'feed//card.html', 'a\0.html']) {
      assert.throws(() => engine.get(name), (err: unknown) => err instanceof AnzaError && err.code === 'VALIDATION', name);
      await assert.rejects(engine.renderFragment(name, 'main'), AnzaError);
    }
    assert.throws(() => engine.get('missing.html'), (err: unknown) => err instanceof Error && !err.message.includes(dir));
  });
});

test('engine - fragment allowlist', async () => {
  await project(async (root) => {
    const engine = await new Setup({ root, fragments: ['feed/'] }).run();
    assert.ok(await engine.renderFragment('feed/card.html', 'main'));
    for (const name of ['secret.html', 'pages/about.html']) {
      await assert.rejects(engine.renderFragment(name, 'main'), (err: unknown) => {
        assert.ok(err instanceof AnzaError);
        assert.strictEqual(err.message, `[Anza:NOT_FOUND] Template '${name}' not found`);
        return true;
      });
    }
    assert.ok((await engine.renderPage('/about')).html.includes('About'));
  });
});
