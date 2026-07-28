#!/usr/bin/env node
/**
 * tasks/ssg-contract-check.js
 *
 * Lightweight Mode A HTML contract checks against golden fixtures and
 * (when present) the built pages under web/dist.
 *
 * Usage (repo root):
 *   node tasks/ssg-contract-check.js
 *   node tasks/ssg-contract-check.js --rebuild
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(root, 'plans', 'fixtures', 'ssg');
const webDir = join(root, 'web');
const distDir = join(webDir, 'dist');
const builtIntro = join(distDir, 'docs', 'intro', 'start', 'index.html');
const builtHome = join(distDir, 'index.html');
const builtExpand = join(distDir, 'docs', 'ssg', 'expand', 'foo', 'index.html');
const routesJson = join(distDir, 'routes.json');
const missingExpand = join(distDir, 'docs', 'ssg', 'expand', 'nope', 'index.html');
const sitemapPath = join(distDir, 'sitemap.xml');
const robotsPath = join(distDir, 'robots.txt');
const siteConfigPath = join(webDir, 'ssg.json');

const rebuild = process.argv.includes('--rebuild');
let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function assertContains(html, needle, label) {
  if (!html.includes(needle)) fail(`${label}: missing ${JSON.stringify(needle)}`);
  else ok(`${label}: has ${JSON.stringify(needle)}`);
}

function assertAbsent(html, needle, label) {
  if (html.includes(needle)) fail(`${label}: must not contain ${JSON.stringify(needle)}`);
  else ok(`${label}: no ${JSON.stringify(needle)}`);
}

/** Flag /dist/ only on asset href/src (not prose mentioning dist/). */
function assertNoDistAssetUrls(html, label) {
  const re = /\b(?:href|src)\s*=\s*["']\/dist\//gi;
  if (re.test(html)) fail(`${label}: asset URL uses /dist/ prefix`);
  else ok(`${label}: no /dist/ asset hrefs/srcs`);
}

function checkPage(html, label, { requireTitle = true, requireJsonLd = false } = {}) {
  if (requireTitle) assertContains(html, '<title>', label);
  assertContains(html, 'shadowrootmode="open"', label);
  assertAbsent(html, 'shadowrootmode="closed"', label);
  assertNoDistAssetUrls(html, label);
  assertContains(html, 'href="/tokens/index.css"', label);
  assertContains(html, 'href="/styles/index.css"', label);
  assertContains(html, 'rel="modulepreload"', label);
  assertContains(html, 'src="/app.js"', label);
  assertContains(html, 'type="importmap"', label);
  if (requireJsonLd) {
    assertContains(html, 'application/ld+json', label);
    assertContains(html, 'WebPage', label);
  }
}

/**
 * Assert nested hosts are light-DOM siblings after each parent's DSD template
 * (not inside the template). Wrong: <dock-main><template>…<dock-docs>…
 */
function assertLightDomNest(html, chain, label) {
  let from = 0;
  for (let i = 0; i < chain.length; i++) {
    const tag = chain[i];
    const open = html.indexOf(`<${tag}`, from);
    if (open < 0) {
      fail(`${label}: missing <${tag}>`);
      return;
    }
    const tplOpen = html.indexOf('<template shadowrootmode="open">', open);
    const tplClose = html.indexOf('</template>', tplOpen);
    if (tplOpen < 0 || tplClose < 0) {
      fail(`${label}: <${tag}> missing open DSD template`);
      return;
    }
    if (i + 1 < chain.length) {
      const child = chain[i + 1];
      const childOpen = html.indexOf(`<${child}`, tplClose);
      if (childOpen < 0) {
        fail(`${label}: missing nested <${child}> after <${tag}>`);
        return;
      }
      const shadowBody = html.slice(tplOpen, tplClose);
      if (shadowBody.includes(`<${child}`)) {
        fail(`${label}: <${child}> must not be inside <${tag}> DSD template (light DOM only)`);
        return;
      }
      if (!(tplClose < childOpen)) {
        fail(`${label}: <${child}> must be a light-DOM sibling after <${tag}>'s </template>`);
        return;
      }
      ok(`${label}: <${child}> is light-DOM child of <${tag}>`);
      from = childOpen;
    } else {
      from = open;
    }
  }
}

/** Walk dist for SSG documents (open DSD) and gate closed-DSD / /dist/ assets. */
function walkSsgHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      // Skip node_modules-like noise if any
      if (name === 'node_modules') continue;
      walkSsgHtml(p, out);
    } else if (name === 'index.html') {
      out.push(p);
    }
  }
  return out;
}

