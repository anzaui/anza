/**
 * core/theme/index.js
 *
 * Automatic theme switching. Attaches to window.theme on import and
 * restores the saved preference (or respects OS dark mode) without any
 * manual init call. The user can still import { theme } and call set or
 * toggle — both update the same global instance.
 */

const KEY = 'anza-theme';
/** Pre-`anza-theme` persistence key; migrated once on restore. */
const LEGACY_KEY = 'theme';

function root() {
  return document.documentElement;
}

/**
 * Move legacy `theme` → `anza-theme` when the new key is absent.
 * Exported for unit tests; safe to call repeatedly.
 */
export function migrateThemeStorage(storage = localStorage) {
  try {
    if (storage.getItem(KEY) != null) return;
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy == null) return;
    storage.setItem(KEY, legacy);
    storage.removeItem(LEGACY_KEY);
  } catch (_) {}
}

function readSavedTheme() {
  try {
    migrateThemeStorage();
    return localStorage.getItem(KEY);
  } catch (_) {
    return null;
  }
}

function restore() {
  const saved = readSavedTheme();

  if (saved && saved !== 'auto') {
    root().dataset.theme = saved;
    return;
  }

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    root().dataset.theme = 'dark';
  }
}

export const theme = {
  /** Return the active theme name: light, dark, high-contrast, or auto. */
  get() {
    const attr = root().dataset.theme;
    if (attr) return attr;
    return 'auto';
  },

  /** Apply a theme name and persist it. */
  set(name) {
    const el = root();
    if (name === 'auto') {
      delete el.dataset.theme;
    } else {
      el.dataset.theme = name;
    }
    try {
      localStorage.setItem(KEY, name);
    } catch (_) {}
  },

  /** Return the effective theme: light, dark, or high-contrast. Resolves auto via OS preference. */
  resolved() {
    const current = this.get();
    if (current !== 'auto') return current;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  },

  /** Toggle between light and dark. */
  toggle() {
    const resolved = this.resolved();
    this.set(resolved === 'dark' ? 'light' : 'dark');
  }
};

// Auto-bootstrap on client load.
if (typeof window !== 'undefined') {
  if (!('theme' in window)) {
    Object.defineProperty(window, 'theme', {
      value: theme,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  restore();
}
