import { resolveAssetUrl } from '../../router/base.js';
import { assetCache } from './state.js';

// Detect constructable stylesheet + adoptedStyleSheets support once.
const supportsSheets =
  typeof CSSStyleSheet !== 'undefined' &&
  'adoptedStyleSheets' in Document.prototype &&
  'adoptedStyleSheets' in ShadowRoot.prototype;

/**
 * Fetch a same-origin text asset (style / template). Always run URLs through
 * `resolveAssetUrl` so deploy-base hosts (e.g. GitHub Pages `/anza/`) request
 * `/anza/styles/...`, not site-root `/styles/...` — even if a caller forgot
 * to resolve. Do not strip `__ANZA_BASE__` on 404 — that would hit the wrong
 * host path on Pages. Local `anza dev` strips the base on the server instead.
 */
async function fetchTextResource(url, tag, kind) {
  const href = resolveAssetUrl(url);
  try {
    const res = await fetch(href);
    if (res.ok) return res.text();
    console.error(
      `Failed to load ${kind} resource ${href} for element ${tag}: HTTP ${res.status}`
    );
  } catch (err) {
    console.error(`Failed to load ${kind} resource ${href} for element ${tag}:`, err);
  }
  return null;
}

/**
 * In-flight asset loads keyed by resolved URL. Concurrent callers share one
 * promise (one fetch, one CSSStyleSheet / template fragment). On success the
 * value moves to `assetCache`; failures are dropped so a later call retries.
 */
const inflight = new Map();

/** Fetches and compiles one asset (`style` → sheet or CSS text, `template` → fragment, `tags` → descriptor). */
async function compileAsset(url, kind, tag) {
  if (kind === 'tags') {
    try {
      const res = await fetch(url);
      // A missing descriptor is normal: cache the miss as null.
      if (!res.ok) return null;
      return validateDescriptor(await res.json());
    } catch (_) {
      return undefined; // network error: don't cache, retry later
    }
  }

  const text = await fetchTextResource(url, tag, kind);
  if (text == null) return undefined;
  if (kind === 'template') {
    return createTemplateFragment(sanitizeTemplateHtml(text, tag));
  }
  if (supportsSheets) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    return sheet;
  }
  return text;
}

/**
 * Returns the compiled asset for `url`, sharing one in-flight load between
 * concurrent callers. Resolves to `undefined` when the asset failed to load.
 */
function loadAsset(url, kind, tag) {
  if (assetCache.has(url)) return Promise.resolve(assetCache.get(url));
  const pending = inflight.get(url);
  if (pending) return pending;

  const promise = compileAsset(url, kind, tag)
    .catch((err) => {
      console.error(`Failed to load ${kind} resource ${url} for element ${tag}:`, err);
      return undefined;
    })
    .then((value) => {
      if (inflight.get(url) === promise) {
        inflight.delete(url);
        if (value !== undefined) assetCache.set(url, value);
      }
      return value;
    });
  inflight.set(url, promise);
  return promise;
}

/**
 * Drops a cached or in-flight asset so the next load fetches it again
 * (used by HTML hot-swap).
 */
export function evictAsset(url) {
  assetCache.delete(url);
  inflight.delete(url);
}

/** URL of the `.tags.json` descriptor that sits next to a template. */
export function tagsUrlFor(templateUrl) {
  return resolveAssetUrl(templateUrl.replace(/\.html$/, '.tags.json'));
}

/**
 * Loads style, template and tags descriptor resources in parallel, each at
 * most once per URL. Returns { templateNode, stylesheets, cssText, tagsDescriptor }.
 * When constructable stylesheets are unsupported, stylesheets is an empty array and
 * cssText carries the concatenated raw CSS for <style> injection.
 */
export async function preloadResources(tag, styleUrls, templateUrl, inlineTemplate, inlineStyle) {
  let templateNode = null;
  let stylesheets = [];
  let cssTextAcc = '';
  let tagsDescriptor = null;

  // Resolve under __ANZA_BASE__ before cache/fetch.
  const rawUrls = Array.isArray(styleUrls) ? styleUrls : (styleUrls ? [styleUrls] : []);
  const urls = rawUrls.map((u) => resolveAssetUrl(u));
  const resolvedTemplate = templateUrl ? resolveAssetUrl(templateUrl) : null;

  const [styles, fetchedTemplate, fetchedTags] = await Promise.all([
    Promise.all(urls.map((url) => loadAsset(url, 'style', tag))),
    resolvedTemplate ? loadAsset(resolvedTemplate, 'template', tag) : null,
    resolvedTemplate ? loadAsset(tagsUrlFor(resolvedTemplate), 'tags', tag) : null
  ]);

  // Keep declaration order regardless of which fetch finished first.
  for (const value of styles) {
    if (value == null) continue;
    if (supportsSheets) {
      stylesheets.push(value);
    } else {
      cssTextAcc += value + '\n';
    }
  }

  if (inlineStyle) {
    const inlineStyles = Array.isArray(inlineStyle) ? inlineStyle : [inlineStyle];
    // Filter out ones that are likely URLs (they were fetched above)
    const isUrl = s => typeof s === 'string' && (s.endsWith('.css') || ((s.startsWith('./') || s.startsWith('/')) && !s.startsWith('/*') && !s.includes('{')));
    const inlines = inlineStyles.filter(s => !isUrl(s));
    for (const style of inlines) {
      if (supportsSheets) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(style);
        stylesheets.push(sheet);
      } else {
        cssTextAcc += style + '\n';
      }
    }
  }

  const cssText = cssTextAcc.trim() ? cssTextAcc : null;

  if (resolvedTemplate) {
    templateNode = fetchedTemplate ?? null;
    tagsDescriptor = fetchedTags ?? null;
  } else if (inlineTemplate) {
    templateNode = createTemplateFragment(inlineTemplate);
  }

  return { templateNode, stylesheets, cssText, tagsDescriptor };
}

