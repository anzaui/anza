import { page } from '@adukiorg/anza/ui';

page('/docs/ui/elements', {
  tag: 'doc-ui-elements',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
