# Native UI Usage Guide

The Native UI layer defines custom elements with Shadow DOM, lifecycle-owned cleanup, cached template anchors, delegated events, scoped mutation watching, observer wrappers, scheduler helpers, View Transitions, and cached template fragments.

Status: this guide documents the implemented public UI contract: `ui.define`, `ui.element`, `ui.container`, props, `reflect`, `methods`, `refs`, `tags`, delegated `on`, `watch`, `ui.schedule`, `ui.scheduleFrame`, `ui.yield`, `ui.observe`, `ui.transition`, `ui.template`, form-associated elements, generated `.tags.json` descriptors, generated `routes.json`, and TypeScript component typing.

Import from the UI entry point:

```javascript
import { ui } from '@anzaui/anza/ui';
```

## 1. Choosing an API

| Need | Use |
| --- | --- |
| Declarative component | `ui.element` |
| Router-owned layout slot | `ui.container` |
| Existing custom element class | `ui.define` |
| Stable template anchor | `refs` |
| Cached selector lookup | `tags` |
| Delegated event binding | `on` |
| Shadow-root mutation watching | `watch` |
| Raw platform observer | `ui.observe` |
| Deferred or priority work | `ui.schedule` |
| Frame-synced DOM work | `ui.scheduleFrame` |
| Cooperative loop pause | `ui.yield` |
| Visible DOM swap | `ui.transition` |
| Reusable fragment | `ui.template` |

## 2. Component Shape

Use `ui.element` for components, pages, and primitives.

```javascript
ui.element('ui-counter', {
  template: './index.html',
  style: './style.css',

  props: {
    count: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false, state: true },
    label: { type: String, default: 'Count' }
  },

  mount({ el, refs, on }) {
    refs.label.textContent = el.label;

    on.click('button', () => {
      if (el.disabled) return;
      el.count++;
    });
  },

  update({ el, name, val, prev, refs }) {
    if (name === 'count') {
      refs.value.textContent = String(val);
      refs.value.dataset.prev = String(prev);
    }

    if (name === 'disabled') {
      refs.button.disabled = val;
    }
  },

  unmount({ refs }) {
    refs.value.textContent = '';
  }
}, import.meta.url);
```

Always pass `import.meta.url` as the third argument when `template` or `style` is a relative path. If a relative `template`/`style` is given without a base, the element logs an error (the resource would otherwise silently fail to load).

### Prop shorthand

Props accept a shorthand: a literal default whose type is inferred. Use the full
object form only when you need `state`, `reflect`, or an explicit `type`.

```javascript
ui.element('ui-counter', {
  props: {
    count: 0,            // -> { type: Number, default: 0 }
    label: 'Count',      // -> { type: String, default: 'Count' }
    open: false,         // -> { type: Boolean, default: false }
    selected: { type: Boolean, default: false, state: true } // full form
  }
});
```

### Splitting a component across files

Because the toolchain resolves the full import graph, keep `index.js` small and
import lifecycle/logic from sibling modules with plain ESM — the imported files
are emitted into `dist/` automatically. (No special spec field is needed.)

```javascript
// counter/logic.js
export function mount({ el, on }) {
  on.click('button', () => el.count++);
}
export function update({ name, val, refs }) {
  if (name === 'count') refs.value.textContent = String(val);
}

// counter/index.js
import { ui } from '../../core/ui/index.js';
import { mount, update } from './logic.js';

ui.element('ui-counter', {
  template: './index.html',
  style: './style.css',
  props: { count: 0 },
  mount,
  update
}, import.meta.url);
```

Component methods can be installed on the generated element prototype.

```javascript
ui.element('ui-counter', {
  props: {
    count: { type: Number, default: 0 }
  },

  methods: {
    increment() {
      this.count++;
    }
  },

  mount({ el, on }) {
    on.click('button', () => el.increment());
  }
});
```

Rules:

- Methods run with `this` set to the host element.
- Methods are installed before `customElements.define`.
- Reserved lifecycle names such as `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`, `mount`, and `unmount` are skipped with a warning.
- Methods are prototype methods, not per-instance bound functions.

## 3. Component Files

Keep component files together.

```text
src/elements/primitives/button/
  index.js
  index.html
  index.tags.json
  style.css
```

`index.js` registers the element.

