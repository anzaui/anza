import { page } from '@adukiorg/anza/ui';

page('/docs/state/quickstart', {
  tag: 'doc-state-quickstart',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
