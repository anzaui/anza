/**
 * tests/types/router-types.test.ts
 *
 * TypeScript compilation-only tests for router types.
 */

import {
  router,
  navigate,
  register,
  match,
  RouteRecord,
  MatchResult
} from '@anzaui/anza/router';

// 1. Test route registration and matching types
register('/path/:id', 'tag-name', { layout: 'main' });

async function testMatch() {
  const result: MatchResult | null = await match('/path/42');
  if (result) {
    const route: RouteRecord = result.route;
    const tag: string = result.tag;
    const params: Record<string, string> = result.params;
    const id: string = params.id;
  }
}

// 2. Test event listeners
const disposer = router.on('found', (payload) => {
  const t: string = payload.tag;
  const p: Record<string, string> = payload.params;
  const d: string = payload.direction;
});

disposer();

// 3. Test navigation
navigate('/home', { history: 'replace' });

// 4. Test fluent transition controller
router.nav.to('/dashboard')
  .on('found', (payload) => {
    const t: string = payload.tag;
  })
  .on('notfound', (payload) => {
    const u: string = payload.url;
  })
  .on('error', (err) => {
    const msg: string = err.message;
  });

// 5. Test sync controls
router.sync.start();
const isActive: boolean = router.sync.active();
router.sync.stop();
router.sync.close();

// 6. Test connection pool
router.registerConnection('/sync/:id', ({ url, params }) => {
  const u: URL = url;
  const id: string = params.id;
  return {
    close() { }
  };
});

// 7. Test container APIs
router.registerContainer('main', document.createElement('div'));
const container = router.getContainer('main');
router.unregisterContainer('main');
router.clearContainers();

// Test @ts-expect-error cases to verify invalid configurations are caught by compiler
// @ts-expect-error: Invalid event name
router.on('invalid_event', () => { });

// @ts-expect-error: wrong type for redirect URL in guard callback
router.guard((to, controller) => {
  return 123;
});