```javascript
import { ui } from '../../../core/ui/index.js';

ui.element('ui-button', {
  template: './index.html',
  style: './style.css',
  props: {
    disabled: { type: Boolean, default: false, state: true }
  }
}, import.meta.url);
```

`index.html` contains the shadow template.

```html
<button ref="button" id="button" type="button">
  <slot></slot>
</button>
<span ref="status" hidden></span>
```

`style.css` contains component-scoped styles adopted into the shadow root.

```css
:host {
  display: inline-block;
}

button:disabled {
  opacity: 0.5;
}
```

## 4. Lifecycle Context

`mount` receives a stable context for the current connection lifecycle.

```javascript
mount({
  el,
  ctrl,
  tags,
  on,
  refs,
  watch,
  internals
}) {}
```

`update` receives the same helpers plus the changed property.

```javascript
update({
  el,
  ctrl,
  tags,
  on,
  refs,
  watch,
  internals,
  name,
  val,
  prev,
  old
}) {}
```

`unmount` receives cleanup-friendly helpers.

```javascript
unmount({
  el,
  tags,
  refs,
  watch,
  internals
}) {}
```

Rules:

- `el` is the host custom element.
- `ctrl` is an `AbortController` created on connect and aborted on disconnect.
- `refs`, `tags`, `on`, and `watch` are scoped to the component shadow root.
- `internals` is available when `form: true` is set.
- Do not store lifecycle context globally.

## 5. Props

Props define reflected element properties and observed attributes.

```javascript
props: {
  open: { type: Boolean, default: false, state: true },
  count: { type: Number, default: 0 },
  label: { type: String, default: 'Untitled' },
  cache: { type: String, default: '', reflect: false }
}
```

Supported types:

- `Boolean`: present attribute is `true`; missing attribute is `false`.
- `Number`: attribute value is cast with `Number(...)`.
- `String`: attribute value is used as text.

Boolean example:

```javascript
el.open = true;
el.hasAttribute('open'); // true

el.open = false;
el.hasAttribute('open'); // false
```

Number and string example:

```javascript
el.count = 3;
el.getAttribute('count'); // "3"

el.label = 'Ready';
el.getAttribute('label'); // "Ready"
```

Use `state: true` to mirror truthy values into `ElementInternals.states` when supported.

```javascript
props: {
  selected: { type: Boolean, default: false, state: true }
}
```

Reflection defaults to enabled. Set `reflect: false` when a property should stay internal.

```javascript
props: {
  label: { type: String, default: '', reflect: true },
  token: { type: String, default: '', reflect: false }
}
```

Rules:

- `reflect: true` writes property changes to attributes.
- `reflect: false` keeps property writes off attributes.
- Attribute changes still update observed properties.

## 6. Updates

Updates are batched after initialization.

```javascript
update({ name, val, prev, refs }) {
  if (name === 'label') {
    refs.label.textContent = val;
  }

  if (name === 'count') {
    refs.count.textContent = String(val);
    refs.count.dataset.prev = String(prev);
  }
}
```

By default, updates flush in a microtask. If the update is visual and should wait for a frame, mark the update function:

```javascript
function update(ctx) {
  ctx.refs.panel.hidden = !ctx.el.open;
}

update.visual = true;

ui.element('ui-panel', {
  props: {
    open: { type: Boolean, default: false }
  },
  update
});
```

Rules:

- Keep `update` idempotent.
- Branch on `name`.
- Use `val` for the new value.
- Use `prev` or `old` for the previous value.
- Prefer property writes, `textContent`, attributes, and class lists.

## 7. Templates

External HTML templates are fetched once per component registration and cloned per instance.

```javascript
ui.element('ui-card', {
  template: './index.html',
  style: './style.css'
}, import.meta.url);
```

Inline templates are also supported.

```javascript
ui.element('ui-dot', {
  template: '<span ref="dot" part="dot"></span>',
  style: ':host { display: inline-block; }'
});
```

Rules:

- Use external files for reusable elements.
- Use inline templates only for tiny internal elements.
- Assign dynamic data through DOM APIs after mount.
- Avoid `innerHTML` for user data.

## 8. Refs

Use `ref="name"` for stable anchors that component code needs often.

```html
<button ref="button" type="button"></button>
<span ref="label"></span>
```

Access refs in lifecycle hooks:

```javascript
mount({ refs }) {
  refs.button.disabled = false;
  refs.label.textContent = 'Ready';
}
```

