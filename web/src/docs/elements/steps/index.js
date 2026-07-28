import { page } from '@adukiorg/anza/ui';

page('/docs/elements/steps', {
  tag: 'doc-elements-steps',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Steps — Anza',
    description: 'ui-steps — linear step indicator for multi-step workflows.'
  }
}, import.meta.url);
