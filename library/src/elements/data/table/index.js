/**
 * src/elements/data/table/index.js
 *
 * Data Element: <ui-table>
 * Responsive data table layout wrapping native standard <div class="table-wrap">
  <table> tags and attaching
 * complete semantic design token styles using slotted tree CSS.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-table', {
  style: './style.css',
  template: './index.html'
}, import.meta.url);