Rules:

- `refs.name` is a direct element reference.
- Missing refs are `undefined`.
- Duplicate refs warn and the first match wins.
- Refs are frozen for the current mount lifecycle.
- Use refs for stable anchors, not repeated dynamic list items.

## 9. Tags

`tags` is a cached selector helper scoped to the shadow root.

```javascript
mount({ tags }) {
  const button = tags.one('button');
  const items = tags.all('[data-item]');

  tags.each('[data-item]', (item, index) => {
    item.dataset.index = String(index);
  });
}
```

Methods:

```javascript
tags.one(selector)       // Element | null
tags.all(selector)       // Element[]
tags.each(selector, fn)  // void
tags.has(selector)       // boolean
tags.clear()             // void
```

Rules:

- Use `refs` when an element has a stable name.
- Use `tags` for selector-based access.
- `tags.one` and `tags.all` have separate caches.
- The cache clears when direct shadow children change.
- Call `tags.clear()` after structural changes that the automatic invalidation cannot see.

## 10. Delegated Events

`on` binds delegated event handlers to the shadow root and cleans up with `ctrl.signal`.

```javascript
mount({ on }) {
  on.click('button', (event, button) => {
    button.classList.add('active');
  });

  on.input('input[type="search"]', (event, input) => {
    filter(input.value);
  });

  on.submit('form', (event, form) => {
    event.preventDefault();
    save(new FormData(form));
  });

  on['nav:change']('[data-tab]', (event, tab) => {
    activate(tab.dataset.tab);
  });
}
```

Handler shape:

```javascript
(event, matchedElement) => void
```

Supported call shapes:

```javascript
on.click(selector, handler)
on.click(selector, handler, ctrl.signal)
on.click(selector, handler, { signal: ctrl.signal, passive: false })
on.click(selector, handler, { once: true })
on.click.once(selector, handler)
on.click.once(selector, handler, ctrl.signal)
```

Rules:

- Events are delegated, so dynamically added matching children work.
- The matched element is found with `closest(selector)`.
- Invalid selectors warn and do not throw.
- Handlers are passive by default unless `passive: false` is passed.
- Use `passive: false` when calling `preventDefault()`.
- The returned disposer removes only that binding.

Example with a disposer:

```javascript
mount({ on }) {
  const stop = on.click('.remove', remove);
  stop();
}
```

## 11. Raw Events

Use raw platform events when delegation is not the right shape.

```javascript
mount({ refs, ctrl }) {
  refs.scroller.addEventListener('scroll', onScroll, {
    signal: ctrl.signal,
    passive: true
  });

  refs.video.addEventListener('loadedmetadata', onLoad, {
    signal: ctrl.signal
  });
}
```

Use raw events for:

- `scroll`
- media events
- global `window` or `document` events
- non-bubbling events that delegation cannot catch cleanly

Always pass `ctrl.signal` or another abort signal.

## 12. Watch

`watch` observes mutations inside the component shadow root.

```javascript
mount({ refs, watch }) {
  watch.attr(refs.button, 'disabled', (attr, next, prev, button) => {
    button.dataset.wasDisabled = String(prev !== null);
  });
}
```

Targets can be selector strings or direct elements.

```javascript
watch.attr('button', 'disabled', handler);
watch.attr(refs.button, 'disabled', handler);
```

Every watch call returns a disposer.

```javascript
const stop = watch.text(refs.status, sync);
stop();
```

The final argument can be an `AbortSignal` or an options object.

```javascript
watch.attr(refs.button, 'disabled', handler, ctrl.signal);
watch.attr(refs.button, 'disabled', handler, { signal: ctrl.signal, once: true });
watch.attr.once(refs.button, 'disabled', handler);
```

## 13. Attribute Watch

Use `watch.attr` for one, many, or all attributes.

```javascript
watch.attr('button', 'disabled', (attr, next, prev, button) => {});
watch.attr('.card', ['aria-expanded', 'data-state'], handler);
watch.attr('.card', '*', handler);
watch.attr.once('details', 'open', handler);
```

Handler shape:

```javascript
(attrName, newValue, oldValue, element) => void
```

Notes:

- `newValue` is read with `element.getAttribute(attrName)`.
- Removed attributes produce `null`.
- Boolean attributes usually produce `''` when present and `null` when absent.

## 14. Children Watch

Use `watch.kids` for child additions and removals.

