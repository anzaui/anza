import { dock } from '@adukiorg/anza/defs';
import '@adukiorg/anza/elements/spinner';

// The inner content area dock (projects into dock-docs slot)
dock('content', {
  parent: 'docs',
  tag: 'dock-doccontent',
  loading: { tag: 'ui-spinner' }
});