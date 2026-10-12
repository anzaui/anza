/**
 * tests/core/exports.test.js
 *
 * Public-surface checks for symbols exported by FREEZE §3.2 (D5):
 * router gate/ready/reset, security seal/unseal, storage quota.
 */

import * as routerModule from '@anzaui/anza/router';
import * as securityModule from '@anzaui/anza/security';
import * as storageModule from '@anzaui/anza/storage';
import * as boot from '../../src/core/router/boot.js';
import * as crypto from '../../src/core/security/crypto.js';
import { QuotaManager, quota as quotaInstance } from '../../src/core/storage/quota.js';

function same(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected the internal binding to be re-exported`);
}

describe('Public exports (FREEZE §3.2)', () => {
  it('router exports gate, ready and reset from the boot module', () => {
    same(routerModule.gate, boot.gate, 'gate');
    same(routerModule.ready, boot.ready, 'ready');
    same(routerModule.reset, boot.reset, 'reset');
  });

  it('router does not expose boot internals', () => {
    for (const name of ['boot', 'isCallback', 'resolveTag', 'runCallback', 'get']) {
      if (name in routerModule) throw new Error(`${name} should stay internal`);
    }
  });

  it('security exports seal and unseal (named and on the facade)', () => {
    same(securityModule.seal, crypto.seal, 'seal');
    same(securityModule.unseal, crypto.unseal, 'unseal');
    same(securityModule.security.seal, crypto.seal, 'security.seal');
    same(securityModule.security.unseal, crypto.unseal, 'security.unseal');
  });

  it('seal/unseal round-trip through the public export', async () => {
    const key = await securityModule.generateKey();
    const sealed = await securityModule.seal(key, 'hello');
    if (typeof sealed !== 'string') throw new Error('seal should return a base64 string');
    const plain = await securityModule.unseal(key, sealed);
    if (plain !== 'hello') throw new Error(`unseal returned "${plain}"`);
  });

  it('storage exports the quota manager singleton, not CacheStorage', () => {
    same(storageModule.quota, quotaInstance, 'quota');
    if (!(storageModule.quota instanceof QuotaManager)) throw new Error('quota should be a QuotaManager');
    if ('CacheStorage' in storageModule) throw new Error('CacheStorage should stay internal');
  });
});
