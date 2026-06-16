import { page } from '@adukiorg/anza/ui';

page('/docs/events/listen', {
  tag: 'doc-events-listen',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
