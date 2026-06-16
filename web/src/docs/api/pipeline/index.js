import { page } from '@adukiorg/anza/ui';

page('/docs/api/pipeline', {
  tag: 'doc-api-pipeline',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
