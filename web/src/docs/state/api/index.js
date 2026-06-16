import { page } from '@adukiorg/anza/ui';

page('/docs/state/api', {
  tag: 'doc-state-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
