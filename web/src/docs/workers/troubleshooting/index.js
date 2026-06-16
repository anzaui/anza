import { page } from '@adukiorg/anza/ui';

page('/docs/workers/troubleshooting', {
  tag: 'doc-workers-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
