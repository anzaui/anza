import { page } from '@adukiorg/anza/ui';

page('/docs/state/derived', {
  tag: 'doc-state-derived',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
