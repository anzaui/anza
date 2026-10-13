/**
 * src/elements/data/chart/index.js
 *
 * Data Element: <ui-chart>
 * Lightweight canvas-based declarative chart component supporting bar/line charts
 * with automatic high-DPI scaling and responsive resizing.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-chart', {
  style: './style.css',
  template: './index.html',
  props: {
    type: { type: String, reflect: true },
    data: { type: String, reflect: true }
  },
  mount({ el, tags, watch }) {
    const canvas = tags.one('canvas');

    // Track sizing changes to automatically redraw High-DPI canvas
    const observer = new ResizeObserver(() => draw(el, tags));
    observer.observe(canvas);
    el.ctrl.signal.addEventListener('abort', () => observer.disconnect());

    draw(el, tags);
  },
  unmount({ el }) {
    // ResizeObserver is cleaned up via AbortSignal in mount
  },
  update({ el, tags }) {
    draw(el, tags);
  }
}, import.meta.url);

/**
 * `color` (any CSS colour a canvas accepts) with its alpha scaled by
 * `alpha`. The canvas normalises the colour to `#rrggbb` or `rgba(...)`;
 * other serialisations (wide-gamut colours) use color-mix().
 */
function withAlpha(ctx, color, alpha) {
  const previous = ctx.fillStyle;
  ctx.fillStyle = '#3b82f6';
  ctx.fillStyle = color;
  const parsed = ctx.fillStyle;
  ctx.fillStyle = previous;

  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(parsed);
  if (hex) {
    const [r, g, b] = hex.slice(1).map((h) => parseInt(h, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(parsed);
  if (rgba) {
    const base = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${Math.round(base * alpha * 1000) / 1000})`;
  }
  return `color-mix(in srgb, ${parsed} ${alpha * 100}%, transparent)`;
}

function draw(el, tags) {
  const canvas = tags.one('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Get dimensions and scale for high-DPI retina displays
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  // Parse data points
  let data = [];
  try {
    data = el.data ? JSON.parse(el.data) : [10, 30, 20, 50, 40, 60];
  } catch {
    data = [10, 30, 20, 50, 40, 60];
  }

  const type = el.type || 'bar';
  const maxVal = Math.max(...data, 1) * 1.1;

  // Retrieve active token styles for canvas drawing
  const style = getComputedStyle(el);
  const colorInteractive = style.getPropertyValue('--color-interactive').trim() || '#3b82f6';
  const colorBorder = style.getPropertyValue('--color-border-default').trim() || '#e5e7eb';
  const colorText = style.getPropertyValue('--color-content-secondary').trim() || '#4b5563';

  // Draw baseline grid lines
  ctx.strokeStyle = colorBorder;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = height - (i * (height - 30)) / 4 - 20;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();

    // Axis labels text
    ctx.fillStyle = colorText;
    ctx.font = '10px sans-serif';
    ctx.fillText(Math.round((maxVal * i) / 4).toString(), 5, y + 3);
  }

  const graphWidth = width - 40;
  const graphHeight = height - 50;
  const step = graphWidth / (data.length - 1 || 1);

  if (type === 'line') {
    ctx.strokeStyle = colorInteractive;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    data.forEach((val, idx) => {
      const x = 30 + idx * step;
      const y = height - 20 - (val / maxVal) * graphHeight;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw standard line fill gradient
    ctx.lineTo(30 + (data.length - 1) * step, height - 20);
    ctx.lineTo(30, height - 20);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, withAlpha(ctx, colorInteractive, 0.2)); // Fade opacity overlay
    grad.addColorStop(1, withAlpha(ctx, colorInteractive, 0));
    ctx.fillStyle = grad;
    ctx.fill();

  } else {
    // Draw bar charts columns
    const barWidth = Math.max(10, step * 0.6);
    ctx.fillStyle = colorInteractive;

    data.forEach((val, idx) => {
      const x = 30 + idx * step - barWidth / 2;
      const y = height - 20 - (val / maxVal) * graphHeight;
      const barH = (val / maxVal) * graphHeight;

      // Custom rounded top corners on charts bar rectangles
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.closePath();
      ctx.fill();
    });
  }
}
