import { router } from '../../router/index.js';
import { specRegistry } from './state.js';

let dispose = null; // One-word module-level disposer variable (RT-11)

/**
 * Initializes the global routing orchestrator.
 * Listens for navigation found events and dynamically updates layout containers.
 */
export function initOrchestrator() {
  if (typeof window !== 'undefined') {
    dispose?.();
    dispose = router.on('found', async ({ tag, params, query, hash, chain, via, container, direction }) => {
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
        return;
      }

      // Use Advanced Container Registry lookup instead of blind DOM query.
      // The interceptor's cascade has already ensured the chain is mounted.
      const containerEl = router.getContainer(target);
      if (!containerEl) {
        console.warn(`Target container "${target}" not found in DOM for element <${topTag}>`);
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

      // Layout-preserving diffing: Sync parameters reactively if the element is already mounted
      const currentChild = containerEl.querySelector('.page-content');
      if (currentChild && currentChild.tagName.toLowerCase() === topTag.toLowerCase()) {
        for (const [key, value] of Object.entries(props)) {
          currentChild[key] = value;
        }
        return;
      }

      // Instantiate the new declarative page element
      const pageEl = document.createElement(topTag);
      pageEl.classList.add('page-content');
      for (const [key, value] of Object.entries(props)) {
        pageEl[key] = value;
      }

      // Delegated UI Swap: If the container implements swapView, let it handle the DOM transitions
      if (typeof containerEl.swapView === 'function') {
        await containerEl.swapView(pageEl, { params: props, direction });
      } else {
        // Fallback to standard atomic replace
        containerEl.replaceChildren(pageEl);
      }
    });
  }
}

export function destroyOrchestrator() {
  dispose?.();
  dispose = null;
}
