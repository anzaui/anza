import { router } from '../../router/index.js';
import { element } from './element.js';

/**
 * High-performance declarative routing container factory.
 * Wraps ui.element with strict layout guard lifecycles and element-scoped view transitions.
 */
export function container(tag, spec, base = import.meta.url) {
  // Inject default contain: layout styling required for element-scoped View Transitions
  const containerStyle = ':host { contain: layout; display: block; }';
  spec.style = spec.style ? `${containerStyle}\n${spec.style}` : containerStyle;

  // Intercept mount to strictly register the singleton layout container
  const originalMount = spec.mount;
  spec.mount = (ctx) => {
    const el = ctx.el;
    const name = el.getAttribute('name') || tag.toLowerCase();

    // Singleton guard: Reject duplicate registration instantly
    const existing = router.getContainer(name);
    if (existing && existing !== el) {
      throw new Error(`ContainerError: Singleton violation — '${name}' is already mounted. A second instance cannot register while the first is active.`);
    }

    router.registerContainer(name, el);
    if (originalMount) originalMount(ctx);
  };

  // Intercept unmount to safely unregister the layout container
  const originalUnmount = spec.unmount;
  spec.unmount = (ctx) => {
    const el = ctx.el;
    const name = el.getAttribute('name') || tag.toLowerCase();
    router.unregisterContainer(name, el);

    if (originalUnmount) originalUnmount(ctx);
  };

  // Define the base element using the standard declarative factory
  element(tag, spec, base);

  // Dynamically inject the Delegated Swap Interface for route transitions
  const ElementClass = customElements.get(tag);
  if (ElementClass && !ElementClass.prototype.swapView) {
    ElementClass.prototype.swapView = async function(newElement, options = {}) {
      const { direction = 'push' } = options;

      // Apply directional transition hint via CSS custom property
      this.dataset.transitionDirection = direction;

      const doSwap = () => {
        this.replaceChildren(newElement);
        delete this.dataset.transitionDirection;
      };

      // Only use element-scoped view transitions. Document-level
      // startViewTransition() captures the entire page and causes
      // chrome flicker — never use it as a fallback.
      if (typeof this.startViewTransition === 'function') {
        try {
          const vt = this.startViewTransition(doSwap);
          await vt.ready;
        } catch (err) {
          if (err?.name !== 'AbortError') console.warn('[UI Container] Scoped VT aborted:', err);
        }
        return;
      }

      doSwap();
    };
  }
}
