import { page } from '@adukiorg/anza/ui';

page('/docs/workers/api', {
  tag: 'doc-workers-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
