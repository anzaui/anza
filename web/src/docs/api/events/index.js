import { page } from '@adukiorg/anza/ui';

page('/docs/api/events', {
  tag: 'doc-api-events',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
