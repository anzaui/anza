import { router } from '../../router/index.js';
import { element } from './element.js';
import { runSwapTransition } from '../transitions.js';

/**
 * High-performance declarative routing container factory.
 * Wraps ui.element with strict layout guard lifecycles and element-scoped view transitions.
 */
export function container(tag, spec, base = import.meta.url) {
  // Inject default contain: layout styling required for element-scoped View Transitions
  const containerStyle = ':host { contain: layout; display: block; }';
  spec.style = spec.style ? `${containerStyle}\n${spec.style}` : containerStyle;

  // Optional VT config on the container spec (same shape as dock).
  const transitionConfig = spec.transition === undefined ? true : spec.transition;
  delete spec.transition;

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
  if (ElementClass) {
    ElementClass.transitionConfig = transitionConfig;
    if (typeof transitionConfig === 'object' && transitionConfig?.name) {
      ElementClass.transitionName = transitionConfig.name;
    }

    if (!ElementClass.prototype.swapView) {
      ElementClass.prototype.swapView = async function(newElement, options = {}) {
        const nameAttr = this.getAttribute('name') || tag.toLowerCase();
        const transitionOpt = options.transition !== undefined
          ? options.transition
          : ElementClass.transitionConfig;

        return runSwapTransition(this, () => {
          this.replaceChildren(newElement);
        }, {
          direction: options.direction ?? 'push',
          dockName: nameAttr,
          name: options.name ?? ElementClass.transitionName,
          transition: transitionOpt,
          skip: options.skip,
          enabled: options.enabled,
          signal: options.signal
        });
      };
    }
  }
}
