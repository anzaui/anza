import { page } from '@adukiorg/anza/ui';

page('/docs/elements/feedback', {
  tag: 'doc-elements-feedback',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Feedback — Anza',
    description: 'Alerts, toasts, progress, and empty / loading states.'
  }
}, import.meta.url);