```javascript
watch.kids('ul', ({ added, removed }, list) => {
  for (const node of added) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add('new');
    }
  }
});
```

Direct target:

```javascript
watch.kids(refs.list, handler);
```

Deep child watching:

```javascript
watch.kids('section', { deep: true }, handler);
watch.kids.once('section', { deep: true }, handler);
```

Handler shape:

```javascript
({ added, removed }, element) => void
```

`added` and `removed` are arrays.

## 15. Text Watch

Use `watch.text` for text-node changes inside a target.

```javascript
watch.text(refs.counter, (next, prev, counter) => {
  counter.dataset.changed = String(next !== prev);
});
```

Handler shape:

```javascript
(newText, oldText, element) => void
```

Rules:

- `newText` is the current `textContent`.
- `oldText` comes from the mutation record.
- `element` can be `null` if the text node no longer has a parent.

## 16. Tree Watch

Use `watch.tree` only when you need raw mutation records.

```javascript
watch.tree(refs.editor, (records, editor) => {
  for (const record of records) {
    if (record.type === 'childList') syncOutline();
    if (record.type === 'attributes') syncToolbar();
  }
});
```

Handler shape:

```javascript
(records, element) => void
```

Prefer `watch.attr`, `watch.kids`, or `watch.text` when the mutation type is known.

## 17. Containers

Use `ui.container` for router-owned layout slots.

```javascript
ui.container('ui-main', {
  template: './index.html',
  style: './style.css',

  mount({ el, on }) {
    on.click('[data-close]', () => {
      el.dispatchEvent(new CustomEvent('close', {
        bubbles: true,
        composed: true
      }));
    });
  }
}, import.meta.url);
```

Containers inherit the same lifecycle helpers as elements and register themselves with the router. The runtime adds `swapView(newElement, options)`.

```javascript
await container.swapView(page, {
  direction: 'push'
});
```

Rules:

- Use containers for layout outlets.
- A container name is read from its `name` attribute or the tag name.
- Only one container with the same name can be mounted at a time.
- `swapView` uses element-scoped View Transitions when available, then document View Transitions, then direct replacement.

## 18. Declarative Routes

`ui.element` can register a route when `url` is provided.

```javascript
ui.element('page-profile', {
  url: '/members/:member',
  container: 'main',
  props: {
    member: { type: String, default: '' }
  },
  template: './profile.html',

  mount({ el }) {
    loadMember(el.member);
  }
}, import.meta.url);
```

When the router finds the route, the UI orchestrator creates the page element and swaps it into the named container.

## 19. Form-Associated Elements

Set `form: true` to attach `ElementInternals`.

```javascript
ui.element('ui-field', {
  form: true,
  template: './index.html',
  style: './style.css',

  props: {
    value: { type: String, default: '' },
    required: { type: Boolean, default: false }
  },

  mount({ el, refs, internals, on }) {
    internals.setFormValue(el.value);

    on.input('input', (_event, input) => {
      el.value = input.value;
      internals.setFormValue(el.value);
    }, { passive: false });
  },

  update({ el, name, val, internals, refs }) {
    if (name === 'value') {
      refs.input.value = val;
      internals.setFormValue(val);
    }

    if (name === 'required') {
      internals.setValidity(
        val && !el.value ? { valueMissing: true } : {},
        val && !el.value ? 'Required' : ''
      );
    }
  },

  associated(form) {
    this.dataset.form = form?.id || '';
  },

  disabled(value) {
    this.toggleAttribute('disabled', value);
  },

  reset() {
    this.value = '';
  },

  restore(state) {
    this.value = String(state ?? '');
  }
}, import.meta.url);
```

Rules:

- Use `internals.setFormValue(value)` to participate in form submission.
- Use `internals.setValidity(flags, message)` for validation.
- Use `internals.form` when the element must interact with its owner form.
- Use `associated`, `disabled`, `reset`, and `restore` for form lifecycle hooks.

### Form Hook Mapping

The spec hook names map to the platform `ElementInternals` callbacks:

| Spec Hook | Platform Callback | Purpose |
| --- | --- | --- |
| `associated(form)` | `formAssociatedCallback` | Called when element is associated with a `<form>` |
| `disabled(value)` | `formDisabledCallback` | Called when the form is disabled |
| `reset()` | `formResetCallback` | Called when the form is reset |
| `restore(state, mode)` | `formStateRestoreCallback` | Called when browser restores form state |

