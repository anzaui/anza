import { page } from '@adukiorg/anza/ui';

page('/docs/ui/transitions', {
  tag: 'doc-ui-transitions',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
