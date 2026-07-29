import { page } from '@adukiorg/anza/ui';

page('/docs/platform/api', {
  tag: 'doc-platform-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'API Reference — Platform — Anza',
    description: 'Platform API: supports, guard, globals, escapeOverflow / guard.escape, reset, typeGuard, scheduler.'
  }
}, import.meta.url);
