import { page } from '@adukiorg/anza/ui';

page('/docs/elements/empty', {
  tag: 'doc-elements-empty',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Empty — Anza',
    description: 'ui-empty — empty-state panel with illustration, title, and actions.'
  }
}, import.meta.url);
