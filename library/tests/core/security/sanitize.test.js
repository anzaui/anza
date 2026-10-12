/**
 * tests/core/security/sanitize.test.js
 *
 * Core security HTML sanitizer execution test suite.
 *
 * Source: plan.md Phase 6-A, core/security/sanitize.js
 */

import { sanitize } from '@anzaui/anza/security';

describe('HTML Security Sanitizer', () => {
  it('should preserve safe and approved standard markup tags', () => {
    const safeHtml = '<p class="content-text" id="p1">Hello <strong>world</strong>!</p>';
    const cleaned = String(sanitize(safeHtml));
    
    if (!cleaned.includes('Hello') || !cleaned.includes('strong') || !cleaned.includes('content-text')) {
      throw new Error(`Sanitizer altered safe markup: ${cleaned}`);
    }
  });

  it('should strip script tags and unallowed tags completely', () => {
    const malformed = '<div><script>alert("xss")</script><iframe src="/hack"></iframe><p>Safe content</p></div>';
    const cleaned = String(sanitize(malformed));

    if (cleaned.includes('script') || cleaned.includes('iframe') || cleaned.includes('alert')) {
      throw new Error(`Sanitizer failed to remove malicious tags: ${cleaned}`);
    }
    if (!cleaned.includes('Safe content')) {
      throw new Error(`Sanitizer accidentally removed safe content: ${cleaned}`);
    }
  });

  it('should evict inline dynamic handler attributes and event triggers', () => {
    const tainted = '<p class="content" onclick="exploit()" onload="hack()">Click me</p>';
    const cleaned = String(sanitize(tainted));

    if (cleaned.includes('onclick') || cleaned.includes('exploit') || cleaned.includes('onload') || cleaned.includes('hack')) {
      throw new Error(`Sanitizer failed to purge onload/onclick handlers: ${cleaned}`);
    }
    if (!cleaned.includes('Click me') || !cleaned.includes('class="content"')) {
      throw new Error(`Sanitizer corrupted approved layouts: ${cleaned}`);
    }
  });

  it('should invalidate href attributes referencing javascript: URLs', () => {
    const tainted = '<a href="javascript:alert(1)" class="button">Visit</a>';
    const cleaned = String(sanitize(tainted));

    if (cleaned.includes('javascript') || cleaned.includes('alert')) {
      throw new Error(`Sanitizer failed to purge javascript: href link: ${cleaned}`);
    }
  });

  it('should return TrustedHTML when window.trustedTypes is supported', () => {
    if (typeof window !== 'undefined' && window.trustedTypes) {
      const output = sanitize('<p>test</p>');
      if (typeof output !== 'object' || output.constructor.name !== 'TrustedHTML') {
        throw new Error('Expected TrustedHTML object when trustedTypes is supported');
      }
    }
  });
});

describe('HTML Security Sanitizer — fallback path (no native Sanitizer)', () => {
  let saved;
  before(() => {
    saved = Object.getOwnPropertyDescriptor(globalThis, 'Sanitizer');
    if (saved) delete globalThis.Sanitizer;
    if (typeof globalThis.Sanitizer !== 'undefined') throw new Error('could not stub Sanitizer');
  });
  after(() => {
    if (saved) Object.defineProperty(globalThis, 'Sanitizer', saved);
  });

  /** Re-parse the sanitizer output into a fragment for inspection. */
  const parse = (html) => {
    const t = document.createElement('template');
    t.innerHTML = String(sanitize(html));
    return t.content;
  };

  const hrefPayloads = [
    'javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    '\x01javascript:alert(1)',
    ' \x1fjavascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)'
  ];

  for (const payload of hrefPayloads) {
    it(`drops href=${JSON.stringify(payload)}`, () => {
      const a = document.createElement('a');
      a.setAttribute('href', payload);
      a.textContent = 'x';
      const out = parse(a.outerHTML).querySelector('a');
      if (!out) throw new Error('anchor removed entirely');
      if (out.hasAttribute('href')) throw new Error(`unsafe href kept: ${out.getAttribute('href')}`);
    });
  }

  it('drops an entity-encoded javascript: href', () => {
    const out = parse('<a href="&#106;avascript:alert(1)">x</a>').querySelector('a');
    if (out.hasAttribute('href')) throw new Error(`kept: ${out.getAttribute('href')}`);
  });

  it('drops a javascript: img src', () => {
    const out = parse('<img src="javascript:alert(1)" alt="a">').querySelector('img');
    if (!out || out.hasAttribute('src')) throw new Error('unsafe src kept');
    if (out.getAttribute('alt') !== 'a') throw new Error('alt lost');
  });

  it('drops srcset', () => {
    const out = parse('<img src="/a.png" srcset="javascript:alert(1) 1x">').querySelector('img');
    if (out.hasAttribute('srcset')) throw new Error('srcset kept');
    if (out.getAttribute('src') !== '/a.png') throw new Error('safe src lost');
  });

  it('removes svg <a xlink:href> and <use> vectors', () => {
    const html = '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a><use href="data:image/svg+xml,<svg onload=alert(1)>"/></svg>';
    const s = String(sanitize(html));
    if (/javascript|data:|<svg|<use/i.test(s)) throw new Error(`svg vector survived: ${s}`);
  });

  it('drops style and id attributes', () => {
    const out = parse('<p id="cookie" style="background:url(//evil)" class="k">x</p>').querySelector('p');
    if (out.hasAttribute('id') || out.hasAttribute('style')) throw new Error('style/id kept');
    if (out.getAttribute('class') !== 'k') throw new Error('class lost');
  });

  it('forces rel="noopener noreferrer" when target is kept', () => {
    const out = parse('<a href="https://example.com" target="_blank" rel="opener">x</a>').querySelector('a');
    if (out.getAttribute('target') !== '_blank') throw new Error('target lost');
    if (out.getAttribute('rel') !== 'noopener noreferrer') throw new Error(`rel: ${out.getAttribute('rel')}`);
  });

  it('keeps http, https, mailto and relative URLs', () => {
    const frag = parse('<a href="https://a.test/">1</a><a href="http://a.test/">2</a><a href="mailto:x@a.test">3</a><a href="/docs/x">4</a><a href="#top">5</a>');
    const hrefs = [...frag.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    const want = ['https://a.test/', 'http://a.test/', 'mailto:x@a.test', '/docs/x', '#top'];
    if (JSON.stringify(hrefs) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(hrefs)}`);
  });
});
