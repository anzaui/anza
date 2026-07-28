/**
 * tests/core/events/delegate.test.js
 *
 * Event delegation: composedPath matching, attrs/not/key, signal teardown.
 */

import { delegate } from '@adukiorg/anza/events';

describe('Event Delegation', () => {
  it('delegates events and caches selector match results', () => {
    const container = document.createElement('div');
    const item = document.createElement('span');
    item.className = 'item';
    container.appendChild(item);
    document.body.appendChild(container);

    let fired = false;
    let matchesCount = 0;

    const originalMatches = item.matches;
    item.matches = function(sel) {
      matchesCount++;
      return originalMatches.call(item, sel);
    };

    const dispose = delegate(container, '.item', 'click', () => {
      fired = true;
    });

    try {
      item.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));
      if (!fired) throw new Error('Expected delegated listener to fire');
      if (matchesCount !== 1) {
        throw new Error(`Expected matches once, got ${matchesCount}`);
      }

      fired = false;
      item.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));
      if (!fired) throw new Error('Expected delegated listener to fire a second time');
      if (matchesCount !== 1) {
        throw new Error(`Expected matches cached, got count: ${matchesCount}`);
      }
    } finally {
      dispose();
      item.matches = originalMatches;
      container.remove();
    }
  });

  it('supports attrs, not, null-absent attrs, and key dedupe', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button class="btn" data-action="save">Save</button>
      <button class="btn ignore" data-action="save">Ignore</button>
      <button class="btn" data-action="save" aria-disabled="true">Disabled</button>
    `;
    document.body.appendChild(container);

    const filtered = [];
    const deduped = [];

    const disposeFilter = delegate(container, '.btn', 'click', (_e, el) => {
      filtered.push(el.textContent.trim());
    }, {
      attrs: { 'data-action': 'save', 'aria-disabled': null },
      not: '.ignore'
    });

    const disposeA = delegate(container, '.btn', 'click', (_e, el) => {
      deduped.push(`a:${el.textContent.trim()}`);
    }, { key: 'save' });

    const disposeB = delegate(container, '.btn', 'click', (_e, el) => {
      deduped.push(`b:${el.textContent.trim()}`);
    }, { key: 'save' });

    try {
      for (const btn of container.querySelectorAll('.btn')) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      }

      if (filtered.length !== 1 || filtered[0] !== 'Save') {
        throw new Error(`Expected attrs/not/null to keep Save only, got ${JSON.stringify(filtered)}`);
      }
      if (deduped.length !== 3 || !deduped.every((x) => x.startsWith('b:'))) {
        throw new Error(`Expected key dedupe to keep only b handlers, got ${JSON.stringify(deduped)}`);
      }
    } finally {
      disposeFilter();
      disposeA();
      disposeB();
      container.remove();
    }
  });

  it('matches nested shadow targets via composedPath', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<button class="inner">Go</button>';

    let matched = null;
    const dispose = delegate(host, '.inner', 'click', (_e, el) => {
      matched = el;
    });

    try {
      root.querySelector('.inner').dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      );
      if (matched !== root.querySelector('.inner')) {
        throw new Error('Expected delegate to match element inside nested shadow');
      }
    } finally {
      dispose();
      host.remove();
    }
  });

  it('signal abort and manual dispose both remove the listener', () => {
    const container = document.createElement('div');
    const btn = document.createElement('button');
    btn.className = 'btn';
    container.appendChild(btn);
    document.body.appendChild(container);

    const ctrl = new AbortController();
    let calls = 0;
    const dispose = delegate(container, '.btn', 'click', () => { calls++; }, {
      signal: ctrl.signal
    });

    try {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      if (calls !== 1) throw new Error('Expected first click to fire');

      ctrl.abort();
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      if (calls !== 1) throw new Error('Expected abort to stop further fires');

      // Second registration + manual dispose
      let calls2 = 0;
      const dispose2 = delegate(container, '.btn', 'click', () => { calls2++; });
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      dispose2();
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      if (calls2 !== 1) {
        throw new Error(`Expected manual dispose to stop after one fire, got ${calls2}`);
      }
    } finally {
      dispose();
      container.remove();
    }
  });

  it('returns no-op when signal already aborted or args invalid', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ctrl = new AbortController();
    ctrl.abort();

    try {
      const d1 = delegate(container, '.x', 'click', () => {}, { signal: ctrl.signal });
      const d2 = delegate(container, 123, 'click', () => {});
      const d3 = delegate(container, '.x', 'click', null);
      d1();
      d2();
      d3();
    } finally {
      container.remove();
    }
  });

  it('scope assigned matches slotted light-DOM targets', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<slot></slot>';

    const child = document.createElement('button');
    child.className = 'slotted';
    host.appendChild(child);

    let pathHits = 0;
    let assignedHits = 0;

    // path scope (delegate default) matches anything in composedPath before root —
    // here root is the host, so slotted child is in path.
    const disposePath = delegate(host, '.slotted', 'click', () => { pathHits++; });
    const disposeAssigned = delegate(root, '.slotted', 'click', () => { assignedHits++; }, {
      scope: 'assigned'
    });

    try {
      child.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      if (pathHits !== 1) {
        throw new Error(`Expected path-scope delegate on host to fire, got ${pathHits}`);
      }
      if (assignedHits !== 1) {
        throw new Error(`Expected assigned-scope delegate on shadow to fire, got ${assignedHits}`);
      }
    } finally {
      disposePath();
      disposeAssigned();
      host.remove();
    }
  });

  it('removing abort listener on dispose prevents signal retention', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ctrl = new AbortController();
    let abortRemoved = false;

    const originalRemove = ctrl.signal.removeEventListener.bind(ctrl.signal);
    ctrl.signal.removeEventListener = (type, listener, options) => {
      if (type === 'abort') abortRemoved = true;
      return originalRemove(type, listener, options);
    };

    try {
      const dispose = delegate(container, '.x', 'click', () => {}, { signal: ctrl.signal });
      dispose();
      if (!abortRemoved) {
        throw new Error('Expected abort listener removed on dispose');
      }
    } finally {
      ctrl.signal.removeEventListener = originalRemove;
      container.remove();
    }
  });
});
