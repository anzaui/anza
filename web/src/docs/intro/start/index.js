import { page } from '@adukiorg/anza/ui';

page('/docs/intro/start', {
  tag: 'doc-intro-start',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
