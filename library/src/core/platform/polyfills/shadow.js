/**
 * core/platform/polyfills/shadow.js
 *
 * Declarative Shadow DOM polyfill converting template[shadowrootmode] elements
 * into native shadow roots. Runs automatically on DOM ready and supports manual invocation.
 * Source: doc 18 §4, library2.md §Phase 1-A
 */

export function apply(root = document) {
  const templates = root.querySelectorAll('template[shadowrootmode]');
  for (const tpl of templates) {
    const mode = tpl.getAttribute('shadowrootmode');
    const host = tpl.parentNode;
    if (!host || typeof host.attachShadow !== 'function') continue;

    // Native DSD (or prior polyfill pass) already attached — leave tree alone
    // so custom-element upgrade can adopt without wipe.
    if (host.shadowRoot) {
      tpl.remove();
      continue;
    }

    try {
      const shadow = host.attachShadow({ mode });
      shadow.appendChild(tpl.content);
      tpl.remove();
    } catch (err) {
      console.warn('Declarative Shadow DOM polyfill failed for host:', host, err);
    }
  }
}

// Auto-apply on DOM load completion
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => apply());
  } else {
    apply();
  }
}

export default apply;
