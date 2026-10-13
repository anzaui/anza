/**
 * tests/elements/forms/a11y.test.js
 *
 * ARIA and keyboard behaviour of the choice controls and ui-steps: one tab
 * stop per control, valid roles, aria-checked (incl. mixed), radio group
 * arrow keys with a roving tabindex, and aria-current on the active step.
 */

import '../../../src/elements/forms/checkbox/index.js';
import '../../../src/elements/forms/radio/index.js';
import '../../../src/elements/forms/toggle/index.js';
import '../../../src/elements/navigation/steps/index.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function mounted(...els) {
  for (let i = 0; i < 200 && !els.every((el) => el._ctx); i++) await tick(10);
  if (!els.every((el) => el._ctx)) throw new Error('elements never mounted');
  await tick(0);
}

function key(el, name) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

describe('choice controls accessibility', () => {
  let host;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  for (const tag of ['ui-checkbox', 'ui-radio', 'ui-toggle']) {
    it(`${tag} has exactly one tab stop (the host)`, async () => {
      host.innerHTML = `<${tag} name="solo">Label</${tag}>`;
      const el = host.firstElementChild;
      await mounted(el);
      assert(el.tabIndex === 0, `host tabIndex ${el.tabIndex}`);
      const inner = el.shadowRoot.querySelectorAll('[tabindex], button, input, a[href]');
      assert(inner.length === 0, `${inner.length} focusable element(s) inside the shadow root`);
    });
  }

  it('ui-checkbox exposes role and aria-checked, including mixed', async () => {
    host.innerHTML = '<ui-checkbox>Accept</ui-checkbox>';
    const box = host.firstElementChild;
    await mounted(box);
    assert(box.getAttribute('role') === 'checkbox', `role ${box.getAttribute('role')}`);
    assert(box.getAttribute('aria-checked') === 'false', `aria-checked ${box.getAttribute('aria-checked')}`);
    box.click();
    await tick();
    assert(box.getAttribute('aria-checked') === 'true', 'aria-checked not true after click');
    box.checked = false;
    box.indeterminate = true;
    await tick();
    assert(box.getAttribute('aria-checked') === 'mixed', `indeterminate gives ${box.getAttribute('aria-checked')}`);
    box.disabled = true;
    await tick();
    assert(box.getAttribute('aria-disabled') === 'true', 'aria-disabled missing');
    assert(!box.hasAttribute('tabindex'), 'disabled checkbox is still focusable');
  });

  it('a radio group has one tab stop and moves with arrow keys', async () => {
    host.innerHTML = `
      <ui-radio name="size" value="s">S</ui-radio>
      <ui-radio name="size" value="m" checked>M</ui-radio>
      <ui-radio name="size" value="l" disabled>L</ui-radio>
      <ui-radio name="size" value="xl">XL</ui-radio>`;
    const [s, m, l, xl] = host.querySelectorAll('ui-radio');
    await mounted(s, m, l, xl);
    await tick(10);
    const stops = () => [s, m, l, xl].map((r) => r.getAttribute('tabindex') ?? 'none').join(',');
    assert(stops() === '-1,0,none,-1', `tabindex ${stops()}`);

    m.focus();
    const changes = [];
    host.addEventListener('change', (e) => changes.push(e.target.value));
    const down = key(m, 'ArrowDown');
    await tick();
    assert(down.defaultPrevented, 'ArrowDown not handled');
    assert(xl.checked && !m.checked, 'ArrowDown did not select the next enabled radio (skipping disabled)');
    assert(document.activeElement === xl, 'focus did not move to the selected radio');
    assert(stops() === '-1,-1,none,0', `tabindex after ArrowDown ${stops()}`);
    assert(changes.includes('xl'), 'change not fired for the new radio');

    key(xl, 'ArrowRight');
    await tick();
    assert(s.checked && document.activeElement === s, 'ArrowRight did not wrap to the first radio');

    key(s, 'ArrowUp');
    await tick();
    assert(xl.checked && document.activeElement === xl, 'ArrowUp did not wrap to the last radio');

    key(xl, 'ArrowLeft');
    await tick();
    assert(m.checked && document.activeElement === m, 'ArrowLeft did not move back');
  });

  it('an unchecked radio group makes the first enabled radio the tab stop', async () => {
    host.innerHTML = `
      <ui-radio name="c" value="a" disabled>A</ui-radio>
      <ui-radio name="c" value="b">B</ui-radio>
      <ui-radio name="c" value="c">C</ui-radio>`;
    const radios = [...host.querySelectorAll('ui-radio')];
    await mounted(...radios);
    await tick(10);
    const stops = radios.map((r) => r.getAttribute('tabindex') ?? 'none').join(',');
    assert(stops === 'none,0,-1', `tabindex ${stops}`);
    assert(radios.every((r) => r.getAttribute('aria-checked') === 'false'), 'aria-checked missing');
  });
});

describe('ui-steps accessibility', () => {
  let steps;

  beforeEach(async () => {
    steps = document.createElement('ui-steps');
    steps.setAttribute('active', '1');
    steps.innerHTML = '<div>Cart</div><div>Shipping</div><div>Pay</div>';
    document.body.appendChild(steps);
    await mounted(steps);
    await tick(10);
  });

  afterEach(() => steps.remove());

  it('is a list of listitems with aria-current on the active step', async () => {
    const items = [...steps.children];
    assert(steps.getAttribute('role') === 'list', `host role ${steps.getAttribute('role')}`);
    assert(items.every((item) => item.getAttribute('role') === 'listitem'), 'steps are not listitems');
    assert(!document.querySelector('[role="step"]'), 'invalid role="step" present');
    assert(items[1].getAttribute('aria-current') === 'step', 'active step lacks aria-current="step"');
    assert(!items[0].hasAttribute('aria-current') && !items[2].hasAttribute('aria-current'), 'aria-current on inactive steps');

    steps.active = 2;
    await tick();
    assert(items[2].getAttribute('aria-current') === 'step', 'aria-current did not move');
    assert(!items[1].hasAttribute('aria-current'), 'old step kept aria-current');
  });
});
