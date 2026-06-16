import { page } from '@adukiorg/anza/ui';

page('/docs/events/names', {
  tag: 'doc-events-names',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
