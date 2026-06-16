import { page } from '@adukiorg/anza/ui';

page('/docs/platform/scheduler', {
  tag: 'doc-platform-scheduler',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
