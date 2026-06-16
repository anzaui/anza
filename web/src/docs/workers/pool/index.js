import { page } from '@adukiorg/anza/ui';

page('/docs/workers/pool', {
  tag: 'doc-workers-pool',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
