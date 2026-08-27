/**
 * tests/core/theme/theme.test.js
 *
 * localStorage key + legacy migration for @anzaui/anza/theme.
 */

import { theme, migrateThemeStorage } from '../../../src/core/theme/index.js';

describe('@anzaui/anza/theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('persists under anza-theme', () => {
    theme.set('dark');
    if (localStorage.getItem('anza-theme') !== 'dark') {
      throw new Error(`Expected anza-theme "dark", got "${localStorage.getItem('anza-theme')}"`);
    }
    if (localStorage.getItem('theme') !== null) {
      throw new Error('Legacy theme key should remain unset after theme.set');
    }
    if (theme.get() !== 'dark') {
      throw new Error(`Expected theme.get() "dark", got "${theme.get()}"`);
    }
  });

  it('migrates legacy theme key to anza-theme', () => {
    localStorage.setItem('theme', 'high-contrast');
    migrateThemeStorage();
    if (localStorage.getItem('anza-theme') !== 'high-contrast') {
      throw new Error(`Expected migrated anza-theme, got "${localStorage.getItem('anza-theme')}"`);
    }
    if (localStorage.getItem('theme') !== null) {
      throw new Error('Legacy theme key should be removed after migration');
    }
  });

  it('does not overwrite anza-theme with legacy theme', () => {
    localStorage.setItem('anza-theme', 'light');
    localStorage.setItem('theme', 'dark');
    migrateThemeStorage();
    if (localStorage.getItem('anza-theme') !== 'light') {
      throw new Error(`Expected anza-theme to stay "light", got "${localStorage.getItem('anza-theme')}"`);
    }
    if (localStorage.getItem('theme') !== 'dark') {
      throw new Error('Legacy key should be left alone when anza-theme already exists');
    }
  });
});