function maybeRebuild() {
  if (!rebuild && existsSync(builtIntro)) return;
  if (!rebuild && !existsSync(builtIntro)) {
    console.log('web/dist missing intro/start HTML; building…');
  } else {
    console.log('Rebuilding web…');
  }
  const anzaBin = join(root, 'tools', 'target', 'release', 'anza');
  const env = { ...process.env };
  if (existsSync(anzaBin)) {
    env.PATH = `${dirname(anzaBin)}${env.PATH ? `:${env.PATH}` : ''}`;
  }
  execSync('npm run build', { cwd: webDir, stdio: 'inherit', env });
}

function readRequired(path, label) {
  if (!existsSync(path)) {
    fail(`${label}: file not found: ${path}`);
    return null;
  }
  return readFileSync(path, 'utf8');
}

function loadSiteOrigin() {
  if (process.env.ANZA_SITE_ORIGIN) {
    return process.env.ANZA_SITE_ORIGIN.replace(/\/$/, '');
  }
  if (existsSync(siteConfigPath)) {
    try {
      const cfg = JSON.parse(readFileSync(siteConfigPath, 'utf8'));
      if (cfg.origin) return String(cfg.origin).replace(/\/$/, '');
    } catch {
      /* ignore */
    }
  }
  return null;
}

maybeRebuild();

const goldens = [
  ['home.html', join(fixturesDir, 'home.html')],
  ['docs-intro-start.html', join(fixturesDir, 'docs-intro-start.html')],
];

for (const [name, path] of goldens) {
  const html = readRequired(path, name);
  if (html) checkPage(html, `golden ${name}`);
}

const goldenIntro = readRequired(join(fixturesDir, 'docs-intro-start.html'), 'docs-intro-start.html');
if (goldenIntro) {
  assertLightDomNest(
    goldenIntro,
    ['dock-main', 'dock-docs', 'dock-doccontent', 'doc-intro-start'],
    'golden docs-intro-start nest'
  );
  assertAbsent(goldenIntro, '<dock-content', 'golden docs-intro-start');
}

const goldenHome = readRequired(join(fixturesDir, 'home.html'), 'home.html');
if (goldenHome) {
  assertLightDomNest(goldenHome, ['dock-main', 'page-welcome'], 'golden home nest');
  assertAbsent(goldenHome, '<dock-docs', 'golden home nest');
}

if (existsSync(builtIntro)) {
  const html = readFileSync(builtIntro, 'utf8');
  checkPage(html, 'built docs/intro/start', { requireJsonLd: true });
  assertLightDomNest(
    html,
    ['dock-main', 'dock-docs', 'dock-doccontent', 'doc-intro-start'],
    'built docs/intro/start nest'
  );
  assertAbsent(html, '<dock-content', 'built docs/intro/start');
} else {
  fail(`built page missing: ${builtIntro}`);
}

if (existsSync(builtHome)) {
  const html = readFileSync(builtHome, 'utf8');
  checkPage(html, 'built home (/)', { requireJsonLd: true });
  assertLightDomNest(html, ['dock-main', 'page-welcome'], 'built home nest');
  assertAbsent(html, '<dock-docs', 'built home nest');
}

// Phase 5 — parametric expansion fixture
if (existsSync(builtExpand)) {
  const html = readFileSync(builtExpand, 'utf8');
  checkPage(html, 'built docs/ssg/expand/foo', { requireJsonLd: true });
  assertContains(html, 'SSG expand: foo', 'built docs/ssg/expand/foo');
  assertContains(html, '<title>SSG expand: foo — Anza</title>', 'built docs/ssg/expand/foo');
  assertLightDomNest(
    html,
    ['dock-main', 'dock-docs', 'dock-doccontent', 'doc-ssg-expand'],
    'built docs/ssg/expand/foo nest'
  );
} else {
  fail(`built expanded page missing: ${builtExpand}`);
}

