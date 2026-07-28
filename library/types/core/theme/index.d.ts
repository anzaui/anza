/**
 * types/core/theme/index.d.ts
 *
 * TypeScript declarations for the anza theme API.
 */

export interface ThemeApi {
  /** Return the active theme name: light, dark, high-contrast, or auto. */
  get(): string;

  /** Apply a theme name and persist it. */
  set(name: string): void;

  /** Return the effective theme: light, dark, or high-contrast. Resolves auto via OS preference. */
  resolved(): string;

  /** Toggle between light and dark. */
  toggle(): void;
}

export const theme: ThemeApi;

/**
 * Move legacy `theme` localStorage key to `anza-theme` when the new key is absent.
 * Called automatically on theme module load; safe to call repeatedly.
 */
export function migrateThemeStorage(storage?: Storage): void;
