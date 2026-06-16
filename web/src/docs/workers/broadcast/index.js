import { page } from '@adukiorg/anza/ui';

page('/docs/workers/broadcast', {
  tag: 'doc-workers-broadcast',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
