import { page } from '@adukiorg/anza/ui';

page('/docs/events/index', {
  tag: 'doc-events-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
