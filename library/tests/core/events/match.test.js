/**
 * tests/core/events/match.test.js
 *
 * Shared composedPath matcher used by events.delegate and component `on`.
 */

import {
  isExcludedByNot,
  isInRootScope,
  matchInComposedPath,
  matchesAttrs,
  matchesSelector,
  PASSIVE_DEFAULT_TYPES,
  resolvePassiveDefault
} from '../../../src/core/events/match.js';

describe('events match helpers', () => {
  let host;
  let root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
  });

  afterEach(() => {
    host?.remove();
    host = null;
    root = null;
  });

  it('caches matchesSelector results and rejects invalid selectors', () => {
    const el = document.createElement('button');
    el.className = 'ok';
    let calls = 0;
    const original = el.matches.bind(el);
    el.matches = (sel) => {
      calls++;
      return original(sel);
    };

    if (!matchesSelector(el, '.ok')) {
      throw new Error('Expected .ok to match');
    }
    if (!matchesSelector(el, '.ok')) {
      throw new Error('Expected cached .ok to still match');
    }
    if (calls !== 1) {
      throw new Error(`Expected one matches() call, got ${calls}`);
    }
    if (matchesSelector(el, ':::')) {
      throw new Error('Expected invalid selector to return false');
    }
    if (matchesSelector(null, '.ok') || matchesSelector({}, '.ok')) {
      throw new Error('Expected non-elements to return false');
    }
  });

  it('isInRootScope distinguishes shadow, assigned, and path scopes', () => {
    root.innerHTML = '<slot name="item"></slot><button class="inner">in</button>';
    const inner = root.querySelector('.inner');
    const slotted = document.createElement('button');
    slotted.className = 'out';
    slotted.slot = 'item';
    host.appendChild(slotted);

    if (!isInRootScope(inner, root, 'shadow')) {
      throw new Error('Expected inner shadow node in shadow scope');
    }
    if (isInRootScope(slotted, root, 'shadow')) {
      throw new Error('Expected light-DOM node outside shadow scope by default');
    }
    if (!isInRootScope(slotted, root, 'assigned')) {
      throw new Error('Expected assigned light-DOM node in assigned scope');
    }
    if (!isInRootScope(slotted, root, 'path')) {
      throw new Error('Expected path scope to accept any path node');
    }
    if (isInRootScope(root, root, 'shadow')) {
      throw new Error('Expected root itself to be excluded');
    }
  });

  it('matchInComposedPath finds the first matching node before root', () => {
    root.innerHTML = '<div class="wrap"><button class="btn"><span>Go</span></button></div>';
    const span = root.querySelector('span');
    const btn = root.querySelector('.btn');

    const event = new MouseEvent('click', { bubbles: true, composed: true });
    span.dispatchEvent(event);

    // Re-dispatch so we can read composedPath from a live listener.
    let matched = null;
    root.addEventListener('click', (e) => {
      matched = matchInComposedPath(e, '.btn', root, 'shadow');
    }, { once: true });
    span.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    if (matched !== btn) {
      throw new Error('Expected composedPath match to resolve .btn from span click');
    }
  });

  it('matchInComposedPath with assigned scope hits slotted light DOM', () => {
    root.innerHTML = '<slot name="item"></slot>';
    const slotted = document.createElement('button');
    slotted.className = 'slotted';
    slotted.slot = 'item';
    host.appendChild(slotted);

    let shadowMatch = 'unset';
    let assignedMatch = null;

    root.addEventListener('click', (e) => {
      shadowMatch = matchInComposedPath(e, '.slotted', root, 'shadow');
      assignedMatch = matchInComposedPath(e, '.slotted', root, 'assigned');
    }, { once: true });

    slotted.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    if (shadowMatch !== null) {
      throw new Error('Expected default shadow scope to miss slotted light DOM');
    }
    if (assignedMatch !== slotted) {
      throw new Error('Expected assigned scope to match slotted button');
    }
  });

  it('matchesAttrs supports equality and null-absent predicates', () => {
    const el = document.createElement('button');
    el.setAttribute('data-action', 'save');
    el.setAttribute('aria-disabled', 'true');

    if (!matchesAttrs(el, { 'data-action': 'save' })) {
      throw new Error('Expected equality attr match');
    }
    if (matchesAttrs(el, { 'data-action': 'cancel' })) {
      throw new Error('Expected mismatched attr to fail');
    }
    if (matchesAttrs(el, { 'aria-disabled': null })) {
      throw new Error('Expected null predicate to fail when attr is present');
    }
    el.removeAttribute('aria-disabled');
    if (!matchesAttrs(el, { 'aria-disabled': null })) {
      throw new Error('Expected null predicate to pass when attr is absent');
    }
    if (!matchesAttrs(el, null) || !matchesAttrs(el, undefined)) {
      throw new Error('Expected missing attrs option to pass');
    }
  });

  it('isExcludedByNot skips matches under a not-selector within root', () => {
    root.innerHTML = `
      <div class="toolbar">
        <button class="btn ignore">Ignore</button>
        <button class="btn">Keep</button>
      </div>
    `;
    const ignore = root.querySelector('.ignore');
    const keep = root.querySelectorAll('.btn')[1];

    if (!isExcludedByNot(ignore, '.ignore', root)) {
      throw new Error('Expected .ignore to be excluded');
    }
    if (isExcludedByNot(keep, '.ignore', root)) {
      throw new Error('Expected Keep button not to be excluded');
    }
    if (isExcludedByNot(keep, '', root) || isExcludedByNot(null, '.ignore', root)) {
      throw new Error('Expected empty/null inputs to not exclude');
    }
  });

  it('resolvePassiveDefault matches touch/wheel set only', () => {
    for (const type of PASSIVE_DEFAULT_TYPES) {
      if (!resolvePassiveDefault(type, undefined)) {
        throw new Error(`Expected ${type} default passive true`);
      }
    }
    if (resolvePassiveDefault('click', undefined)) {
      throw new Error('Expected click default passive false');
    }
    if (resolvePassiveDefault('wheel', false) !== false) {
      throw new Error('Expected explicit passive:false override');
    }
    if (resolvePassiveDefault('click', true) !== true) {
      throw new Error('Expected explicit passive:true override');
    }
  });
});
