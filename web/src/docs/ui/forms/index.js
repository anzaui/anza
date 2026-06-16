import { page } from '@adukiorg/anza/ui';

page('/docs/ui/forms', {
  tag: 'doc-ui-forms',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
