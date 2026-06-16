import { page } from '@adukiorg/anza/ui';

page('/docs/state/store', {
  tag: 'doc-state-store',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
