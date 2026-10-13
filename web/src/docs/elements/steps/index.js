import { page } from '@anzaui/anza/ui';

page('/docs/elements/steps', {
  tag: 'doc-elements-steps',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Steps — Anza',
    description: 'ui-steps — linear step indicator: steps before active are completed, a progress line fills to the active step.'
  }
}, import.meta.url);
