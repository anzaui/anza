/**
 * src/core/security/sanitize.js
 *
 * HTML Sanitizer wrapper.
 * Transparently targets browser Sanitizer APIs if available, falling back to a
 * high-performance DOMParser-based secure sanitization tree that strips unapproved
 * elements, JavaScript links, and dynamic scripting attributes.
 *
 * Source: doc 15 — Security Architecture §2, §4
 */

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code',
  'col', 'colgroup', 'data', 'dd', 'del', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
  'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img',
  'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp',
  'section', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr'
]);

const ALLOWED_ATTRS = new Set([
  'href', 'title', 'src', 'alt', 'width', 'height', 'class', 'id', 'target', 'rel', 'style'
]);

let policy = null;
if (typeof window !== 'undefined' && window.trustedTypes) {
  try {
    policy = window.trustedTypes.createPolicy('core-sanitize', {
      createHTML: (html) => html
    });
  } catch (err) {
    console.warn('Trusted Types policy "core-sanitize" registration failed or already registered:', err);
  }
}

/**
 * Sanitizes an HTML string to mitigate XSS vulnerabilities.
 */
export function sanitize(html, config = {}) {
  if (typeof window === 'undefined') return html;

  let sanitized = html;

  // Use experimental browser-native Sanitizer if supported
  if (typeof globalThis.Sanitizer !== 'undefined') {
    const sanitizer = new globalThis.Sanitizer(config);
    const div = document.createElement('div');
    div.setHTML(html, { sanitizer });
    sanitized = div.innerHTML;
  } else {
    // Resilient fallback utilizing native Document.parseHTMLUnsafe or DOMParser
    let doc;
    if (typeof Document !== 'undefined' && typeof Document.parseHTMLUnsafe === 'function') {
      doc = Document.parseHTMLUnsafe(html);
    } else {
      const parser = new DOMParser();
      doc = parser.parseFromString(html, 'text/html');
    }

    const filter = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          node.replaceWith(document.createTextNode(''));
          return;
        }

        // Purge dynamic or script attributes
        for (const attr of [...node.attributes]) {
          const name = attr.name.toLowerCase();
          const value = attr.value.trim().toLowerCase();

          // Evict unapproved attributes or dangerous URL scheme injection vectors
          if (
            !ALLOWED_ATTRS.has(name) ||
            name.startsWith('on') ||
            (name === 'href' &&
              (value.startsWith('javascript:') ||
                value.startsWith('data:') ||
                value.startsWith('vbscript:')))
          ) {
            node.removeAttribute(attr.name);
          }
        }

        // Recursively filter descendants
        for (const child of [...node.childNodes]) {
          filter(child);
        }
      }
    };

    for (const child of [...doc.body.childNodes]) {
      filter(child);
    }

    sanitized = doc.body.innerHTML;
  }

  return policy ? policy.createHTML(sanitized) : sanitized;
}
