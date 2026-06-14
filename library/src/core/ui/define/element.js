import { BaseElement } from '../base.js';
import { scheduleFrame, yieldTask } from '../schedule.js';
import { router } from '../../router/index.js';
import { specRegistry, internalsMap, initializedMap, pendingUpdatesMap, updateScheduledMap, assetCache } from './state.js';
import { preloadResources, createTemplateFragment } from './utils.js';
import { createComponentContext } from './proxy.js';

// Platform lifecycle method names that must never be overridden by spec.methods.
const RESERVED = new Set([
  'connectedCallback', 'disconnectedCallback', 'attributeChangedCallback',
  'adoptedCallback', 'formAssociatedCallback', 'formDisabledCallback',
  'formResetCallback', 'formStateRestoreCallback',
  'mount', 'unmount', 'constructor'
]);

/**
 * High-performance declarative element factory.
 */
export function element(tag, spec, base) {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tag)) {
    return;
  }

  // Normalize prop shorthand (e.g. `count: 0`) into full configs before use.
  if (spec.props) {
    spec.props = normalizeProps(spec.props);
  }

  // Cache element spec for automated layout orchestration and diffing
  specRegistry.set(tag.toLowerCase(), spec);

  // Automatically register elements with the route matcher if a url pattern is specified
  if (spec.url) {
    const meta = { ...spec.meta, container: spec.container };
    router.register(spec.url, tag, meta);
  }

  // Define properties to watch and their Symbol backing store keys (R-01)
  const propKeys = spec.props ? Object.keys(spec.props) : [];
  const observedAttrs = propKeys.map(k => k.toLowerCase());
  const store = {};
  for (const key of propKeys) {
    store[key] = Symbol(key);
  }

  // Warn loudly when a relative asset is given without a base — otherwise the
  // resource would silently fail to load (U2).
  warnMissingBase(tag, 'style', spec.style, base);
  warnMissingBase(tag, 'template', spec.template, base);

  const isStyleUrl = s => typeof s === 'string' && (s.endsWith('.css') || ((s.startsWith('./') || s.startsWith('/')) && !s.startsWith('/*') && !s.includes('{')));
  const isTemplateUrl = s => typeof s === 'string' && (s.endsWith('.html') || ((s.startsWith('./') || s.startsWith('/')) && !s.startsWith('<!--') && !s.includes('<')));

  // Resolve absolute URLs relative to import.meta.url (base)
  const styleUrls = Array.isArray(spec.style) 
    ? spec.style.filter(s => s && base && isStyleUrl(s)).map(s => new URL(s, base).href)
    : (spec.style && base && isStyleUrl(spec.style)
      ? [new URL(spec.style, base).href]
      : []);
      
  const templateUrl = spec.template && base && isTemplateUrl(spec.template)
    ? new URL(spec.template, base).href
    : null;

  // Defer resource preloading until first mount or HMR rebind for cold-start performance
  const hasUrls = (styleUrls.length > 0) || (templateUrl !== null);
  let resolved = null;
  let resourcesPromise = null;

  const getResources = () => {
    if (!resourcesPromise) {
      resourcesPromise = preloadResources(tag, styleUrls, templateUrl, spec.template, spec.style).then(res => {
        resolved = res;
        return res;
      });
    }
    return resourcesPromise;
  };

  const isLazy = spec.lazy === true && hasUrls;

  if (!isLazy) {
    if (!hasUrls) {
      // Compile synchronously immediately to support synchronous connectedCallback (unit tests and static components)
      const supportsSheets =
        typeof CSSStyleSheet !== 'undefined' &&
        'adoptedStyleSheets' in Document.prototype &&
        'adoptedStyleSheets' in ShadowRoot.prototype;

      let templateNode = null;
      let stylesheets = [];
      let cssTextAcc = '';

      if (spec.template) {
        templateNode = createTemplateFragment(spec.template);
      }
      if (spec.style) {
        const inlineStyles = Array.isArray(spec.style) ? spec.style : [spec.style];
        for (const style of inlineStyles) {
          if (supportsSheets) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(style);
            stylesheets.push(sheet);
          } else {
            cssTextAcc += style + '\n';
          }
        }
      }
      resolved = {
        templateNode,
        stylesheets,
        cssText: cssTextAcc.trim() ? cssTextAcc : null,
        tagsDescriptor: null
      };
      resourcesPromise = Promise.resolve(resolved);
    } else {
      // Start eager preloading immediately
      getResources();
    }
  }

  // Handle hot reloading of constructable stylesheets (one global listener per unique styleUrl - R-05)
  if (styleUrls.length > 0 && typeof window !== 'undefined') {
    if (!window.__native_hmr_listeners__) {
      window.__native_hmr_listeners__ = new Set();
    }
    for (const styleUrl of styleUrls) {
      if (!window.__native_hmr_listeners__.has(styleUrl)) {
        window.__native_hmr_listeners__.add(styleUrl);
        const hmrHandler = async (e) => {
          const { path: changedPath, css } = e.detail;
          const absoluteChangedUrl = new URL(changedPath, window.location.origin).href;
          
          if (styleUrl === absoluteChangedUrl || styleUrl.endsWith(changedPath)) {
            const sheet = assetCache.get(styleUrl);
            if (sheet && typeof sheet.replaceSync === 'function') {
              sheet.replaceSync(css);
              console.log(`[HMR] Shared AdoptedStyleSheet hot-swapped for <${tag}>`);
            }
          }
        };
        window.addEventListener('anza:hmr:css', hmrHandler);
      }
    }
  }

  // Handle hot reloading of HTML templates
  if (templateUrl && typeof window !== 'undefined') {
    if (!window.__native_hmr_html_listeners__) {
      window.__native_hmr_html_listeners__ = new Set();
    }
    if (!window.__native_hmr_html_listeners__.has(templateUrl)) {
      window.__native_hmr_html_listeners__.add(templateUrl);
      const hmrHandler = async (e) => {
        const { path: changedPath, html } = e.detail;
        const absoluteChangedUrl = new URL(changedPath, window.location.origin).href;
        
        if (templateUrl === absoluteChangedUrl || templateUrl.endsWith(changedPath)) {
          // Re-parse HTML into the cached resolved object
          resourcesPromise = preloadResources(tag, styleUrls, null, html, spec.style).then(res => {
            resolved = res;
            // Now re-bind instances!
            const instances = window.__native_hmr_instances__?.get(tag) || [];
            for (const instance of instances) {
              if (instance.__hmr_rebind) instance.__hmr_rebind();
            }
            console.log(`[HMR] Template hot-swapped for <${tag}>`);
            return res;
          });
        }
      };
      window.addEventListener('anza:hmr:html', hmrHandler);
    }
  }

  class DeclarativeElement extends BaseElement {
    static observedAttributes = observedAttrs;

    constructor() {
      super();
      this.attachShadow({ mode: spec.mode || 'open' });
      
      initializedMap.set(this, false);
      pendingUpdatesMap.set(this, new Map());
      updateScheduledMap.set(this, false);

      if (typeof window !== 'undefined') {
        if (!window.__native_hmr_instances__) window.__native_hmr_instances__ = new Map();
        if (!window.__native_hmr_instances__.has(tag)) window.__native_hmr_instances__.set(tag, new Set());
      }

      if (spec.form) {
        const internals = this.attachInternals();
        internalsMap.set(this, internals);
      }

      // Initialize default properties backing store dynamically (R-01)
      if (spec.props) {
        for (const [key, config] of Object.entries(spec.props)) {
          const sym = store[key];
          const attrName = key.toLowerCase();
          let initial = config.default;
          if (config.type === Boolean) {
            initial = this.hasAttribute(attrName);
          } else {
            const attrVal = this.getAttribute(attrName);
            if (attrVal !== null) {
              initial = config.type === Number ? Number(attrVal) : attrVal;
            }
          }
          this[sym] = initial ?? (config.type === Boolean ? false : null);
        }
      }
    }

    async connectedCallback() {
      // AbortController bootstrap inside BaseElement
      super.connectedCallback();
      
      if (typeof window !== 'undefined') {
        window.__native_hmr_instances__?.get(tag)?.add(this);
      }
      
      // Wait for resolved resources to compile (synchronously if already cached)
      let res = resolved;
      if (!res) {
        res = await getResources();
      }
      const { templateNode, stylesheets, cssText, tagsDescriptor } = res;

      if (!this.ctrl || this.ctrl.signal.aborted || !this.isConnected) {
        return;
      }

      if (typeof document !== 'undefined' && document.readyState === 'loading') {
        await yieldTask();
        if (!this.ctrl || this.ctrl.signal.aborted || !this.isConnected) {
          return;
        }
      }

      if (templateNode && this.shadowRoot.childNodes.length === 0) {
        this.shadowRoot.appendChild(templateNode.cloneNode(true));
      }

      if (stylesheets && stylesheets.length > 0) {
        // Constructable stylesheets path
        this.shadowRoot.adoptedStyleSheets = stylesheets;
      } else if (cssText) {
        // Fallback: inject <style> for browsers without adoptedStyleSheets
        const style = document.createElement('style');
        style.textContent = cssText;
        this.shadowRoot.prepend(style);
      }
      
      const context = createComponentContext({
        el: this,
        shadowRoot: this.shadowRoot,
        ctrl: this.ctrl,
        descriptor: tagsDescriptor,
        internals: internalsMap.get(this)
      });

      this._ctx = context;
      this._tags = context.tags;
      this._on = context.on;
      this._refs = context.refs;
      this._watch = context.watch;

      initializedMap.set(this, true);

      // Mount hook trigger passed with unified AbortController signal
      if (spec.mount) {
        try {
          const res = spec.mount(context);
          if (res instanceof Promise) {
            res.catch((err) => {
              console.error('[Native UI] mount failed:', err);
            });
          }
        } catch (err) {
          console.error('[Native UI] mount failed:', err);
        }
      }
    }

    disconnectedCallback() {
      if (typeof window !== 'undefined') {
        window.__native_hmr_instances__?.get(tag)?.delete(this);
      }
      if (spec.unmount) {
        spec.unmount({ 
          el: this, 
          tags: this._tags,
          refs: this._refs,
          watch: this._watch,
          internals: internalsMap.get(this) 
        });
      }
      super.disconnectedCallback();
    }

    async __hmr_rebind() {
      // 1. Unmount component safely
      if (spec.unmount) {
        spec.unmount({ 
          el: this, 
          tags: this._tags,
          refs: this._refs,
          watch: this._watch,
          internals: internalsMap.get(this) 
        });
      }

      // 2. Clear Shadow DOM
      this.shadowRoot.innerHTML = '';
      
      // 3. Clone new template
      let res = resolved;
      if (!res) {
        res = await getResources();
      }
      const { templateNode, stylesheets, cssText, tagsDescriptor } = res;

      if (templateNode) {
        this.shadowRoot.appendChild(templateNode.cloneNode(true));
      }
      if (stylesheets && stylesheets.length > 0) {
        this.shadowRoot.adoptedStyleSheets = stylesheets;
      } else if (cssText) {
        const style = document.createElement('style');
        style.textContent = cssText;
        this.shadowRoot.prepend(style);
      }
      
      // 4. Recreate component context to rebind DOM events and tags
      const context = createComponentContext({
        el: this,
        shadowRoot: this.shadowRoot,
        ctrl: this.ctrl,
        descriptor: tagsDescriptor,
        internals: internalsMap.get(this)
      });
      this._ctx = context;
      this._tags = context.tags;
      this._on = context.on;
      this._refs = context.refs;
      this._watch = context.watch;
      
      // 5. Trigger mount again
      if (spec.mount) {
        try {
          const mountRes = spec.mount(context);
          if (mountRes instanceof Promise) {
            mountRes.catch(console.error);
          }
        } catch (err) {
          console.error('[Native UI] mount failed during HMR:', err);
        }
      }
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;

      // Find the camelCase property matching lowercase attribute name
      const key = propKeys.find(k => k.toLowerCase() === name);
      if (!key) return;

      const config = spec.props[key];
      let castedVal = newVal;

      if (config.type === Boolean) {
        castedVal = newVal !== null;
      } else if (config.type === Number) {
        castedVal = newVal !== null ? Number(newVal) : (config.default ?? 0);
      }

      // Sync property to trigger update callback and schedule updates
      if (this[key] !== castedVal) {
        this[key] = castedVal;
      }
    }

    // Form-associated lifecycle callbacks — mapped from short spec hook names
    formAssociatedCallback(form) {
      spec.associated?.call(this, form);
    }

    formDisabledCallback(value) {
      spec.disabled?.call(this, value);
    }

    formResetCallback() {
      spec.reset?.call(this);
    }

    formStateRestoreCallback(state, mode) {
      spec.restore?.call(this, state, mode);
    }
  }

  // 1. Install spec.methods onto the prototype before define (§1.1)
  if (spec.methods) {
    for (const [name, fn] of Object.entries(spec.methods)) {
      if (RESERVED.has(name) || name in DeclarativeElement.prototype) {
        console.warn(`[Native UI] Method "${name}" conflicts with an existing or reserved name on <${tag}>. Skipping.`);
        continue;
      }

      Object.defineProperty(DeclarativeElement.prototype, name, {
        value: fn,
        writable: false,
        configurable: true,
        enumerable: false
      });
    }
  }

  // 2. Generate type-safe getter/setters dynamically on class prototype (R-01)
  for (const key of propKeys) {
    const config = spec.props[key];
    const attrName = key.toLowerCase();
    const sym = store[key];
    // reflect defaults to true for back-compatibility (§1.2)
    const reflect = config.reflect !== false;

    Object.defineProperty(DeclarativeElement.prototype, key, {
      get() {
        return this[sym];
      },
      set(val) {
        const oldVal = this[sym];
        if (oldVal === val) return;

        this[sym] = val;

        // Attribute reflection — only when reflect !== false (§1.2)
        if (reflect) {
          if (config.type === Boolean) {
            if (val) {
              if (!this.hasAttribute(attrName)) this.setAttribute(attrName, '');
            } else {
              if (this.hasAttribute(attrName)) this.removeAttribute(attrName);
            }
          } else if (val === null || val === undefined) {
            if (this.hasAttribute(attrName)) this.removeAttribute(attrName);
          } else {
            const strVal = String(val);
            if (this.getAttribute(attrName) !== strVal) {
              this.setAttribute(attrName, strVal);
            }
          }
        }

        // Custom state synchronization (:state(name))
        const internals = internalsMap.get(this);
        if (config.state && internals?.states) {
          if (val) {
            internals.states.add(key);
          } else {
            internals.states.delete(key);
          }
        }

        // Schedule batched updates via cooperative microtask scheduling
        const initialized = initializedMap.get(this);
        if (initialized && spec.update) {
          const pendingUpdates = pendingUpdatesMap.get(this);
          pendingUpdates.set(key, { val, old: oldVal });
          if (!updateScheduledMap.get(this)) {
            updateScheduledMap.set(this, true);
            
            // Choose queueMicrotask or scheduleFrame depending on update.visual hint (R-03)
            const flush = (spec.update.visual === true)
              ? (fn) => scheduleFrame(fn)
              : (fn) => queueMicrotask(fn);
              
            flush(() => {
              if (!this.ctrl || this.ctrl.signal.aborted || !this.isConnected) {
                pendingUpdates.clear();
                updateScheduledMap.set(this, false);
                return;
              }

              const changes = Array.from(pendingUpdates.entries());
              pendingUpdates.clear();
              updateScheduledMap.set(this, false);

              for (const [name, { val: v, old: o }] of changes) {
                spec.update({ 
                  el: this, 
                  ctrl: this.ctrl,
                  tags: this._tags,
                  on: this._on,
                  refs: this._refs,
                  watch: this._watch,
                  name, 
                  val: v, 
                  old: o,
                  prev: o 
                });
              }
            });
          }
        }
      }
    });
  }

  // 3. Form association
  if (spec.form) {
    Object.defineProperty(DeclarativeElement, 'formAssociated', {
      value: true,
      writable: false
    });
  }

  // Define element globally
  customElements.define(tag, DeclarativeElement);
}

/**
 * Normalizes prop definitions, expanding shorthand literals into full configs.
 * `count: 0` -> `count: { type: Number, default: 0 }`. Object configs that
 * already declare `type` are passed through unchanged.
 */
function normalizeProps(props) {
  const out = {};
  for (const [key, value] of Object.entries(props)) {
    if (value && typeof value === 'object' && 'type' in value) {
      out[key] = value;
      continue;
    }
    let type = String;
    if (typeof value === 'boolean') type = Boolean;
    else if (typeof value === 'number') type = Number;
    out[key] = { type, default: value };
  }
  return out;
}

/**
 * Warns when a relative `template`/`style` is supplied without a base URL,
 * which would otherwise silently fail to resolve.
 */
function warnMissingBase(tag, field, value, base) {
  if (!base && typeof value === 'string' && (value.startsWith('./') || value.startsWith('../'))) {
    console.error(
      `[Native UI] <${tag}> ${field} "${value}" is relative but no base was given. ` +
      `Pass import.meta.url as the third argument to ui.element(...).`
    );
  }
}
