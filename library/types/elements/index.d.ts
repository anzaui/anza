/**
 * types/elements/index.d.ts
 *
 * Types for `@anzaui/anza/elements`. Importing the barrel defines every
 * built-in `ui-*` element. The element interfaces are type-only: the runtime
 * exports no classes; use `document.createElement('ui-button')` or
 * `customElements.get('ui-button')`.
 */

import { BaseElement } from '../core/ui/index.js';

// 1. Primitive Elements
export interface Button extends BaseElement {}
export interface Icon extends BaseElement {}
export interface Badge extends BaseElement {}
export interface Avatar extends BaseElement {}
export interface Divider extends BaseElement {}
export interface Text extends BaseElement {}
export interface Link extends BaseElement {}
export interface Spinner extends BaseElement {}

// 2. Form Controls
export interface Input extends BaseElement {
  value: string;
  readonly validity: ValidityState;
}
export interface Textarea extends BaseElement {
  value: string;
  readonly validity: ValidityState;
}
export interface Select extends BaseElement {
  value: string;
  readonly validity: ValidityState;
}
export interface Checkbox extends BaseElement {
  checked: boolean;
  readonly validity: ValidityState;
}
export interface Radio extends BaseElement {
  checked: boolean;
  readonly validity: ValidityState;
}
export interface Toggle extends BaseElement {
  checked: boolean;
  readonly validity: ValidityState;
}
export interface Field extends BaseElement {}
export interface Upload extends BaseElement {
  readonly files: File[];
}
export interface Form extends BaseElement {}

// 3. Overlay System
export interface Dialog extends BaseElement {}
export interface Popover extends BaseElement {}
export interface Tooltip extends BaseElement {}
export interface Menu extends BaseElement {}
export interface Drawer extends BaseElement {}
export interface Sheet extends BaseElement {}

// 4. Feedback Elements
export interface Alert extends BaseElement {}
export interface Toast extends BaseElement {}
export interface Progress extends BaseElement {
  value: number;
  max: number;
}
export interface Skeleton extends BaseElement {}
export interface Empty extends BaseElement {}

// 5. Data Elements
export interface Table extends BaseElement {}
export interface List extends BaseElement {}
export interface Card extends BaseElement {}
export interface Chart extends BaseElement {}
export interface Stat extends BaseElement {}

// 6. Navigation System
export interface Nav extends BaseElement {}
export interface Tabs extends BaseElement {
  value: string;
}
export interface Breadcrumb extends BaseElement {}
export interface Pagination extends BaseElement {}
export interface Steps extends BaseElement {}

// 7. Layout System
export interface App extends BaseElement {}
export interface Header extends BaseElement {}
export interface Sidebar extends BaseElement {}
export interface Stack extends BaseElement {}
export interface Grid extends BaseElement {}
export interface Split extends BaseElement {}
export interface Scroll extends BaseElement {}
export interface Surface extends BaseElement {}

export interface ToastOptions {
  /** Auto-dismiss delay in ms (default 3000). */
  duration?: number;
}

/** Appends a `<ui-toast>` with `message` to the toast container. */
export function showToast(message: string, options?: ToastOptions): Toast | undefined;

// Tag name → element type bindings
declare global {
  interface HTMLElementTagNameMap {
    'ui-button': Button;
    'ui-icon': Icon;
    'ui-badge': Badge;
    'ui-avatar': Avatar;
    'ui-divider': Divider;
    'ui-text': Text;
    'ui-link': Link;
    'ui-spinner': Spinner;

    'ui-input': Input;
    'ui-textarea': Textarea;
    'ui-select': Select;
    'ui-checkbox': Checkbox;
    'ui-radio': Radio;
    'ui-toggle': Toggle;
    'ui-field': Field;
    'ui-upload': Upload;
    'ui-form': Form;

    'ui-dialog': Dialog;
    'ui-popover': Popover;
    'ui-tooltip': Tooltip;
    'ui-menu': Menu;
    'ui-drawer': Drawer;
    'ui-sheet': Sheet;

    'ui-alert': Alert;
    'ui-toast': Toast;
    'ui-progress': Progress;
    'ui-skeleton': Skeleton;
    'ui-empty': Empty;

    'ui-table': Table;
    'ui-list': List;
    'ui-card': Card;
    'ui-chart': Chart;
    'ui-stat': Stat;

    'ui-nav': Nav;
    'ui-tabs': Tabs;
    'ui-breadcrumb': Breadcrumb;
    'ui-pagination': Pagination;
    'ui-steps': Steps;

    'ui-app': App;
    'ui-header': Header;
    'ui-sidebar': Sidebar;
    'ui-stack': Stack;
    'ui-grid': Grid;
    'ui-split': Split;
    'ui-scroll': Scroll;
    'ui-surface': Surface;
  }
}
