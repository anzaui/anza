import './prism.js';

import { view } from '@adukiorg/anza/ui';

export default view('view-code', {
  template: { html: './index.html', css: ['./index.css', './prism.css'] },
  on: {
    connect({ el, on }) {
      const applyPrism = () => {
        const slot = el.shadowRoot.querySelector('slot');
        const codeContainer = el.shadowRoot.querySelector('#code-container');
        if (!slot || !codeContainer || !window.Prism) return;

        let text = '';
        const assignedNodes = slot.assignedNodes();
        if (assignedNodes.length > 0) {
          text = assignedNodes.map(node => node.textContent).join('').trim();
        } else {
          text = el.textContent.trim();
        }

        if (text) {
          const lang = el.getAttribute('language') || 'javascript';
          codeContainer.className = `language-${lang}`;
          codeContainer.textContent = text;
          window.Prism.highlightElement(codeContainer);
        }
      };

      // Run on next tick to allow Light DOM text to be parsed
      setTimeout(applyPrism, 0);

      on.click('.copy-btn', async (event, copyBtn) => {
        const tickIcon = /* html */`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"></path>
            <path d="M8 12.75C8 12.75 9.6 13.6625 10.4 15C10.4 15 12.8 9.75 16 8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        `
        const copyIcon = /* html */`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z"></path>
            <path d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999"></path>
          </svg>
        `

        // 2. Utility function to turn an HTML string into a real DOM node once
        function createNode(htmlString) {
          const template = document.createElement('template');
          template.innerHTML = htmlString.trim();
          return template.content.firstElementChild;
        }

        // 3. Cache the parsed nodes in memory
        const tickNode = createNode(tickIcon);
        const copyNode = createNode(copyIcon);

        const slot = el.shadowRoot.querySelector('slot');
        let text = '';
        if (slot) {
          const assignedNodes = slot.assignedNodes();
          if (assignedNodes.length > 0) {
            text = assignedNodes.map(node => node.textContent).join('').trim();
          } else {
            text = el.textContent.trim();
          }
        }

        if (text) {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
              copyBtn.classList.add('copied');
              copyBtn.replaceChildren(tickNode);
              // const span = copyBtn.querySelector('span');
              // if (span) span.textContent = 'Copied!';

              setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.replaceChildren(copyNode);
                // if (span) span.textContent = 'Copy';
              }, 2000);
            }
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        }
      });
    }
  }
}, import.meta.url);
