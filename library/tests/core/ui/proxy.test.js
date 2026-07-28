import {
  TagsCache,
  createEventDelegator,
  createMutationWatcher,
  createRefs,
  getAttachmentStats
} from '../../../src/core/ui/define/proxy.js';

function createShadow(markup = '') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = markup;
  return { host, root };
}

function nextMutationBatch() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('ui define proxy helpers', () => {
  let host;

  afterEach(() => {
    host?.remove();
    host = null;
  });

  it('keeps tags.one and tags.all cache shapes separate', () => {
    const shadow = createShadow('<button></button><button></button>');
    host = shadow.host;

    const tags = new TagsCache(shadow.root);
    const first = tags.one('button');
    const all = tags.all('button');

    if (!(first instanceof HTMLButtonElement)) {
      throw new Error('Expected tags.one to return the first button');
    }

    if (!Array.isArray(all) || all.length !== 2) {
      throw new Error('Expected tags.all to return an array of buttons');
    }
  });

  it('builds refs from descriptor or template scan', () => {
    const shadow = createShadow('<button ref="submit"></button><span ref="status"></span>');
    host = shadow.host;

    const refsFromDescriptor = createRefs(shadow.root, { refs: ['submit'] });
    const refsFromScan = createRefs(shadow.root);

    if (!(refsFromDescriptor.submit instanceof HTMLButtonElement)) {
      throw new Error('Expected descriptor refs to resolve submit');
    }

    if (!(refsFromScan.status instanceof HTMLSpanElement)) {
      throw new Error('Expected fallback scan to resolve status');
    }
  });

  it('delegates events and supports once bindings', () => {
    const shadow = createShadow('<button class="action"><span>Go</span></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    let calls = 0;

    on.click.once('.action', (_event, target) => {
      if (!target.classList.contains('action')) {
        throw new Error('Expected delegated target to be the matching button');
      }
      calls++;
    });

    const span = shadow.root.querySelector('span');
    span.click();
    span.click();
    ctrl.abort();

    if (calls !== 1) {
      throw new Error(`Expected once handler to fire once, fired ${calls}`);
    }
  });

  it('watches attribute mutations and stops after dispose', async () => {
    const shadow = createShadow('<button ref="submit"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');
    const seen = [];

    const stop = watch.attr(button, 'disabled', (attr, next, prev, target) => {
      seen.push({ attr, next, prev, target });
    });

    button.setAttribute('disabled', '');
    await nextMutationBatch();
    stop();
    button.removeAttribute('disabled');
    await nextMutationBatch();
    ctrl.abort();

    if (seen.length !== 1) {
      throw new Error(`Expected one attribute mutation, saw ${seen.length}`);
    }

    if (seen[0].attr !== 'disabled' || seen[0].next !== '' || seen[0].target !== button) {
      throw new Error('Unexpected watch.attr handler payload');
    }
  });

  // Section 1.2 Gaps
  it('supports on.click with custom signal cleanup', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const defaultCtrl = new AbortController();
    const customCtrl = new AbortController();
    const on = createEventDelegator(shadow.root, defaultCtrl.signal);
    let calls = 0;

    on.click('.btn', () => { calls++; }, customCtrl.signal);

    const button = shadow.root.querySelector('.btn');
    button.click();

    customCtrl.abort();
    button.click();

    if (calls !== 1) {
      throw new Error(`Expected calls to be 1, got ${calls}`);
    }
  });

  it('defaults passive only for touch/wheel and honors explicit overrides', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const seen = [];
    const originalAdd = shadow.root.addEventListener.bind(shadow.root);
    shadow.root.addEventListener = (type, handler, opts) => {
      seen.push({ type, passive: opts?.passive });
      return originalAdd(type, handler, opts);
    };

    try {
      const on = createEventDelegator(shadow.root, ctrl.signal);
      on.click('.btn', () => {});
      on.wheel('.btn', () => {});
      on.touchstart('.btn', () => {});
      on.wheel('.btn', () => {}, { passive: false });

      const click = seen.find((s) => s.type === 'click');
      const wheel = seen.filter((s) => s.type === 'wheel');
      const touch = seen.find((s) => s.type === 'touchstart');

      if (!click || click.passive !== false) {
        throw new Error(`Expected click non-passive, got ${JSON.stringify(click)}`);
      }
      if (!touch || touch.passive !== true) {
        throw new Error(`Expected touchstart passive, got ${JSON.stringify(touch)}`);
      }
      // First wheel is passive; second registration with passive:false rebuilds listener.
      if (wheel.length < 2 || wheel[0].passive !== true || wheel.at(-1).passive !== false) {
        throw new Error(`Expected wheel passive rebuild, got ${JSON.stringify(wheel)}`);
      }
    } finally {
      shadow.root.addEventListener = originalAdd;
      ctrl.abort();
    }
  });
  it('supports custom:event delegation', () => {
    const shadow = createShadow('<div class="box"></div>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    let calls = 0;

    on['custom:event']('.box', (e) => {
      calls += e.detail.amount;
    });

    const box = shadow.root.querySelector('.box');
    box.dispatchEvent(new CustomEvent('custom:event', {
      detail: { amount: 42 },
      bubbles: true,
      composed: true
    }));

    if (calls !== 42) {
      throw new Error(`Expected custom event to be caught with detail. Got calls = ${calls}`);
    }

    ctrl.abort();
  });

  it('watches multiple attributes and all attributes via *', async () => {
    const shadow = createShadow('<button></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');

    const multiSeen = [];
    const allSeen = [];

    watch.attr(button, ['disabled', 'class'], (attr) => {
      multiSeen.push(attr);
    });

    watch.attr(button, '*', (attr) => {
      allSeen.push(attr);
    });

    button.setAttribute('disabled', '');
    button.setAttribute('class', 'active');
    button.setAttribute('data-custom', 'test');
    await nextMutationBatch();

    if (multiSeen.length !== 2 || !multiSeen.includes('disabled') || !multiSeen.includes('class')) {
      throw new Error('Expected multiple attributes watcher to trigger exactly for specified attributes');
    }

    if (allSeen.length !== 3 || !allSeen.includes('data-custom')) {
      throw new Error('Expected wildcard attributes watcher to trigger for all attributes');
    }

    ctrl.abort();
  });

  it('watches kids (childList changes) with and without deep: true', async () => {
    const shadow = createShadow('<div class="parent"><div class="child"></div></div>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const parent = shadow.root.querySelector('.parent');
    const child = shadow.root.querySelector('.child');

    let shallowCalls = 0;
    let deepCalls = 0;

    watch.kids(parent, () => { shallowCalls++; });
    watch.kids(parent, { deep: true }, () => { deepCalls++; });

    // 1. Shallow mutation
    const btn = document.createElement('button');
    parent.appendChild(btn);
    await nextMutationBatch();

    // 2. Nested mutation
    const span = document.createElement('span');
    child.appendChild(span);
    await nextMutationBatch();

    if (shallowCalls !== 1) {
      throw new Error(`Expected shallow calls to be 1, got ${shallowCalls}`);
    }

    if (deepCalls !== 2) {
      throw new Error(`Expected deep calls to be 2, got ${deepCalls}`);
    }

    ctrl.abort();
  });

  it('watches textContent changes via watch.text', async () => {
    const shadow = createShadow('<div><span>hello</span></div>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const span = shadow.root.querySelector('span');

    let textVal = '';
    watch.text(span, (val) => { textVal = val; });

    span.firstChild.textContent = 'world';
    await nextMutationBatch();

    if (textVal !== 'world') {
      throw new Error(`Expected textVal to be "world", got "${textVal}"`);
    }

    ctrl.abort();
  });

  it('watches entire subtrees via watch.tree', async () => {
    const shadow = createShadow('<div class="root"><span class="child"></span></div>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const root = shadow.root.querySelector('.root');
    const child = shadow.root.querySelector('.child');

    let calls = 0;
    watch.tree(root, () => { calls++; });

    child.setAttribute('data-id', '123');
    await nextMutationBatch();

    const btn = document.createElement('button');
    child.appendChild(btn);
    await nextMutationBatch();

    if (calls !== 2) {
      throw new Error(`Expected watch.tree to catch all descendant mutations. Got calls = ${calls}`);
    }

    ctrl.abort();
  });

  it('supports watch.*.once bindings', async () => {
    const shadow = createShadow('<button></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');

    let calls = 0;
    watch.attr.once(button, 'disabled', () => { calls++; });

    button.setAttribute('disabled', '');
    await nextMutationBatch();
    button.removeAttribute('disabled');
    button.setAttribute('disabled', '');
    await nextMutationBatch();

    if (calls !== 1) {
      throw new Error(`Expected once watcher to fire exactly once, got ${calls}`);
    }

    ctrl.abort();
  });

  it('throws an error if direct watch target is outside shadow root', () => {
    const shadow = createShadow('');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    try {
      let threw = false;
      try {
        watch.attr(outsideEl, 'disabled', () => {});
      } catch (err) {
        threw = true;
        if (!err.message.includes('WatchError')) {
          throw new Error('Expected WatchError in message');
        }
      }

      if (!threw) {
        throw new Error('Expected watch outside shadow root to throw');
      }
    } finally {
      outsideEl.remove();
      ctrl.abort();
    }
  });

  it('allows selector target with no matches currently, matching later', async () => {
    const shadow = createShadow('<div class="container"></div>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const container = shadow.root.querySelector('.container');

    let calls = 0;
    // Register watch on dynamic elements matching '.dynamic-item'
    watch.attr('.dynamic-item', 'data-val', () => {
      calls++;
    });

    // Add matching element later
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    container.appendChild(item);
    await nextMutationBatch();

    // Mutate it
    item.setAttribute('data-val', '42');
    await nextMutationBatch();

    if (calls !== 1) {
      throw new Error(`Expected watch selector with no initial matches to match dynamically. Got calls = ${calls}`);
    }

    ctrl.abort();
  });

  it('component abort clears all watch registrations', async () => {
    const shadow = createShadow('<button></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');

    let calls = 0;
    watch.attr(button, 'disabled', () => { calls++; });

    ctrl.abort();

    button.setAttribute('disabled', '');
    await nextMutationBatch();

    if (calls !== 0) {
      throw new Error('Expected no watch calls after abort');
    }
  });

  it('removes shadow-root listener when last on handler is disposed (G2)', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);

    let removed = 0;
    const originalRemove = shadow.root.removeEventListener.bind(shadow.root);
    shadow.root.removeEventListener = (type, handler, opts) => {
      if (type === 'click') removed++;
      return originalRemove(type, handler, opts);
    };

    const dispose = on.click('.btn', () => {});
    dispose();

    if (removed < 1) {
      throw new Error('Expected removeEventListener after disposing last click handler');
    }

    let calls = 0;
    shadow.root.querySelector('.btn').click();
    if (calls !== 0) {
      throw new Error('Expected no handler after empty-registry teardown');
    }

    ctrl.abort();
  });

  it('defaults on.click to non-passive so preventDefault works', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    let prevented = false;

    on.click('.btn', (event) => {
      event.preventDefault();
      prevented = event.defaultPrevented;
    });

    const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    shadow.root.querySelector('.btn').dispatchEvent(event);

    if (!prevented) {
      throw new Error('Expected preventDefault to succeed with non-passive click default');
    }

    ctrl.abort();
  });

  it('supports watch.children as alias of watch.kids', async () => {
    const shadow = createShadow('<ul></ul>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const list = shadow.root.querySelector('ul');
    let calls = 0;

    watch.children(list, () => { calls++; });
    list.appendChild(document.createElement('li'));
    await nextMutationBatch();

    if (calls !== 1) {
      throw new Error(`Expected children alias to fire once, got ${calls}`);
    }

    ctrl.abort();
  });

  it('isolates watch.attr attributeFilter from sibling watch.tree (G1)', async () => {
    const shadow = createShadow(
      '<div class="wrap"><button class="btn"></button><div class="editor"></div></div>'
    );
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('.btn');
    const editor = shadow.root.querySelector('.editor');

    const observeCalls = [];
    const OriginalMO = globalThis.MutationObserver;
    globalThis.MutationObserver = class extends OriginalMO {
      observe(target, options) {
        observeCalls.push({ target, options: { ...options } });
        return super.observe(target, options);
      }
    };

    let attrCalls = 0;
    let treeCalls = 0;
    try {
      watch.attr(button, 'disabled', () => { attrCalls++; });
      watch.tree(editor, () => { treeCalls++; });

      const narrow = observeCalls.find(
        (c) => c.target === button && c.options.attributeFilter?.includes('disabled')
      );
      if (!narrow) {
        throw new Error('Expected narrow attr bucket with attributeFilter: disabled');
      }
      if (narrow.options.subtree) {
        throw new Error('Expected narrow attr bucket subtree: false');
      }

      const wide = observeCalls.find(
        (c) => c.target === editor && c.options.childList && !c.options.attributeFilter
      );
      if (!wide) {
        throw new Error('Expected wide tree bucket without attributeFilter');
      }

      button.setAttribute('aria-label', 'x');
      await nextMutationBatch();
      if (attrCalls !== 0) {
        throw new Error('Unrelated attr must not fire narrow watch.attr handler');
      }

      button.setAttribute('disabled', '');
      await nextMutationBatch();
      if (attrCalls !== 1) {
        throw new Error(`Expected disabled attr handler once, got ${attrCalls}`);
      }

      editor.setAttribute('data-x', '1');
      await nextMutationBatch();
      if (treeCalls < 1) {
        throw new Error('Expected tree watcher to observe editor mutations');
      }
    } finally {
      globalThis.MutationObserver = OriginalMO;
      ctrl.abort();
    }
  });

  it('matches on via composedPath and supports attrs/not/key', () => {
    const shadow = createShadow(`
      <div class="wrap">
        <button class="btn" data-action="save">Save</button>
        <button class="btn ignore" data-action="save">Ignore</button>
      </div>
    `);
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    const filtered = [];
    const deduped = [];

    on.click('.btn', (_e, target) => {
      filtered.push(target.textContent.trim());
    }, {
      attrs: { 'data-action': 'save' },
      not: '.ignore'
    });

    on.click('.btn', (_e, target) => {
      deduped.push(`a:${target.textContent.trim()}`);
    }, { key: 'toolbar-save' });

    on.click('.btn', (_e, target) => {
      deduped.push(`b:${target.textContent.trim()}`);
    }, { key: 'toolbar-save' });

    shadow.root.querySelector('.btn').click();
    shadow.root.querySelector('.ignore').click();

    if (filtered.length !== 1 || filtered[0] !== 'Save') {
      throw new Error(`Expected attrs/not to keep Save only, got ${JSON.stringify(filtered)}`);
    }
    if (deduped.length !== 2 || deduped[0] !== 'b:Save' || deduped[1] !== 'b:Ignore') {
      throw new Error(`Expected key dedupe to keep only b handlers, got ${JSON.stringify(deduped)}`);
    }

    ctrl.abort();
  });

  it('requirePresent no-ops selector watches with zero matches', async () => {
    const shadow = createShadow('<div></div>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    let calls = 0;

    const dispose = watch.attr('.missing', 'data-x', () => { calls++; }, {
      requirePresent: true
    });

    const item = document.createElement('div');
    item.className = 'missing';
    shadow.root.appendChild(item);
    item.setAttribute('data-x', '1');
    await nextMutationBatch();

    if (calls !== 0) {
      throw new Error('Expected requirePresent registration to no-op');
    }

    dispose();
    ctrl.abort();
  });

  it('watch.slot fires on slotchange without document MO', async () => {
    const shadow = createShadow('<slot name="item"></slot>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    let assignedCount = -1;

    watch.slot('slot[name="item"]', ({ assignedElements }) => {
      assignedCount = assignedElements.length;
    });

    const child = document.createElement('span');
    child.slot = 'item';
    host.appendChild(child);
    await nextMutationBatch();

    if (assignedCount !== 1) {
      throw new Error(`Expected one assigned element, got ${assignedCount}`);
    }

    ctrl.abort();
  });

  it('exposes attachment stats and clears them on abort', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('.btn');

    on.click('.btn', () => {});
    on.click('.btn', () => {});
    watch.attr(button, 'disabled', () => {});
    watch.tree(button, () => {});

    const live = getAttachmentStats(shadow.root);
    if (!live || live.onRootListeners !== 1 || live.onRegistrations !== 2) {
      throw new Error(`Unexpected on stats: ${JSON.stringify(live)}`);
    }
    if (live.watchBuckets !== 2 || live.watchRegistrations !== 2) {
      throw new Error(`Expected two isolated watch buckets, got ${JSON.stringify(live)}`);
    }

    ctrl.abort();
    const after = getAttachmentStats(shadow.root);
    if (
      !after ||
      after.onRootListeners !== 0 ||
      after.onRegistrations !== 0 ||
      after.watchBuckets !== 0 ||
      after.watchRegistrations !== 0
    ) {
      throw new Error(`Expected zero attachments after abort, got ${JSON.stringify(after)}`);
    }
  });

  it('does not install duplicate root listeners for the same type', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    let addCount = 0;
    const originalAdd = shadow.root.addEventListener.bind(shadow.root);
    shadow.root.addEventListener = (type, handler, opts) => {
      if (type === 'click') addCount++;
      return originalAdd(type, handler, opts);
    };

    const on = createEventDelegator(shadow.root, ctrl.signal);
    on.click('.btn', () => {});
    on.click('.other', () => {});
    on.click('.btn', () => {});

    if (addCount !== 1) {
      throw new Error(`Expected one click root listener, got ${addCount}`);
    }

    ctrl.abort();
  });

  it('ignores queued mutation callbacks after abort', async () => {
    const shadow = createShadow('<button></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');
    let calls = 0;

    watch.attr(button, 'disabled', () => { calls++; });
    button.setAttribute('disabled', '');
    ctrl.abort();
    await nextMutationBatch();

    if (calls !== 0) {
      throw new Error('Expected aborted watch to ignore queued MutationObserver callbacks');
    }
  });

  it('matches attrs null-absent and scope assigned for slotted light DOM', () => {
    const shadow = createShadow('<slot name="item"></slot><button class="inner" aria-busy="true">In</button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    const hits = [];

    on.click('.inner', (_e, target) => {
      hits.push(`inner:${target.textContent}`);
    }, { attrs: { 'aria-busy': null } });

    on.click('.slotted', (_e, target) => {
      hits.push(`assigned:${target.textContent}`);
    }, { scope: 'assigned' });

    // Default shadow scope must ignore light DOM even when assigned.
    on.click('.slotted', () => {
      hits.push('shadow-leak');
    });

    shadow.root.querySelector('.inner').click();

    const child = document.createElement('button');
    child.className = 'slotted';
    child.slot = 'item';
    child.textContent = 'Out';
    host.appendChild(child);
    child.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    if (hits.includes('inner:In')) {
      throw new Error('Expected null-absent attrs to skip aria-busy button');
    }
    if (!hits.includes('assigned:Out')) {
      throw new Error(`Expected assigned scope to hit slotted button, got ${JSON.stringify(hits)}`);
    }
    if (hits.includes('shadow-leak')) {
      throw new Error('Expected default shadow scope to ignore slotted light DOM');
    }

    ctrl.abort();
  });

  it('disconnects watch buckets when last registration leaves', async () => {
    const shadow = createShadow('<button></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');

    let disconnected = 0;
    const OriginalMO = globalThis.MutationObserver;
    globalThis.MutationObserver = class extends OriginalMO {
      disconnect() {
        disconnected++;
        return super.disconnect();
      }
    };

    try {
      const stop = watch.attr(button, 'disabled', () => {});
      const live = getAttachmentStats(shadow.root);
      if (!live || live.watchBuckets !== 1 || live.watchRegistrations !== 1) {
        throw new Error(`Expected one watch bucket, got ${JSON.stringify(live)}`);
      }

      stop();
      const after = getAttachmentStats(shadow.root);
      if (!after || after.watchBuckets !== 0 || after.watchRegistrations !== 0) {
        throw new Error(`Expected empty buckets after dispose, got ${JSON.stringify(after)}`);
      }
      if (disconnected < 1) {
        throw new Error('Expected MutationObserver.disconnect on empty bucket teardown');
      }
    } finally {
      globalThis.MutationObserver = OriginalMO;
      ctrl.abort();
    }
  });

  it('keeps capture and bubble as separate root listeners', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    let addCount = 0;
    const originalAdd = shadow.root.addEventListener.bind(shadow.root);
    shadow.root.addEventListener = (type, handler, opts) => {
      if (type === 'click') addCount++;
      return originalAdd(type, handler, opts);
    };

    try {
      const on = createEventDelegator(shadow.root, ctrl.signal);
      on.click('.btn', () => {});
      on.click('.btn', () => {}, { capture: true });

      if (addCount !== 2) {
        throw new Error(`Expected separate capture/bubble listeners, got ${addCount}`);
      }

      const stats = getAttachmentStats(shadow.root);
      if (!stats || stats.onRootListeners !== 2 || stats.onRegistrations !== 2) {
        throw new Error(`Unexpected stats: ${JSON.stringify(stats)}`);
      }
    } finally {
      shadow.root.addEventListener = originalAdd;
      ctrl.abort();
    }
  });

  it('abort clears on registries and removes root listeners', () => {
    const shadow = createShadow('<button class="btn"></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    let calls = 0;
    on.click('.btn', () => { calls++; });

    shadow.root.querySelector('.btn').click();
    if (calls !== 1) throw new Error('Expected live handler');

    ctrl.abort();
    shadow.root.querySelector('.btn').click();
    if (calls !== 1) throw new Error('Expected abort to clear on handlers');

    const after = getAttachmentStats(shadow.root);
    if (
      !after ||
      after.onRootListeners !== 0 ||
      after.onRegistrations !== 0
    ) {
      throw new Error(`Expected zero on stats after abort, got ${JSON.stringify(after)}`);
    }
  });

  it('watch.slot.once fires once and clears slotListeners stats', async () => {
    const shadow = createShadow('<slot name="item"></slot>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    let calls = 0;

    watch.slot.once('slot[name="item"]', () => { calls++; });

    const live = getAttachmentStats(shadow.root);
    if (!live || live.slotListeners < 1) {
      throw new Error(`Expected slotListeners tracked, got ${JSON.stringify(live)}`);
    }

    const child = document.createElement('span');
    child.slot = 'item';
    host.appendChild(child);
    await nextMutationBatch();

    const child2 = document.createElement('span');
    child2.slot = 'item';
    host.appendChild(child2);
    await nextMutationBatch();

    if (calls !== 1) {
      throw new Error(`Expected slot.once once, got ${calls}`);
    }

    const after = getAttachmentStats(shadow.root);
    if (!after || after.slotListeners !== 0) {
      throw new Error(`Expected slotListeners cleared after once, got ${JSON.stringify(after)}`);
    }

    ctrl.abort();
  });

  it('attr * and named attr stay in isolated buckets', () => {
    const shadow = createShadow('<button></button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const watch = createMutationWatcher(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('button');

    watch.attr(button, 'disabled', () => {});
    watch.attr(button, '*', () => {});

    const live = getAttachmentStats(shadow.root);
    if (!live || live.watchBuckets !== 2) {
      throw new Error(`Expected isolated * vs named buckets, got ${JSON.stringify(live)}`);
    }

    ctrl.abort();
  });

  it('binds on to a direct element target within shadow', () => {
    const shadow = createShadow('<button class="btn">Go</button>');
    host = shadow.host;

    const ctrl = new AbortController();
    const on = createEventDelegator(shadow.root, ctrl.signal);
    const button = shadow.root.querySelector('.btn');
    let calls = 0;

    on.click(button, () => { calls++; });
    button.click();

    if (calls !== 1) {
      throw new Error(`Expected direct-element on target to fire, got ${calls}`);
    }

    ctrl.abort();
  });
});
