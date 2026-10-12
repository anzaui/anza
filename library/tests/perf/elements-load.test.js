/**
 * tests/perf/elements-load.test.js
 *
 * P12 load benchmark: counts the network requests caused by
 * `import '@anzaui/anza/elements'` (resource timing, so cached responses
 * still count as requests made by the page).
 *
 * Budgets:
 *  - importing the full kit makes no style/template/tags fetches (lazy, P1);
 *  - connecting one element fetches only its own resources, in parallel (P2).
 *
 * Numbers are printed as `[perf] …` lines in the test output.
 */

const settle = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchEntries(since) {
  return performance
    .getEntriesByType('resource')
    .slice(since)
    .filter((e) => e.initiatorType === 'fetch');
}

function moduleEntries(since) {
  return performance
    .getEntriesByType('resource')
    .slice(since)
    .filter((e) => e.initiatorType !== 'fetch' && e.name.endsWith('.js'));
}

describe('elements load benchmark (P12)', () => {
  it('importing the element kit fetches no element resources until one is used', async () => {
    performance.setResourceTimingBufferSize(10000);
    const start = performance.getEntriesByType('resource').length;
    const t0 = performance.now();

    await import('@anzaui/anza/elements');
    const imported = performance.now() - t0;
    await settle(300);

    const fetches = fetchEntries(start);
    const modules = moduleEntries(start);
    console.log(
      `[perf] import elements: ${fetches.length} resource fetches, ` +
        `${modules.length} JS modules, ${imported.toFixed(1)} ms to evaluate`
    );

    if (fetches.length !== 0) {
      throw new Error(
        `Expected 0 define-time fetches, got ${fetches.length}:\n` +
          fetches.map((e) => e.name.replace(location.origin, '')).join('\n')
      );
    }

    // First use of one element fetches only that element's resources.
    const before = performance.getEntriesByType('resource').length;
    const t1 = performance.now();
    const btn = document.createElement('ui-button');
    document.body.appendChild(btn);
    for (let i = 0; i < 200 && !btn.shadowRoot?.querySelector('button'); i++) await settle(5);
    const firstRender = performance.now() - t1;
    await settle(50);
    btn.remove();

    const used = fetchEntries(before);
    console.log(`[perf] first <ui-button>: ${used.length} fetches, rendered in ${firstRender.toFixed(1)} ms`);
    if (used.length > 3) {
      throw new Error(`Expected at most style + template + tags for one element, got ${used.length}`);
    }
    if (!used.every((e) => e.name.includes('/elements/primitives/button/'))) {
      throw new Error('Expected only ui-button resources to be fetched');
    }
  });
});
