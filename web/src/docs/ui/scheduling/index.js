import { page } from '@anzaui/anza/ui';

page('/docs/ui/scheduling', {
  tag: 'doc-ui-scheduling',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Cooperative scheduling in the Anza UI layer: schedule, scheduleFrame and yield, with AbortSignal support for soft navigation.'
  }
}, import.meta.url);
