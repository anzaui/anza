/**
 * tests/core/platform/supports.test.js
 *
 * Supports feature detection test suite.
 *
 * Source: plan.md Phase 6-A, core/platform/supports.js
 */

import { supports, reset } from '@anzaui/anza/platform';

describe('Supports Feature Detection', () => {
  it('should expose valid boolean feature flags', () => {
    const flags = [
      'navigationAPI',
      'urlPattern',
      'declarativeShadowDOM',
      'customStatePseudo',
      'formAssociated',
      'popoverAPI',
      'anchorPositioning',
      'viewTransitions',
      'scrollTimeline',
      'viewTimeline',
      'schedulerPostTask',
      'schedulerYield',
      'contentVisibility',
      'cssScope',
      'cssLayer',
      'cssModuleScripts',
      'importMaps',
      'sanitizerAPI',
      'trustedTypes',
      'subtleCrypto',
      'opfs',
      'storageManager',
      'fileSystemPickers',
      'compression',
      'storagePersistence',
      'backgroundSync',
      'speculationRules',
      'sharedWorker',
      'webLocks',
      'offscreenCanvas',
      'pushAPI',
      'notificationsAPI',
      'screenWakeLock',
      'idleDetection',
      'webAuthn'
    ];

    for (const flag of flags) {
      const val = supports[flag];
      if (typeof val !== 'boolean') {
        throw new Error(`Expected supports.${flag} to be a boolean, got ${typeof val}`);
      }
    }
  });

  it('should support resetting lazy-evaluated cached values and re-evaluating them', () => {
    const origCompression = globalThis.CompressionStream;
    try {
      globalThis.CompressionStream = undefined;
      reset('compression');
      const val1 = supports.compression;
      if (val1 !== false) {
        throw new Error('Expected supports.compression to be false when CompressionStream is missing');
      }

      globalThis.CompressionStream = class {};
      reset('compression');
      const val2 = supports.compression;
      if (val2 !== true) {
        throw new Error('Expected supports.compression to be true after mock redefine and reset');
      }
    } finally {
      globalThis.CompressionStream = origCompression;
      reset('compression');
    }
  });
});
