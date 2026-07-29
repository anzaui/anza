/**
 * src/core/router/history.js
 *
 * Programmatic history navigation wrapper.
 * Provides a clean interface for page-level traversals mapping directly
 * to the Navigation API (native or polyfilled).
 *
 * Source: doc 09 — Routing §2, §10, §12
 */

import { resolveAppUrl } from './base.js';

/** Normalized result shape for callers that await .finished. */
const resolved = { committed: Promise.resolve(), finished: Promise.resolve() };

/**
 * Initiates a programmatic push navigation.
 * Always returns { committed, finished } promises.
 */
export function navigate(url, options = {}) {
  if (typeof window === 'undefined' || !window.navigation) return resolved;
  const result = window.navigation.navigate(resolveAppUrl(url), options);
  return result ?? resolved;
}

/**
 * Initiates a programmatic replace navigation (replaces current history entry).
 */
export function replace(url, options = {}) {
  if (typeof window === 'undefined' || !window.navigation) return resolved;
  const result = window.navigation.navigate(resolveAppUrl(url), { history: 'replace', ...options });
  return result ?? resolved;
}

/**
 * Navigates back in history by one step.
 */
export function back() {
  if (typeof window === 'undefined' || !window.navigation) return resolved;
  return window.navigation.back() ?? resolved;
}

/**
 * Navigates forward in history by one step.
 */
export function forward() {
  if (typeof window === 'undefined' || !window.navigation) return resolved;
  return window.navigation.forward() ?? resolved;
}

/**
 * Traverses history by a numeric delta.
 */
export function go(delta) {
  if (typeof window === 'undefined' || !window.navigation) return resolved;
  return window.navigation.go(delta) ?? resolved;
}

/**
 * Returns a list of all active history entries.
 */
export function entries() {
  if (typeof window === 'undefined' || !window.navigation) return [];
  return typeof window.navigation.entries === 'function' ? window.navigation.entries() : [];
}

/**
 * Returns the current active history entry.
 */
export function current() {
  if (typeof window === 'undefined' || !window.navigation) return null;
  return window.navigation.currentEntry || null;
}

/**
 * Checks if a backward navigation traversal is valid.
 * Prefers native canGoBack property, falls back to entries inspection,
 * and returns false (not true) when state is unknown.
 */
export function canBack() {
  if (typeof window === 'undefined' || !window.navigation) return false;

  // Use native canGoBack when available (Chrome 123+)
  if (typeof window.navigation.canGoBack === 'boolean') {
    return window.navigation.canGoBack;
  }

  if (typeof window.navigation.entries === 'function') {
    const list = window.navigation.entries();
    const active = window.navigation.currentEntry;
    if (active && list.length > 0) {
      return list.indexOf(active) > 0;
    }
  }

  return false;
}

/**
 * Checks if a forward navigation traversal is valid.
 * Prefers native canGoForward property, falls back to entries inspection,
 * and returns false (not true) when state is unknown.
 */
export function canForward() {
  if (typeof window === 'undefined' || !window.navigation) return false;

  // Use native canGoForward when available (Chrome 123+)
  if (typeof window.navigation.canGoForward === 'boolean') {
    return window.navigation.canGoForward;
  }

  if (typeof window.navigation.entries === 'function') {
    const list = window.navigation.entries();
    const active = window.navigation.currentEntry;
    if (active && list.length > 0) {
      const idx = list.indexOf(active);
      return idx >= 0 && idx < list.length - 1;
    }
  }

  return false;
}
