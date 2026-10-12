/**
 * src/elements/primitives/text/index.js
 *
 * Primitive Element: <ui-text>
 * Typography primitive dynamically rendering semantic tag configurations
 * and binding typography design scales.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

const TEXT_TAGS = new Set([
  'span', 'p', 'div', 'label', 'small', 'strong', 'em', 'b', 'i', 'u', 's', 'mark',
  'code', 'kbd', 'samp', 'var', 'abbr', 'cite', 'q', 'blockquote', 'pre', 'time',
  'sub', 'sup', 'del', 'ins', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption', 'legend'
]);

ui.element('ui-text', {
  style: './style.css',
  template: './index.html',
  props: {
    as: { type: String, reflect: true, default: 'span' },
    size: { type: String, reflect: true },
    weight: { type: String, reflect: true },
    color: { type: String, reflect: true },
    family: { type: String, reflect: true },
    block: { type: Boolean, reflect: true }
  },
  mount({ el }) {
    el._update();
  },
  update({ el }) {
    el._update();
  },
  methods: {
    _update() {
      // Only text-level and heading tags; anything else (or an invalid name)
      // renders as <span> instead of creating arbitrary elements.
      const requested = String(this.as || 'span').toLowerCase();
      const asAttr = TEXT_TAGS.has(requested) ? requested : 'span';
      const root = this.shadowRoot.querySelector('#root');
      const size = this.size;
      const weight = this.weight;
      const color = this.color;
      const family = this.family;

      // Dynamic tag swapping
      if (root.tagName.toLowerCase() !== asAttr) {
        const nextRoot = document.createElement(asAttr);
        nextRoot.id = 'root';
        nextRoot.part = 'text';
        while (root.firstChild) {
          nextRoot.appendChild(root.firstChild);
        }
        root.replaceWith(nextRoot);
      }

      // Size mappings
      if (size) {
        this.style.setProperty('--text-size', `var(--font-size-${size})`);
      } else {
        this.style.removeProperty('--text-size');
      }

      // Weight mappings
      if (weight) {
        this.style.setProperty('--text-weight', `var(--font-weight-${weight})`);
      } else {
        this.style.removeProperty('--text-weight');
      }

      // Color mappings
      if (color) {
        // `muted` is the documented alias for the secondary content token.
        const token = color === 'muted' ? 'secondary' : color;
        this.style.setProperty('--text-color', `var(--color-content-${token})`);
      } else {
        this.style.removeProperty('--text-color');
      }

      // Family mappings
      if (family) {
        this.style.setProperty('--text-family', `var(--font-family-${family})`);
      } else {
        this.style.removeProperty('--text-family');
      }
    }
  }
}, import.meta.url);
