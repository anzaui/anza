/**
 * tests/core/router/base.test.js
 *
 * Deploy-base helpers for subpath hosting (GitHub Pages `/anza`).
 */

import {
  getBase,
  withBase,
  stripBase,
  resolveAppUrl,
  resolveAssetUrl
} from '../../../src/core/router/base.js';

describe('Router deploy base', () => {
  let prevBase;

  beforeEach(() => {
    prevBase = globalThis.__ANZA_BASE__;
  });

  afterEach(() => {
    if (prevBase === undefined) delete globalThis.__ANZA_BASE__;
    else globalThis.__ANZA_BASE__ = prevBase;
  });

  it('getBase normalizes trailing slashes and empty values', () => {
    delete globalThis.__ANZA_BASE__;
    if (getBase() !== '') throw new Error('Expected empty base when unset');

    globalThis.__ANZA_BASE__ = '/anza/';
    if (getBase() !== '/anza') throw new Error(`Expected /anza, got ${getBase()}`);

    globalThis.__ANZA_BASE__ = '/';
    if (getBase() !== '') throw new Error('Expected empty base for "/"');
  });

  it('withBase prefixes root-absolute paths idempotently', () => {
    globalThis.__ANZA_BASE__ = '/anza';
    if (withBase('/styles/shared.css') !== '/anza/styles/shared.css') {
      throw new Error(`Expected /anza/styles/shared.css, got ${withBase('/styles/shared.css')}`);
    }
    if (withBase('/anza/styles/shared.css') !== '/anza/styles/shared.css') {
      throw new Error('Expected withBase to be idempotent');
    }
    if (withBase('/') !== '/anza/') {
      throw new Error(`Expected /anza/, got ${withBase('/')}`);
    }
  });

  it('stripBase removes deploy prefix for route matching', () => {
    globalThis.__ANZA_BASE__ = '/anza';
    if (stripBase('/anza/docs/start') !== '/docs/start') {
      throw new Error(`Expected /docs/start, got ${stripBase('/anza/docs/start')}`);
    }
    if (stripBase('/anza') !== '/') {
      throw new Error(`Expected /, got ${stripBase('/anza')}`);
    }
  });

  it('resolveAppUrl keeps deploy base for root-absolute paths', () => {
    globalThis.__ANZA_BASE__ = '/anza';
    const href = resolveAppUrl('/styles/shared.css');
    let path;
    try {
      path = new URL(href, 'http://localhost').pathname;
    } catch {
      path = href;
    }
    if (path !== '/anza/styles/shared.css') {
      throw new Error(
        `Expected pathname /anza/styles/shared.css (URL standard must not drop base), got ${href}`
      );
    }
  });

  it('resolveAssetUrl keeps root-absolute paths when __ANZA_BASE__ is empty', () => {
    delete globalThis.__ANZA_BASE__;
    for (const asset of ['/styles/shared.css', '/tokens/index.css', '/app.js', '/docs/intro/start']) {
      const href = resolveAssetUrl(asset);
      const path = new URL(href, 'http://localhost').pathname;
      if (path !== asset) {
        throw new Error(`Expected ${asset} with empty base, got ${href}`);
      }
    }

    globalThis.__ANZA_BASE__ = '';
    if (new URL(resolveAssetUrl('/styles/shared.css'), 'http://localhost').pathname !== '/styles/shared.css') {
      throw new Error('Expected empty-string __ANZA_BASE__ to leave /styles/... unchanged');
    }
  });

  it('resolveAssetUrl prefixes /styles and /tokens under __ANZA_BASE__', () => {
    globalThis.__ANZA_BASE__ = '/anza';
    for (const asset of ['/styles/shared.css', '/tokens/index.css', '/favicon.ico']) {
      const href = resolveAssetUrl(asset);
      const path = new URL(href, 'http://localhost').pathname;
      if (path !== `/anza${asset}`) {
        throw new Error(`Expected /anza${asset}, got ${href}`);
      }
    }
  });
});
