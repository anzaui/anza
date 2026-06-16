import { page } from '@adukiorg/anza/ui';

page('/docs/ui/observers', {
  tag: 'doc-ui-observers',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
