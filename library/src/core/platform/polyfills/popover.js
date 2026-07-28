/**
 * core/platform/polyfills/popover.js
 *
 * Popover API polyfill offering showPopover, hidePopover, togglePopover,
 * light dismiss, popovertarget click wiring, and simulated top-layer overlay.
 * Source: doc 18 §12, library2.md §Phase 1-A
 */

import { globals } from '../globals.js';

class ToggleEvent extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.oldState = init.oldState || 'closed';
    this.newState = init.newState || 'closed';
  }
}

let popoverMoSeq = 0;

function clearPopoverAttachments(el) {
  if (el._popoverDismiss) {
    document.removeEventListener('pointerdown', el._popoverDismiss);
    el._popoverDismiss = null;
  }
  if (el._popoverGlobalName) {
    globals.detach(el._popoverGlobalName);
    el._popoverGlobalName = null;
    el._popoverObserver = null;
  } else if (el._popoverObserver) {
    el._popoverObserver.disconnect();
    el._popoverObserver = null;
  }
}

class PopoverPolyfill {
  static install() {
    if ('popover' in HTMLElement.prototype) return;

    Object.defineProperty(HTMLElement.prototype, 'popover', {
      get() {
        return this.getAttribute('popover');
      },
      set(val) {
        if (val === null) this.removeAttribute('popover');
        else this.setAttribute('popover', val);
      },
      configurable: true,
      enumerable: true
    });

    HTMLElement.prototype.showPopover = function() {
      if (this.getAttribute('popover') === null) {
        throw new DOMException("Not a popover", "NotSupportedError");
      }
      if (this.hasAttribute('data-popover-open')) return;

      clearPopoverAttachments(this);

      this.setAttribute('data-popover-open', '');

      // Simulating top-layer styling
      this.style.position = 'fixed';
      this.style.zIndex = '2147483647';

      // Light-dismiss behavior for "auto" popovers
      const type = this.getAttribute('popover');
      if (type === 'auto' || type === '') {
        const dismiss = (e) => {
          if (!this.contains(e.target) && e.target !== this) {
            this.hidePopover();
          }
        };
        this._popoverDismiss = dismiss;
        // Defer attachment to prevent immediate closing during current click event
        setTimeout(() => {
          if (this.hasAttribute('data-popover-open')) {
            document.addEventListener('pointerdown', dismiss);
          }
        }, 0);
      }

      // Prefer parent childList (narrow) over document.body subtree.
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
          if (!document.contains(this)) {
            this.hidePopover();
          }
        });
        const parent = this.parentElement;
        if (parent) {
          observer.observe(parent, { childList: true, subtree: false });
        } else if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }
        this._popoverObserver = observer;
        const name = `popover.body-mo:${++popoverMoSeq}`;
        this._popoverGlobalName = name;
        globals.attach(name, {
          type: 'observer',
          target: parent || document.body,
          dispose: () => {
            observer.disconnect();
            if (this._popoverObserver === observer) this._popoverObserver = null;
          }
        });
      }

      this.dispatchEvent(new ToggleEvent('toggle', {
        oldState: 'closed',
        newState: 'open'
      }));
    };

    HTMLElement.prototype.hidePopover = function() {
      if (!this.hasAttribute('data-popover-open')) return;

      this.removeAttribute('data-popover-open');
      this.style.position = '';
      this.style.zIndex = '';

      clearPopoverAttachments(this);

      this.dispatchEvent(new ToggleEvent('toggle', {
        oldState: 'open',
        newState: 'closed'
      }));
    };

    HTMLElement.prototype.togglePopover = function() {
      if (this.hasAttribute('data-popover-open')) {
        this.hidePopover();
      } else {
        this.showPopover();
      }
    };

    // Auto-setup declarative triggers (framework lifetime)
    if (typeof document !== 'undefined') {
      const onClick = (e) => {
        const trigger = e.target.closest('[popovertarget]');
        if (!trigger) return;
        const targetId = trigger.getAttribute('popovertarget');
        const target = document.getElementById(targetId);
        if (!target) return;

        const action = trigger.getAttribute('popovertargetaction') || 'toggle';
        if (action === 'show') {
          target.showPopover();
        } else if (action === 'hide') {
          target.hidePopover();
        } else {
          target.togglePopover();
        }
      };
      document.addEventListener('click', onClick);
      globals.attach('popover.target-click', {
        type: 'listener',
        target: document,
        dispose: () => document.removeEventListener('click', onClick)
      });
    }
  }
}

PopoverPolyfill.install();
export default PopoverPolyfill;
