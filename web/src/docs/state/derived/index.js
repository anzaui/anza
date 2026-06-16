import { page } from '@adukiorg/anza/ui';

page('/docs/state/derived', {
  tag: 'doc-state-derived',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
