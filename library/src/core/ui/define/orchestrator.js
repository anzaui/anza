import { router } from '../../router/index.js';
import { specRegistry } from './state.js';
import { endLoading, replaceKeepingLoading, waitForPageReady } from '../../router/loading.js';

let dispose = null; // One-word module-level disposer variable (RT-11)

/**
 * Find an already-mounted page leaf among a dock/container's direct children.
 *
 * Soft-nav marks leaves with `.page-content`. SSG / Mode B HTML ships the same
 * custom tag without that class — prefer the class when present on a direct
 * child, else match by tag among direct children so boot/`direction: 'load'`
 * adopts pre-rendered DSD instead of wiping it. Never deep-query nested tags.
 *
 * @param {Element} containerEl
 * @param {string} topTag
 * @returns {Element|null}
 */
function findMountedPage(containerEl, topTag) {
  const want = topTag.toLowerCase();
  // Direct children only (same spirit as cascade findChildByTag) — never
  // adopt a deep nested match that happens to share the leaf tag.
  let byTag = null;
  for (const child of containerEl.children) {
    if (child.tagName.toLowerCase() !== want) continue;
    if (child.classList.contains('page-content')) return child;
    if (!byTag) byTag = child;
  }
  return byTag;
}

/**
 * Initializes the global routing orchestrator.
 * Listens for navigation found events and dynamically updates layout containers.
 *
 * Contract (SSG-SEO Phase 2 — Client navigations):
 * - Full load / hard refresh: SSG (or Mode B) HTML is already in the document;
 *   reuse a matching leaf tag (adopt DSD) — do not blank-flash by recreating it.
 * - Soft-nav to a different leaf: createElement + swapView/replaceChildren (CSR
 *   mount of the new page). Parent docks stay mounted with their adopted trees.
 */
export function initOrchestrator() {
  if (typeof window !== 'undefined') {
    dispose?.();
    dispose = router.on('found', async ({ tag, params, query, hash, chain, via, container, direction, _loading }) => {
      // Resolve the top-level layout element in the chain
      const topTag = chain && chain.length > 0 ? chain[0].tag : tag;
      const topParams = chain && chain.length > 0 ? chain[0].params : params;

      // RT-13: Async hydration gate — await custom element definition before mounting
      if (typeof customElements !== 'undefined' && topTag.includes('-') && !customElements.get(topTag)) {
        await customElements.whenDefined(topTag);
      }

      const spec = specRegistry.get(topTag.toLowerCase());
      // Resolve the render target: the last container in the `via` chain, or
      // the legacy single `container`. Without either there is nothing to mount.
      const target = container ?? ((Array.isArray(spec?.via) && spec.via.length)
        ? spec.via[spec.via.length - 1]
        : spec?.container);
      if (!spec || !target) {
        console.warn('[Orchestrator] Early return: missing spec or target');
        if (_loading?.host) endLoading(_loading.host, _loading.gen);
        return;
      }

      // Use Advanced Container Registry lookup instead of blind DOM query.
      // The interceptor's cascade has already ensured the chain is mounted.
      const containerEl = router.getContainer(target);
      if (!containerEl) {
        console.warn(
          `[Orchestrator] Container "${target}" is not mounted — cannot render <${topTag}>.\n` +
          `Make sure dock('${target}', { parent: '...' }) is declared and imported before this page.\n` +
          `Full via chain expected: ${JSON.stringify(spec?.via ?? [])}`
        );
        if (_loading?.host) endLoading(_loading.host, _loading.gen);
        return;
      }

      const props = {};

      // 1. Cast params
      for (const [key, val] of Object.entries(topParams)) {
        let casted = val;
        if (spec.props && spec.props[key]) {
          const type = spec.props[key].type;
          if (type === Boolean) {
            casted = val === 'true' || val === '1' || val === '';
          } else if (type === Number) {
            const num = Number(val);
            casted = isNaN(num) ? 0 : num;
          }
        }
        props[key] = casted;
      }

      // 2. Map query params
      if (spec.query && Array.isArray(spec.query) && query) {
        for (const key of spec.query) {
          const val = query[key];
          if (val !== undefined) {
            let casted = val;
            if (spec.props && spec.props[key]) {
              const type = spec.props[key].type;
              if (type === Boolean) {
                casted = val === 'true' || val === '1' || val === '';
              } else if (type === Number) {
                const num = Number(val);
                casted = isNaN(num) ? 0 : num;
              }
            }
            props[key] = casted;
          }
        }
      }

      // 3. Map hash property
      if (spec.props && spec.props.hash && hash !== undefined) {
        props.hash = hash;
      }

      // Same leaf already in the dock (SSG adopt on load, or soft-nav param update):
      // keep the instance — never swapView/replaceChildren over adopted DSD.
      const currentChild = findMountedPage(containerEl, topTag);
      if (currentChild) {
        currentChild.classList.add('page-content');
        for (const [key, value] of Object.entries(props)) {
          currentChild[key] = value;
        }
        if (_loading?.host) endLoading(_loading.host, _loading.gen);
        return;
      }

      // Soft-nav (or CSR boot without SSG leaf): instantiate and swap the leaf only.
      const pageEl = document.createElement(topTag);
      pageEl.classList.add('page-content');
      for (const [key, value] of Object.entries(props)) {
        pageEl[key] = value;
      }

      // Delegated UI Swap: If the container implements swapView, let it handle the DOM transitions.
      // Both paths must preserve `.dock-loading` until waitForPageReady completes.
      if (typeof containerEl.swapView === 'function') {
        await containerEl.swapView(pageEl, { params: props, direction });
      } else {
        replaceKeepingLoading(containerEl, pageEl);
      }

      await waitForPageReady(pageEl);
      if (_loading?.host) endLoading(_loading.host, _loading.gen);
    });
  }
}

export function destroyOrchestrator() {
  dispose?.();
  dispose = null;
}