These hooks are installed on the element prototype and called automatically by the browser.

## 20. `ui.define`

Use `ui.define` for a hand-written custom element class.

```javascript
import { BaseElement, ui } from '@anzaui/anza/ui';

class NativeClock extends BaseElement {
  mount() {
    this.timer = setInterval(() => {
      this.textContent = new Date().toLocaleTimeString();
    }, 1000);

    this.ctrl.signal.addEventListener('abort', () => {
      clearInterval(this.timer);
    }, { once: true });
  }
}

ui.define('native-clock', NativeClock);
```

`BaseElement` creates `this.ctrl` in `connectedCallback` and aborts it in `disconnectedCallback`.

## 21. Scheduling

Use scheduler helpers for expensive work that should not block interaction.

```javascript
await ui.schedule(() => {
  buildSecondaryIndex();
});
```

Priorities:

```javascript
await ui.schedule(work, 'user-blocking');
await ui.schedule(work, 'user-visible');
await ui.schedule(work, 'background');
```

Use `scheduleFrame` for DOM writes that should happen in a frame.

```javascript
await ui.scheduleFrame(() => {
  refs.panel.hidden = false;
});
```

Use `ui.yield()` inside long loops.

```javascript
for (let i = 0; i < rows.length; i++) {
  renderRow(rows[i]);
  if (i % 50 === 0) await ui.yield();
}
```

Fallbacks:

- `scheduler.postTask` when available.
- `requestIdleCallback` for background tasks when available.
- `setTimeout` for broad browser support.

## 22. Observers

`ui.observe` wraps platform observers with disposer functions and optional `AbortSignal` cleanup.

```javascript
const stopResize = ui.observe.resize(refs.panel, (entries) => {
  syncSize(entries[0].contentRect);
}, ctrl.signal);

const stopVisible = ui.observe.intersection(refs.sentinel, (entries) => {
  if (entries[0].isIntersecting) loadMore();
}, ctrl.signal, {
  rootMargin: '200px'
});

const stopMutation = ui.observe.mutation(refs.list, (records) => {
  console.log(records.length);
}, ctrl.signal, {
  childList: true
});

const stopPerf = ui.observe.performance(['longtask'], (list) => {
  report(list.getEntries());
}, ctrl.signal);
```

Rules:

- Prefer injected `watch` for component shadow-root mutations.
- Use `ui.observe.*` for lower-level platform observer access.
- Pass `ctrl.signal` from component code.
- Call the returned disposer for early cleanup.

## 23. Transitions

`ui.transition` wraps document View Transitions and respects reduced motion.

```javascript
const tx = await ui.transition(() => {
  refs.panel.replaceChildren(next);
});

await tx.finished;
```

Fallback behavior:

- If View Transitions are unsupported, the callback runs directly.
- If `prefers-reduced-motion: reduce` matches, the callback runs directly.
- The returned object has `finished`, `updateCallbackDone`, `ready`, and `skipTransition`.

For router containers, prefer `swapView`.

## 24. Template Helper

`ui.template` creates a cached fragment from a tagged template literal.

```javascript
const row = ui.template`
  <li class="row">
    <span ref="label"></span>
  </li>
`;

row.querySelector('[ref="label"]').textContent = label;
refs.list.appendChild(row);
```

Interpolated values are intentionally ignored.

```javascript
const bad = ui.template`<span>${label}</span>`;
```

Use DOM APIs after cloning:

```javascript
const item = ui.template`<li><span class="label"></span></li>`;
item.querySelector('.label').textContent = label;
```

Rules:

- Use static markup inside the tagged template.
- Do not put user data into template strings.
- Clone first, then assign dynamic data with DOM APIs.

## 25. Template Scanning

The Rust tool scans component HTML and emits `.tags.json` descriptors used for refs and tag prewarming.

Commands:

```bash
anza --src src --build
anza --src src --port 3000
anza scan --src src
anza scan --src src --watch
anza build --src src --dist dist
anza dev --src src --port 3000
```

Descriptor shape:

```json
{
  "version": 1,
  "refs": ["button", "status"],
  "ids": ["button"],
  "classes": ["btn", "status"],
  "tags": ["button", "span"],
  "compound": ["button.btn", "span.status"],
  "attrs": ["type", "hidden"],
  "refTypes": {
    "button": "HTMLButtonElement",
    "status": "HTMLSpanElement"
  }
}
```

