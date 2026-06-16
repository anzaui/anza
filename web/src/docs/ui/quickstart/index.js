import { page } from '@adukiorg/anza/ui';

page('/docs/ui/quickstart', {
  tag: 'doc-ui-quickstart',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
