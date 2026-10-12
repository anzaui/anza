/**
 * src/elements/layout/sidebar/index.js
 *
 * Layout System: <ui-sidebar>
 * Collapsible side-panel layout displaying navigation bars, action links,
 * and supporting collapsible layouts.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-sidebar', {
  style: './style.css',
  template: './index.html',
  props: {
    collapsed: { type: Boolean, reflect: true }
  },
  // Methods run with `this` bound to the element (not a context object).
  methods: {
    toggle() {
      this.collapsed = !this.collapsed;
    }
  }
}, import.meta.url);
