import { assetCache } from './state.js';

// Detect constructable stylesheet + adoptedStyleSheets support once.
const supportsSheets =
  typeof CSSStyleSheet !== 'undefined' &&
  'adoptedStyleSheets' in Document.prototype &&
  'adoptedStyleSheets' in ShadowRoot.prototype;

/**
 * Fetch a same-origin text asset (style / template). Callers must pass URLs
 * already resolved via `resolveAssetUrl` so deploy-base hosts (e.g. GitHub
 * Pages `/anza/`) request `/anza/styles/...`, not site-root `/styles/...`.
 * Do not strip `__ANZA_BASE__` on 404 — that would hit the wrong host path
 * on Pages. Local `anza dev` strips the base on the server instead.
 */
async function fetchTextResource(url, tag, kind) {
  try {
    const res = await fetch(url);
    if (res.ok) return res.text();
    console.error(
      `Failed to load ${kind} resource ${url} for element ${tag}: HTTP ${res.status}`
    );
  } catch (err) {
    console.error(`Failed to load ${kind} resource ${url} for element ${tag}:`, err);
  }
  return null;
}

/**
 * Preloads style and HTML template resources asynchronously exactly once.
 * Returns { templateNode, stylesheets, cssText, tagsDescriptor }.
 * When constructable stylesheets are unsupported, stylesheets is an empty array and
 * cssText carries the concatenated raw CSS for <style> injection.
 */
export async function preloadResources(tag, styleUrls, templateUrl, inlineTemplate, inlineStyle) {
  let templateNode = null;
  let stylesheets = [];
  let cssTextAcc = '';
  let tagsDescriptor = null;

  // Compile / Fetch styles
  const urls = Array.isArray(styleUrls) ? styleUrls : (styleUrls ? [styleUrls] : []);
  
  await Promise.all(urls.map(async (url) => {
    if (assetCache.has(url)) {
      const cached = assetCache.get(url);
      if (supportsSheets) {
        stylesheets.push(cached);
      } else {
        cssTextAcc += cached + '\n';
      }
    } else {
      const css = await fetchTextResource(url, tag, 'style');
      if (css != null) {
        if (supportsSheets) {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          assetCache.set(url, sheet);
          stylesheets.push(sheet);
        } else {
          assetCache.set(url, css);
          cssTextAcc += css + '\n';
        }
      }
    }
  }));

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

  // Compile / Fetch Template markup
  if (templateUrl) {
    if (assetCache.has(templateUrl)) {
      templateNode = assetCache.get(templateUrl);
    } else {
      try {
        const html = await fetchTextResource(templateUrl, tag, 'template');
        if (html != null) {
          templateNode = createTemplateFragment(sanitizeTemplateHtml(html, tag));
          assetCache.set(templateUrl, templateNode);
        }
      } catch (err) {
        console.error(`Failed to fetch template resource for element ${tag}:`, err);
      }
    }

    // Fetch Tags Descriptor
    const tagsUrl = templateUrl.replace(/\.html$/, '.tags.json');
    if (assetCache.has(tagsUrl)) {
      tagsDescriptor = assetCache.get(tagsUrl);
    } else {
      try {
        const res = await fetch(tagsUrl);
        if (res.ok) {
          const raw = await res.json();
          tagsDescriptor = validateDescriptor(raw);
          assetCache.set(tagsUrl, tagsDescriptor);
        }
      } catch (_) {
        // Safe to ignore — not all elements have a tags descriptor
      }
    }
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