Rules:

- Descriptors are optional at runtime.
- If a descriptor is missing, refs are discovered by scanning `[ref]`.
- Malformed descriptor fields are ignored safely.
- Keep descriptors committed when generated for library components.
- Regenerate descriptors after template structure changes.

The toolchain also scans `ui.element` specs and emits `routes.json` for declarative routes.

```json
{
  "version": 1,
  "routes": [
    {
      "tag": "page-member",
      "path": "/members/:member",
      "container": "main",
      "params": ["member"]
    }
  ]
}
```

## 26. Typing Components

The package exports TypeScript declarations for strict component contexts.

```typescript
import { ui, type MountContext, type UpdateContext } from '@anzaui/anza/ui';

interface Refs {
  button: HTMLButtonElement;
  status: HTMLSpanElement;
}

const props = {
  count: { type: Number, default: 0 },
  open: { type: Boolean, default: false },
  label: { type: String, default: '' }
};

ui.element<'ui-typed', typeof props, Refs>('ui-typed', {
  props,

  mount({ el, refs, tags, on, watch }) {
    el.count.toFixed();
    refs.button.disabled = true;

    const input = tags.one<HTMLInputElement>('input');
    input?.value.trim();

    on.click<HTMLButtonElement>('button', (event, button) => {
      event.clientX.toFixed();
      button.disabled = false;
    });

    watch.attr(refs.button, 'disabled', (_attr, next, prev, button) => {
      button.disabled = next !== null;
    });
  },

  update(ctx) {
    if (ctx.name === 'count') {
      ctx.val.toFixed();
    }

    if (ctx.name === 'label') {
      ctx.val.trim();
    }
  }
});

declare const mount: MountContext<typeof props, Refs>;
mount.refs.button.disabled = false;

declare const update: UpdateContext<typeof props, Refs>;
if (update.name === 'open') {
  update.val.valueOf();
}
```

For deeper type details, see `src/core/ui/ui.types.md`.

## 27. Security

- Avoid `innerHTML` for dynamic content.
- Use `textContent` for text.
- Use properties, attributes, and class lists for state.
- Validate tag names before creating dynamic elements.
- Dispatch outward with composed custom events when the event must cross shadow boundaries.
- Treat slotted content as external input.

Safe custom event:

```javascript
el.dispatchEvent(new CustomEvent('activate', {
  bubbles: true,
  composed: true,
  detail: { value: el.value }
}));
```

## 28. Performance

- Prefer `refs` for stable anchors.
- Prefer `tags` over repeated `shadowRoot.querySelector`.
- Prefer delegated `on` over repeated child listeners.
- Prefer `watch` over ad hoc `MutationObserver` inside shadow roots.
- Use `ui.schedule` for expensive non-visual work.
- Use `ui.scheduleFrame` for frame-synced DOM writes.
- Use `ui.yield` in long loops.
- Keep update handlers small and branch by `name`.
- Clear `tags` after structural changes not covered by direct shadow child invalidation.

## 29. Escape Hatches

Use platform APIs directly when they are clearer.

```javascript
refs.input.focus();
refs.dialog.showModal();
refs.video.play();
refs.scroller.scrollTo({ top: 0, behavior: 'smooth' });
```

Rules:

- Keep cleanup tied to `ctrl.signal`.
- Keep DOM writes explicit.
- Do not hide heavy work in property setters.
- Do not rely on undocumented spec fields.

## 30. Checklist

- Use `ui.element` for components and pages.
- Use `ui.container` only for router-owned layout slots.
- Use `ui.define` for hand-written element classes.
- Keep each component's `index.js`, `index.html`, and `style.css` together.
- Pass `import.meta.url` for relative template or style assets.
- Prefer `refs` for stable anchors.
- Prefer `tags` for cached selector access.
- Prefer `on` for delegated shadow-root events.
- Use `passive: false` when a delegated handler calls `preventDefault()`.
- Prefer `watch` for shadow-root mutations.
- Prefer `ui.observe` for raw platform observers.
- Use scheduler helpers for heavy or deferred work.
- Keep cleanup tied to `ctrl.signal`.
- Use `textContent` and properties for dynamic data.
- Avoid `innerHTML` for user data.
- Dispatch outward with `CustomEvent`.
