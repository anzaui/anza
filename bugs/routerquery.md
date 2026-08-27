# Bug Report: Router Query Parameter Array and Prop Casting Inconsistency

## 1. Summary
When registering components with query parameter declarations using string arrays (e.g. `query: ['q']`) or when navigating to routes with undeclared query parameters matching component `props` declarations, the router's `buildRouteContext` returned `null` for query parameters, and `orchestrator.js` failed to cast undeclared query parameters into component properties.

## 2. Affected Files
- [intercept.js](file:///home/femar/A10B/anza/library/src/core/router/intercept.js) (`buildRouteContext`, `pushToElement`)
- [orchestrator.js](file:///home/femar/A10B/anza/library/src/core/ui/define/orchestrator.js) (`initOrchestrator` -> `router.on('found')`)

## 3. Root Cause Analysis
1. In `intercept.js`, `buildRouteContext` assumed `spec.query` was an array of `{ name, cast }` descriptor objects. When passed an array of strings (e.g. `['q']`), `d.name` resolved to `undefined`, causing `searchParams.get(undefined)` which yielded `null`.
2. In `orchestrator.js`, the query mapping loop only checked `spec.query`. It did not map query parameters that were declared directly in `spec.props` without an explicit `spec.query` declaration.

## 4. Fix Applied
1. Normalized `paramDecls` and `queryDecls` in `buildRouteContext` and `pushToElement` to handle both string items and `{ name, cast }` objects seamlessly.
2. Updated `orchestrator.js` to iterate over all candidate query keys (both explicit `spec.query` keys and keys present in `spec.props` that match query parameters), correctly casting booleans and numbers.

## 5. Verification
Verified via:
- `tests/core/router/declarative.test.js` (`should cast path parameters, query variables, and hash based on element props definitions`)
- `tests/core/router/outlet.test.js` (`should cast parameters, query variables, and hash onto child element props`)
- Full test suite passed (371 tests).
