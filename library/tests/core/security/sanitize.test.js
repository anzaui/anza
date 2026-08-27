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
