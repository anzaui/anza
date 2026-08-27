import { page } from '@anzaui/anza/ui';

page('/docs/platform/scheduler', {
  tag: 'doc-platform-scheduler',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
