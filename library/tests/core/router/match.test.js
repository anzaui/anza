/**
 * tests/core/router/match.test.js
 *
 * Core router matching execution test suite.
 *
 * Source: plan.md Phase 6-A, core/router/match.js
 */

import { register, match, clear, getRoutes } from '@anzaui/anza/router';

describe('Router Matcher', () => {
  beforeEach(() => {
    clear();
  });

  it('should register routes successfully', () => {
    const handler = () => 'test';
    register('/dashboard', handler, { title: 'Dashboard' });

    const routes = getRoutes();
    if (routes.length !== 1) {
      throw new Error(`Expected 1 route, got ${routes.length}`);
    }
    if (routes[0].patternStr !== '/dashboard') {
      throw new Error(`Expected pattern "/dashboard", got "${routes[0].patternStr}"`);
    }
  });

  it('should match exact pathnames and extract parameters', async () => {
    const handler = () => 'user';
    register('/users/:id', handler);

    const m = await match('/users/42');
    if (!m) {
      throw new Error('Expected path match, got null');
    }
    if (m.route.handler !== handler) {
      throw new Error('Matched wrong route handler');
    }
    if (m.params.id !== '42') {
      throw new Error(`Expected param id "42", got "${m.params.id}"`);
    }
  });

  it('should return null when no matches exist', async () => {
    register('/dashboard', () => {});
    const m = await match('/settings');
    if (m !== null) {
      throw new Error('Expected match to return null');
    }
  });
});