/**
 * Validates a raw tags descriptor JSON object.
 * Returns a safe descriptor with only array-typed fields, or null if unusable.
 */
export function validateDescriptor(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const safe = {};
  if (typeof raw.version === 'number') safe.version = raw.version;

  const known = new Set(['version', 'refs', 'ids', 'classes', 'tags', 'compound']);

  for (const field of ['refs', 'ids', 'classes', 'tags', 'compound']) {
    safe[field] = Array.isArray(raw[field]) ? raw[field] : [];
  }

  // Preserve unknown future fields without mutating them
  for (const [k, v] of Object.entries(raw)) {
    if (!known.has(k)) {
      safe[k] = v;
    }
  }

  return safe;
}

/**
 * Compiles an HTML string into a DocumentFragment utilizing the fastest native methods.
 */
export function createTemplateFragment(htmlString) {
  const tpl = document.createElement('template');
  if (typeof tpl.setHTMLUnsafe === 'function') {
    tpl.setHTMLUnsafe(htmlString);
  } else {
    tpl.innerHTML = htmlString;
  }
  return tpl.content;
}

/**
 * Guard against SSG documents being fetched as page templates.
 * When `./index.html` collides with Mode A SSG output, CSR would nest
 * `dock-docs` chrome inside the leaf shadow (stacked sidebars). Prefer the
 * leaf host's open-DSD body when present; otherwise refuse the document shell.
 *
 * @param {string} html
 * @param {string} [tag]
 * @returns {string}
 */
export function sanitizeTemplateHtml(html, tag) {
  const trimmed = typeof html === 'string' ? html.trim() : '';
  if (!trimmed) return '';
  const looksLikeDocument =
    /^<!DOCTYPE/i.test(trimmed) ||
    /^<html[\s>]/i.test(trimmed) ||
    /<dock-main[\s>]/i.test(trimmed) ||
    /<dock-docs[\s>]/i.test(trimmed);
  if (!looksLikeDocument) return html;

  if (tag && tag.includes('-')) {
    const re = new RegExp(
      `<${tag}[^>]*>\\s*<template[^>]*shadowrootmode=["']open["'][^>]*>([\\s\\S]*?)</template>`,
      'i'
    );
    const m = trimmed.match(re);
    if (m) {
      // Drop the leaf's own <style> block(s) — page CSS is loaded via style URLs.
      return m[1].replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    }
  }

  console.error(
    `[Native UI] Refusing full HTML document as template for <${tag || 'unknown'}> — ` +
      `SSG index.html must not collide with the CSR fragment path.`
  );
  return '';
}

function escapeAttrValue(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * True when a root has meaningful markup beyond style/link/script shells.
 */
export function hasStructuralElements(root) {
  if (!root?.childNodes?.length) return false;
  for (const node of root.childNodes) {
    if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
    const tag = node.localName;
    if (tag === 'style' || tag === 'link' || tag === 'script') continue;
    return true;
  }
  return false;
}

/**
 * Collects `ref` attribute names under a fragment or shadow root.
 */
export function collectRefNames(root) {
  const names = [];
  if (!root?.querySelectorAll) return names;
  for (const node of root.querySelectorAll('[ref]')) {
    const name = node.getAttribute('ref');
    if (name) names.push(name);
  }
  return names;
}

/**
 * Detects hard hydration mismatches between an adopted DSD tree and the
 * client template / tags descriptor (missing critical refs or empty structure).
 */
export function hasHydrationMismatch(shadowRoot, templateNode, descriptor) {
  if (!shadowRoot || !templateNode) return false;

  const expectedRefs = Array.isArray(descriptor?.refs) && descriptor.refs.length > 0
    ? descriptor.refs
    : collectRefNames(templateNode);

  for (const name of expectedRefs) {
    try {
      if (!shadowRoot.querySelector(`[ref="${escapeAttrValue(name)}"]`)) {
        return true;
      }
    } catch {
      return true;
    }
  }

  if (hasStructuralElements(templateNode) && !hasStructuralElements(shadowRoot)) {
    return true;
  }

  return false;
}

/**
 * One-shot replace of shadow children with a clone of the client template.
 * Leaves adoptedStyleSheets intact (they live on the root, not as children).
 */
export function replaceShadowTemplate(shadowRoot, templateNode) {
  if (!shadowRoot || !templateNode) return;
  while (shadowRoot.firstChild) {
    shadowRoot.removeChild(shadowRoot.firstChild);
  }
  shadowRoot.appendChild(templateNode.cloneNode(true));
}

/**
 * Finds a direct-child Declarative Shadow DOM template (polyfill / late upgrade).
 */
export function findDsdTemplate(host) {
  if (!host?.children) return null;
  for (const child of host.children) {
    if (child.localName === 'template' && child.hasAttribute('shadowrootmode')) {
      return child;
    }
  }
  return null;
}
