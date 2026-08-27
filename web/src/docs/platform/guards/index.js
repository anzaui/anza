import { page } from '@anzaui/anza/ui';

page('/docs/platform/guards', {
  tag: 'doc-platform-guards',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Guards — Platform — Anza',
    description: 'Lazy polyfill guards: urlPattern, navigation, popover, escapeOverflow / guard.escape, sanitizer, scheduler.'
  }
}, import.meta.url);
