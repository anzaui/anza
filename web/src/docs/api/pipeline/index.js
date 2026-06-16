import { page } from '@adukiorg/anza/ui';

page('/docs/api/pipeline', {
  tag: 'doc-api-pipeline',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
