/**
 * tests/core/platform/globals.test.js
 *
 * Framework-global attachment registry — precise inventory for soft-nav budgets.
 */

import { globals } from '../../../src/core/platform/globals.js';

describe('platform globals registry', () => {
  afterEach(() => {
    globals.clear();
  });

  it('attach / detach / count / list track named attachments', () => {
    let disposed = 0;
    globals.attach('test.listener', {
      type: 'listener',
      target: document,
      dispose: () => { disposed++; }
    });

    if (globals.count() !== 1) {
      throw new Error(`Expected count 1, got ${globals.count()}`);
    }
    const listed = globals.list();
    if (listed.length !== 1 || listed[0].name !== 'test.listener' || listed[0].type !== 'listener') {
      throw new Error(`Unexpected list snapshot: ${JSON.stringify(listed)}`);
    }
    if (listed[0].target !== document) {
      throw new Error('Expected list to retain target');
    }

    globals.detach('test.listener');
    if (globals.count() !== 0 || disposed !== 1) {
      throw new Error('Expected detach to dispose and clear');
    }

    globals.detach('test.listener'); // idempotent
    if (disposed !== 1) {
      throw new Error('Expected idempotent detach not to re-dispose');
    }
  });

  it('replacing the same name disposes the previous entry', () => {
    const order = [];
    globals.attach('test.mo', {
      type: 'observer',
      dispose: () => order.push('a')
    });
    globals.attach('test.mo', {
      type: 'observer',
      dispose: () => order.push('b')
    });

    if (globals.count() !== 1) {
      throw new Error('Expected single entry after replace');
    }
    if (order[0] !== 'a') {
      throw new Error('Expected prior dispose on replace');
    }
    if (globals.list()[0].type !== 'observer') {
      throw new Error('Expected observer type');
    }

    globals.detach('test.mo');
    if (order.join(',') !== 'a,b') {
      throw new Error(`Unexpected dispose order: ${order.join(',')}`);
    }
  });

  it('clear disposes every entry', () => {
    let a = 0;
    let b = 0;
    globals.attach('a', { type: 'listener', dispose: () => { a++; } });
    globals.attach('b', { type: 'observer', dispose: () => { b++; } });
    globals.clear();
    if (globals.count() !== 0 || a !== 1 || b !== 1) {
      throw new Error('Expected clear to dispose all entries');
    }
    globals.clear(); // empty idempotent
  });

  it('rejects invalid attach inputs', () => {
    let threwName = false;
    let threwDispose = false;
    try {
      globals.attach('', { dispose: () => {} });
    } catch {
      threwName = true;
    }
    try {
      globals.attach('x', {});
    } catch {
      threwDispose = true;
    }
    if (!threwName || !threwDispose) {
      throw new Error('Expected attach validation errors');
    }
  });

  it('defaults unknown type to listener', () => {
    globals.attach('weird', { type: 'other', dispose: () => {} });
    if (globals.list()[0].type !== 'listener') {
      throw new Error('Expected non-observer type to normalize to listener');
    }
  });
});
