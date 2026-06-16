import { page } from '@adukiorg/anza/ui';

page('/docs/intro/index', {
  tag: 'doc-intro-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['./index.css', '/styles/shared.css'],
}, import.meta.url);
