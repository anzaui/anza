import { page } from '@adukiorg/anza/ui';

page('/docs/events/troubleshooting', {
  tag: 'doc-events-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
