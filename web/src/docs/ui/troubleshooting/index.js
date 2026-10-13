import { page } from '@anzaui/anza/ui';

page('/docs/ui/troubleshooting', {
  tag: 'doc-ui-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Common problems with Anza UI elements: undefined elements, templates that show their path, HMR, change not firing, leaks, form values and refs.'
  }
}, import.meta.url);
