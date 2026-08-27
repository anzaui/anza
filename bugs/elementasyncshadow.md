# Bug Report: Asynchronous Template Fetching Race in Custom Elements

## 1. Summary
Custom elements defined using external HTML template paths (e.g. `ui.element('ui-field', { template: './index.html' })`) perform asynchronous module and template asset fetching upon attachment to the DOM. When test cases or downstream consumers synchronously queried the Shadow DOM immediately after `document.createElement(...)` / `appendChild(...)`, the shadow tree was still empty or unattached, causing assertion errors.

## 2. Affected Files
- [field.test.js](file:///home/femar/A10B/anza/library/tests/elements/forms/field.test.js)
- [tabs.test.js](file:///home/femar/A10B/anza/library/tests/elements/navigation/tabs.test.js)
- [dialog.test.js](file:///home/femar/A10B/anza/library/tests/elements/overlay/dialog.test.js)
- [popover.test.js](file:///home/femar/A10B/anza/library/tests/elements/overlay/popover.test.js)
- Component lifecycle testing harnesses

## 3. Root Cause Analysis
`ui.element` uses native ES module URL resolution and `fetch` to load template and style assets asynchronously at connection time if not pre-compiled into inline strings. If tests do not poll or await the initialization readiness of the shadow tree before checking internal structural slots and elements, a race condition occurs.

## 4. Fix Applied
Updated element test suites to await the shadow tree readiness poll loop matching the pattern established in primitive elements (`button.test.js`), ensuring robust deterministic test runs across all headless browser execution environments.

## 5. Verification
- All element test suites pass deterministically.
