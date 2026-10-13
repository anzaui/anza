import { page } from '@anzaui/anza/ui';

page('/docs/ui/templates', {
  tag: 'doc-ui-templates',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Anza UI templates: inline HTML, file templates, when files load, build-time inlining, refs, the tags descriptor and the template tag.'
  }
}, import.meta.url);
