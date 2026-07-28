/**
 * Legacy path — canonical docs home is /docs (entry TOC).
 */
import { page } from '@adukiorg/anza/ui';
import { router } from '@adukiorg/anza/router';

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
