import { page } from '@adukiorg/anza/ui';

page('/docs/workers/troubleshooting', {
  tag: 'doc-workers-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
