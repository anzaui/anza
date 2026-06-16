import { page } from '@adukiorg/anza/ui';

page('/docs/ui/context', {
  tag: 'doc-ui-context',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
