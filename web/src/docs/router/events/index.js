import { page } from '@adukiorg/anza/ui';

page('/docs/router/events', {
  tag: 'doc-router-events',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
