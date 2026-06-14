/**
 * src/core/ui/defs/spec.js
 *
 * Shared translator. Converts the declarative `page`/`dock`/`view`/`part`
 * config shape (from definations.md) into the lower-level `element()` spec
 * shape (element.js), so the four definition helpers reuse one battle-tested
 * custom-element factory instead of each re-implementing props, resources,
 * shadow DOM, and update batching.
 *
 * Config shape (definations.md):
 *   {
 *     tag, props, query, methods,
 *     template: { html, css, shadow },
 *     on: { load, connect, disconnect, change, ...helpers }
 *   }
 *
 * Source: tasks.md Phase 6
 */

// Lifecycle hook names that map onto the factory's mount/unmount/update slots.
// Every other entry under `on` is installed as a plain instance method so a
// hook body can call `this.render()` etc.
const HOOKS = new Set(['load', 'connect', 'disconnect', 'change']);

/**
 * Collects the route-derived params currently set on an element, keyed by the
 * declared param names from the contract array.
 * Used to hand `on.load`/`on.connect` a `{ params }` bag.
 *
 * @param {HTMLElement} el
 * @param {Array<{name:string, cast:string}>} [paramDecls] - from spec.params
 * @param {object} [props] - legacy props map fallback
 */
function paramsOf(el, paramDecls, props) {
  // New contract: ordered array with first/last getters.
  if (Array.isArray(paramDecls) && paramDecls.length > 0) {
    const arr = paramDecls.map(({ name }) => el[name] ?? null);
    return makeAccessorArray(arr, paramDecls.map(d => d.name));
  }
  // Legacy fallback: collect from props keys.
  const out = {};
  if (props) {
    for (const key of Object.keys(props)) out[key] = el[key];
  }
  return out;
}

/**
 * Collects the route-derived query values currently set on an element.
 * Returns an ordered array with first/last getters.
 *
 * @param {HTMLElement} el
 * @param {Array<{name:string, cast:string}>} [queryDecls]
 */
function queryOf(el, queryDecls) {
  if (!Array.isArray(queryDecls) || queryDecls.length === 0) return [];
  const arr = queryDecls.map(({ name }) => el[name] ?? null);
  return makeAccessorArray(arr, queryDecls.map(d => d.name));
}

/**
 * Wraps a plain array with non-enumerable `first` and `last` getters and a
 * keyed named-accessor map so callers can use both positional and named access.
 *
 * @param {any[]} values
 * @param {string[]} names
 */
function makeAccessorArray(values, names) {
  const arr = [...values];
  Object.defineProperties(arr, {
    first: { get() { return arr[0] ?? null; }, enumerable: false },
    last:  { get() { return arr[arr.length - 1] ?? null; }, enumerable: false },
  });
  // Named getters: arr.slug === arr[0] if slug was the first param
  names.forEach((name, i) => {
    if (!(name in arr)) {
      Object.defineProperty(arr, name, {
        get() { return arr[i] ?? null; },
        enumerable: false,
      });
    }
  });
  return arr;
}

/**
 * Translates a declarative definition config into an `element()` spec.
 *
 * @param {object} config - the page/dock/view/part config.
 * @param {object} [opts]
 * @param {boolean} [opts.visual=false] - route updates through rAF when true.
 * @returns {object} a spec consumable by element().
 */
export function translate(config, opts = {}) {
  const spec = {};
  let html = null;
  let css = null;
  let shadow = 'open';

  if (config.template != null) {
    if (typeof config.template === 'object') {
      html = config.template.html;
      css = config.template.css;
      shadow = config.template.shadow ?? 'open';
    } else if (typeof config.template === 'string') {
      html = config.template;
    }
  }

  if (config.style != null) {
    css = config.style;
  }

  if (html != null) spec.template = html;
  if (css != null) spec.style = css;
  spec.mode = shadow === 'closed' ? 'closed' : 'open';
  if (shadow === false) {
    console.warn('[Native UI] Light DOM (shadow: false) is not supported by the element factory; falling back to open shadow root.');
  }

  if (config.props) spec.props = config.props;
  if (config.form) spec.form = config.form;

  // New contract: params and query are typed arrays — handled by page.js and
  // stored on the spec. No action needed here; intercept.js reads spec.params
  // and spec.query directly from specRegistry at navigation time.

  // Install all `on` entries (helpers + hooks) and explicit `methods` as
  // instance methods, so a hook body can call `this.<helper>()`.
  const on = config.on ?? {};
  const methods = { ...config.methods };
  for (const [name, fn] of Object.entries(on)) {
    if (typeof fn === 'function') methods[name] = fn;
  }
  if (Object.keys(methods).length) spec.methods = methods;

  // Map lifecycle hooks onto the factory's slots, invoking each with
  // `this` bound to the element and the lifecycle context as the argument.
  if (on.load || on.connect) {
    spec.mount = async (ctx) => {
      const el = ctx.el;
      if (on.load) {
        // Provide the full contract-aware context bag.
        // spec.params / spec.query are set by page.js before element() is called.
        const params = paramsOf(el, spec.params, config.props);
        const query  = queryOf(el, spec.query);
        await on.load.call(el, { params, query, raw: ctx.raw ?? null, ...ctx });
      }
      if (on.connect) {
        await on.connect.call(el, ctx);
      }
    };
  }

  if (on.disconnect) {
    spec.unmount = (ctx) => on.disconnect.call(ctx.el, ctx);
  }

  if (on.change) {
    const update = (ctx) => on.change.call(ctx.el, ctx);
    if (opts.visual) update.visual = true;
    spec.update = update;
  }

  return spec;
}
