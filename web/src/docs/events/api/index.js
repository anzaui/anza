import { page } from '@adukiorg/anza/ui';

page('/docs/events/api', {
  tag: 'doc-events-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