if (existsSync(missingExpand)) {
  fail(`unexpanded parametric must not emit SSG file: ${missingExpand}`);
} else {
  ok('unexpanded slug /docs/ssg/expand/nope has no SSG file');
}

if (existsSync(routesJson)) {
  const routes = JSON.parse(readFileSync(routesJson, 'utf8')).routes || [];
  const pattern = routes.find((r) => r.path === '/docs/ssg/expand/:slug');
  const expanded = routes.find((r) => r.path === '/docs/ssg/expand/foo');
  if (!pattern) fail('routes.json missing pattern /docs/ssg/expand/:slug');
  else if (pattern.ssg !== false) fail('pattern /docs/ssg/expand/:slug must have ssg: false');
  else ok('routes.json pattern /docs/ssg/expand/:slug has ssg: false');
  if (!expanded) fail('routes.json missing expanded /docs/ssg/expand/foo');
  else if (expanded.ssg !== true) fail('expanded /docs/ssg/expand/foo must have ssg: true');
  else ok('routes.json expanded /docs/ssg/expand/foo has ssg: true');
} else {
  fail(`routes.json missing: ${routesJson}`);
}

// Phase 6 — sitemap / robots / absolute canonicals / corpus closed-DSD gate
const siteOrigin = loadSiteOrigin();

const sitemap = readRequired(sitemapPath, 'sitemap.xml');
if (sitemap) {
  assertContains(sitemap, '<urlset', 'sitemap.xml');
  assertContains(sitemap, '<loc>', 'sitemap.xml');
  const introLoc = siteOrigin
    ? `${siteOrigin}/docs/intro/start`
    : '/docs/intro/start';
  assertContains(sitemap, `<loc>${introLoc}</loc>`, 'sitemap.xml');
  const homeLoc = siteOrigin ? `${siteOrigin}/` : '/';
  assertContains(sitemap, `<loc>${homeLoc}</loc>`, 'sitemap.xml');
}

const robots = readRequired(robotsPath, 'robots.txt');
if (robots) {
  assertContains(robots, 'User-agent:', 'robots.txt');
  assertContains(robots, 'Sitemap:', 'robots.txt');
  if (siteOrigin) {
    assertContains(robots, `${siteOrigin}/sitemap.xml`, 'robots.txt');
  } else {
    assertContains(robots, '/sitemap.xml', 'robots.txt');
  }
}

if (siteOrigin && existsSync(builtIntro)) {
  const html = readFileSync(builtIntro, 'utf8');
  assertContains(
    html,
    `rel="canonical" href="${siteOrigin}/docs/intro/start"`,
    'built docs/intro/start absolute canonical'
  );
  assertContains(html, `"url":"${siteOrigin}/docs/intro/start"`, 'built docs/intro/start JSON-LD url');
}

// Corpus gate: every SSG index.html under dist
const allIndex = walkSsgHtml(distDir);
let ssgDocs = 0;
let closedHits = 0;
let distAssetHits = 0;
const distAssetRe = /\b(?:href|src)\s*=\s*["']\/dist\//i;
for (const file of allIndex) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('shadowrootmode="open"')) continue;
  ssgDocs += 1;
  // Only flag real closed DSD templates, not prose mentioning the ban.
  if (/<template\b[^>]*\bshadowrootmode\s*=\s*["']closed["']/i.test(html)) {
    closedHits += 1;
    fail(`closed DSD in ${file.replace(distDir + '/', '')}`);
  }
  if (distAssetRe.test(html)) {
    distAssetHits += 1;
    fail(`/dist/ asset URL in ${file.replace(distDir + '/', '')}`);
  }
}
if (ssgDocs === 0) {
  fail('corpus gate: no SSG HTML (open DSD) found under web/dist');
} else if (closedHits === 0 && distAssetHits === 0) {
  ok(`corpus gate: ${ssgDocs} SSG page(s) — no closed DSD, no /dist/ asset hrefs`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll SSG contract checks passed.');
process.exit(0);
