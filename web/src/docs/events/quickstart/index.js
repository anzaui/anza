import { page } from '@adukiorg/anza/ui';

page('/docs/events/quickstart', {
  tag: 'doc-events-quickstart',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
