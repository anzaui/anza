import { dock } from '@anzaui/anza/defs';
import { router } from '@anzaui/anza/router';
import { theme } from '@anzaui/anza/theme';

// The persistent outer layout dock
dock('docs', {
  parent: 'main',
  tag: 'dock-docs',
  template: { html: './index.html', css: './index.css' },
  on: {
    connect({ el, refs, on, tags }) {
      // 1. Highlight active left sidebar navigation link
      // Prefer exact match; otherwise the longest href that is a path-segment prefix.
      const highlightActiveLink = () => {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        const links = [...refs.leftSidebar.querySelectorAll('a')];
        let best = null;
        let bestLen = -1;

        for (const link of links) {
          const raw = link.getAttribute('href');
          if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw)) continue;
          const href = raw.replace(/\/+$/, '') || '/';
          const isMatch = path === href || path.startsWith(`${href}/`);
          if (isMatch && href.length > bestLen) {
            best = link;
            bestLen = href.length;
          }
        }

        for (const link of links) {
          const isActive = link === best;
          link.classList.toggle('active', isActive);
          if (isActive) {
            const parentGroup = link.closest('details.sidebar-group');
            if (parentGroup) parentGroup.open = true;
          }
        }

        if (best && refs.crumbCurrent) {
          const groupTitle = best.closest('details.sidebar-group')?.querySelector('h3')?.textContent?.trim();
          refs.crumbCurrent.textContent = groupTitle ? `${groupTitle} / ${best.textContent.trim()}` : best.textContent.trim();
        }
      };

      highlightActiveLink();
      const disposeFound = router.on('found', highlightActiveLink);
      el.ctrl.signal.addEventListener('abort', disposeFound);

      // 2. Dynamic Table of Contents generation
      let shadowObserver = null;
      const updateTOC = () => {
        if (shadowObserver) {
          shadowObserver.disconnect();
          shadowObserver = null;
        }

        const innerDock = el.querySelector('dock-doccontent');
        const activePage = innerDock?.firstElementChild;
        if (!activePage) return;

        const extract = () => {
          const headings = activePage.shadowRoot?.querySelectorAll('h2, h3') || [];
          refs.tocList.innerHTML = '';

          if (!headings.length) {
            refs.rightSidebar.style.visibility = 'hidden';
            return;
          }
          refs.rightSidebar.style.visibility = 'visible';

          for (const heading of headings) {
            if (!heading.id) {
              heading.id = heading.textContent
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');
            }

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${heading.id}`;
            a.textContent = heading.textContent;
            if (heading.tagName === 'H3') {
              a.style.paddingLeft = 'var(--space-3)';
              a.style.fontSize = '0.9em';
            }

            li.appendChild(a);
            refs.tocList.appendChild(li);
          }
        };

        // Extract immediately in case the template is already loaded/cached
        extract();

        // Observe shadow root mutations to trigger extract when the template is asynchronously loaded
        if (activePage.shadowRoot) {
          shadowObserver = new MutationObserver(extract);
          shadowObserver.observe(activePage.shadowRoot, { childList: true, subtree: true });
        }
      };

      // Watch child tree mutations in light DOM to detect page swaps inside dock-doccontent
      const observer = new MutationObserver(updateTOC);
      observer.observe(el, { childList: true, subtree: true });
      el.ctrl.signal.addEventListener('abort', () => {
        observer.disconnect();
        if (shadowObserver) shadowObserver.disconnect();
      });

      // 3. Intercept TOC link clicks to provide smooth scrolling within docs-content container
      on.click('.toc-list a', (event) => {
        event.preventDefault();
        const href = event.target.getAttribute('href');
        if (href && href.startsWith('#')) {
          const id = href.slice(1);
          const innerDock = el.querySelector('dock-doccontent');
          const activePage = innerDock?.firstElementChild;
          const heading = activePage?.shadowRoot?.getElementById(id);
          const contentEl = refs.content || el.shadowRoot.querySelector('.docs-content');

          if (heading && contentEl) {
            const headingRect = heading.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            const targetTop = contentEl.scrollTop + (headingRect.top - contentRect.top) - 16;
            contentEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            history.replaceState(null, '', href);

            // Highlight current in TOC
            const links = refs.tocList.querySelectorAll('a');
            for (const link of links) {
              link.classList.toggle('active', link.getAttribute('href') === href);
            }
          }
        }
      });

      updateTOC();

      // 4. Theme toggle
      const themeToggle = tags.one('.theme-toggle');
      const mobileMenuBtn = tags.one('.mobile-menu-btn');

      const syncThemeToggle = (target) => {
        const isDark = theme.resolved() === 'dark';
        target.setAttribute('aria-pressed', String(isDark));
        const orbital = target.querySelector('.orbital');
        if (orbital) orbital.classList.toggle('dark', isDark);
      };

      syncThemeToggle(themeToggle);

      on.click('.theme-toggle', (event, target) => {
        theme.toggle();
        syncThemeToggle(target);
      });

      // 5. Mobile sidebar drawer
      const sidebar = refs.leftSidebar;
      const backdrop = refs.sidebarBackdrop;

      function setDrawer(open) {
        mobileMenuBtn.setAttribute('aria-expanded', String(open));
        sidebar.classList.toggle('open', open);
        backdrop.classList.toggle('visible', open);
      }

      on.click('.mobile-menu-btn', () => {
        const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        setDrawer(!isOpen);
      });

      on.click('.sidebar-backdrop', () => setDrawer(false));

      on.click('.sidebar-nav a', () => {
        if (window.innerWidth <= 768) setDrawer(false);
      });
    }
  }
}, import.meta.url); // trigger rebuild