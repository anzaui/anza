/**
 * src/elements/index.js
 *
 * Public Custom Elements barrel.
 * Each `export ... from` re-export registers the element as a side-effect
 * AND exports the class reference directly — no customElements.get() needed.
 *
 * Import the full kit:     import '@anzaui/anza/elements';
 * Import one element:      import '@anzaui/anza/elements/button';
 * Import specific class:   import { Button } from '@anzaui/anza/elements';
 */

// 1. Primitives
import './primitives/button/index.js';
import './primitives/icon/index.js';
import './primitives/badge/index.js';
import './primitives/avatar/index.js';
import './primitives/divider/index.js';
import './primitives/text/index.js';
import './primitives/link/index.js';
import './primitives/spinner/index.js';

// 2. Forms
import './forms/input/index.js';
import './forms/textarea/index.js';
import './forms/select/index.js';
import './forms/checkbox/index.js';
import './forms/radio/index.js';
import './forms/toggle/index.js';
import './forms/field/index.js';
import './forms/upload/index.js';
import './forms/form/index.js';

// 3. Overlay
import './overlay/dialog/index.js';
import './overlay/popover/index.js';
import './overlay/tooltip/index.js';
import './overlay/menu/index.js';
import './overlay/drawer/index.js';
import './overlay/sheet/index.js';

// 4. Feedback
import './feedback/alert/index.js';
import './feedback/toast/index.js';
import './feedback/progress/index.js';
import './feedback/skeleton/index.js';
import './feedback/empty/index.js';

// 5. Data
import './data/table/index.js';
import './data/list/index.js';
import './data/card/index.js';
import './data/chart/index.js';
import './data/stat/index.js';

// 6. Navigation
import './navigation/nav/index.js';
import './navigation/tabs/index.js';
import './navigation/breadcrumb/index.js';
import './navigation/pagination/index.js';
import './navigation/steps/index.js';

// 7. Layout
import './layout/app/index.js';
import './layout/header/index.js';
import './layout/sidebar/index.js';
import './layout/stack/index.js';
import './layout/grid/index.js';
import './layout/split/index.js';
import './layout/scroll/index.js';
import './layout/surface/index.js';

export { show as showToast } from './feedback/toast/index.js';
