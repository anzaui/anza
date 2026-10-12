/**
 * Legacy path — canonical docs home is /docs (entry TOC).
 */
import { page } from '@anzaui/anza/ui';
import { router } from '@anzaui/anza/router';

page('/docs/index', {
  tag: 'page-docs-index-redirect',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  on: {
    connect() {
      router.replace('/docs');
    }
  }
}, import.meta.url);
