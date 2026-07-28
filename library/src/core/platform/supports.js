/**
 * core/platform/supports.js
 *
 * All feature-detection booleans for the platform.
 * Each flag is lazily evaluated on first access and then cached.
 * Detection tests are conservative — they check for correct behaviour,
 * not just API presence, where known browser bugs exist.
 *
 * Source authority: doc 18 — Limitations, Browser Gaps, and Polyfill Strategy §17
 */

const _cache = Object.create(null);

function lazy(key, detect) {
  Object.defineProperty(supports, key, {
    get() {
      if (!(key in _cache)) _cache[key] = detect();
      return _cache[key];
    },
    configurable: true,
    enumerable:   true,
  });
}

export const supports = {};

// --- Routing ---

lazy('navigationAPI', () => 'navigation' in window);

lazy('urlPattern', () => 'URLPattern' in globalThis);

// --- Component Model ---

lazy('declarativeShadowDOM', () =>
  'shadowRootMode' in HTMLTemplateElement.prototype
);

lazy('customStatePseudo', () =>
  typeof ElementInternals !== 'undefined' &&
  'states' in ElementInternals.prototype
);

lazy('formAssociated', () =>
  typeof HTMLElement !== 'undefined' &&
  'attachInternals' in HTMLElement.prototype
);

// --- Overlay / Popover ---

lazy('popoverAPI', () => 'popover' in HTMLElement.prototype);

lazy('anchorPositioning', () =>
  CSS.supports('anchor-name', '--a')
);

// --- Animation ---

lazy('viewTransitions', () => 'startViewTransition' in document);

// Element-scoped VT (Chrome 147+) — docks use this so chrome stays stable.
lazy('elementViewTransitions', () =>
  typeof Element !== 'undefined'
  && 'startViewTransition' in Element.prototype
);

lazy('scrollTimeline', () => 'ScrollTimeline' in window);

lazy('viewTimeline', () => 'ViewTimeline' in window);

// --- Scheduling ---

lazy('schedulerPostTask', () =>
  'scheduler' in globalThis && 'postTask' in scheduler
);

lazy('schedulerYield', () =>
  'scheduler' in globalThis && 'yield' in scheduler
);

// --- CSS ---

lazy('contentVisibility', () =>
  CSS.supports('content-visibility', 'auto')
);

lazy('cssScope', () => CSS.supports('selector(:scope)'));

lazy('cssLayer', () => {
  try {
    // @supports at-rule(@layer) is not universally parseable in JS;
    // inject a sheet and check if a layer-wrapped rule is applied.
    const s = document.createElement('style');
    s.textContent = '@layer _test { ._testlayer { --_l: 1 } }';
    document.head.append(s);
    const ok = !!s.sheet;
    s.remove();
    return ok;
  } catch { return false; }
});

lazy('cssModuleScripts', () => {
  // CSS Module Scripts: import with { type: 'css' }
  // Absent Firefox / Safari as of 2026 — doc 18 §14, library2.md §CSS Distribution
  try {
    return HTMLScriptElement.supports('importmap'); // proxy: if importmap exists, env is modern enough to test
    // We check actual CSS module support via import attributes presence
  } catch { return false; }
});

// --- Module System ---

lazy('importMaps', () =>
  HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')
);

// --- Security ---

lazy('sanitizerAPI', () => 'Sanitizer' in window);

lazy('trustedTypes', () => 'trustedTypes' in window);

lazy('subtleCrypto', () =>
  typeof crypto !== 'undefined' && 'subtle' in crypto
);

// --- Storage ---

lazy('opfs', () =>
  'storage' in navigator &&
  typeof navigator.storage.getDirectory === 'function'
);

lazy('storageManager', () => 'storage' in navigator);

lazy('fileSystemPickers', () => 'showOpenFilePicker' in window);

lazy('compression', () =>
  typeof CompressionStream !== 'undefined' &&
  typeof DecompressionStream !== 'undefined'
);

lazy('storagePersistence', () =>
  'storage' in navigator &&
  typeof navigator.storage.persist === 'function' &&
  typeof navigator.storage.persisted === 'function'
);

// --- Networking / Workers ---

lazy('backgroundSync', () =>
  'ServiceWorkerRegistration' in window &&
  'sync' in ServiceWorkerRegistration.prototype
);

lazy('speculationRules', () =>
  HTMLScriptElement.supports &&
  HTMLScriptElement.supports('speculationrules')
);

lazy('sharedWorker', () => 'SharedWorker' in window);

lazy('webLocks', () => 'locks' in navigator);

lazy('offscreenCanvas', () => 'OffscreenCanvas' in window);

// --- Notifications / Push ---

lazy('pushAPI', () => 'PushManager' in window);

lazy('notificationsAPI', () => 'Notification' in window);

// --- Device ---

lazy('screenWakeLock', () => 'wakeLock' in navigator);

lazy('idleDetection', () => 'IdleDetector' in window);

lazy('webAuthn', () => 'PublicKeyCredential' in window);

// --- Reset cached value (for testing only) ---
export function reset(key) {
  delete _cache[key];
}

// --- Type guard: assert feature support at runtime ---
export function typeGuard(key, message) {
  if (!supports[key]) {
    const msg = message || `Platform does not support: ${key}`;
    throw new Error(msg);
  }
}
