/**
 * Legacy path — canonical styles docs live at /docs/styles/index.
 */
import { page } from '@anzaui/anza/ui';
import { router } from '@anzaui/anza/router';

page('/docs/ui/styles', {
  tag: 'page-styles-redirect',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  on: {
    connect() {
      router.replace('/docs/styles/index');
    }
  }
}, import.meta.url);
