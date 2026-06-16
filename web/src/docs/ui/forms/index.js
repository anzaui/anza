import { page } from '@adukiorg/anza/ui';

page('/docs/ui/forms', {
  tag: 'doc-ui-forms',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
