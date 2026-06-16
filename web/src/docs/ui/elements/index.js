import { page } from '@adukiorg/anza/ui';

page('/docs/ui/elements', {
  tag: 'doc-ui-elements',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
