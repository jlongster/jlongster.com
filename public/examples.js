const closeSvg = `<svg width="18" height="18" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M89 22L22.3848 88.6152" stroke="black" stroke-width="10" stroke-linecap="round"/><path d="M22 22L88.6152 88.6152" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>`

// Example modal loader
// Handles buttons with data-example-href attribute

// Global cache for highlighted source code
const sourceCache = new Map();

class ExampleModal {
  constructor(exampleHref) {
    this.exampleHref = exampleHref;
    this.container = null;
    this.dialog = null;
    this.scriptElement = null;
    this.exampleContent = null;
    this.sourceContent = null;
    this.toggleBtn = null;
    this.showingSource = false;
    this.sourceLoaded = false;
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  open() {
    // Create backdrop
    this.container = document.createElement('div');
    this.container.className = 'example-modal-backdrop';
    this.container.addEventListener('click', () => this.close());

    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'example-modal-dialog';
    this.dialog.addEventListener('click', e => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.className = 'example-modal-header';

    const title = document.createElement('div');
    title.className = 'example-modal-title';
    title.textContent = this.getExampleName();
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'example-modal-actions';

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'example-modal-btn';
    this.toggleBtn.textContent = 'show source';
    this.toggleBtn.addEventListener('click', () => this.toggleView());
    actions.appendChild(this.toggleBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'example-modal-close';
    closeBtn.innerHTML = closeSvg;
    closeBtn.addEventListener('click', () => this.close());
    actions.appendChild(closeBtn);

    header.appendChild(actions);
    this.dialog.appendChild(header);

    // Content area where the example will render
    this.exampleContent = document.createElement('div');
    this.exampleContent.className = 'example-modal-content';
    this.exampleContent.setAttribute('data-example-root', '');
    this.dialog.appendChild(this.exampleContent);

    // Source content area (hidden initially)
    this.sourceContent = document.createElement('div');
    this.sourceContent.className = 'example-modal-content source-content';
    this.sourceContent.style.display = 'none';
    this.sourceContent.innerHTML = '<pre><code>Loading...</code></pre>';
    this.sourceCode = this.sourceContent;

    this.dialog.appendChild(this.sourceContent);

    // Load the script module inside the modal
    // Add cache-busting parameter to force re-execution on each open
    this.scriptElement = document.createElement('script');
    this.scriptElement.type = 'module';
    this.scriptElement.src = `${this.exampleHref}?t=${Date.now()}`;
    this.dialog.appendChild(this.scriptElement);

    // Set initial animation state
    this.dialog.style.opacity = '0';
    this.dialog.style.transform = 'translateY(5px) scale(.99)';
    this.dialog.style.transition = '.125s opacity, .125s transform';

    this.container.appendChild(this.dialog);
    document.body.appendChild(this.container);

    // Trigger animation
    requestAnimationFrame(() => {
      this.dialog.style.opacity = '1';
      this.dialog.style.transform = '';
      this.container.classList.add('animated');
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.addEventListener('keyup', this.onKeyUp);
  }

  onKeyUp(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  close() {
    if (this.scriptElement) {
      this.scriptElement.remove();
    }
    if (this.container) {
      this.container.remove();
    }
    document.body.style.overflow = '';
    document.removeEventListener('keyup', this.onKeyUp);
  }

  getExampleName() {
    // Extract example name from href like
    // https://static.jlongster.com/<name>/dist/index.js
    const match = this.exampleHref.match(/static\.jlongster\.com\/([^/]+)\//);
    return match ? match[1] : null;
  }

  getSourceApiUrl() {
    const name = this.getExampleName();
    return name ? `/api/example-source/${name}` : null;
  }

  async toggleView() {
    this.showingSource = !this.showingSource;

    if (this.showingSource) {
      // Show source, hide example
      this.exampleContent.style.display = 'none';
      this.sourceContent.style.display = '';
      this.toggleBtn.textContent = 'show demo';

      // Lazy load source on first view
      if (!this.sourceLoaded) {
        this.sourceLoaded = true;
        const exampleName = this.getExampleName();

        // Check global cache first
        if (exampleName && sourceCache.has(exampleName)) {
          this.sourceCode.innerHTML = sourceCache.get(exampleName);
          return;
        }

        const apiUrl = this.getSourceApiUrl();
        if (!apiUrl) {
          this.sourceCode.textContent =
            'Error: Could not determine example name';
          return;
        }

        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }

          // Stream the response
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let html = '';
          this.sourceCode.innerHTML = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            html += chunk;
            this.sourceCode.innerHTML = html;
          }

          // Cache the complete HTML
          if (exampleName) {
            sourceCache.set(exampleName, html);
          }
        } catch (err) {
          this.sourceCode.textContent = `Error loading source: ${err.message}`;
        }
      }
    } else {
      // Show example, hide source
      this.exampleContent.style.display = '';
      this.sourceContent.style.display = 'none';
      this.toggleBtn.textContent = 'show source';
    }
  }
}

// Initialize: find all buttons with data-example-href and attach click handlers
function initExampleButtons() {
  const buttons = document.querySelectorAll('button[data-example-href]');
  buttons.forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      const href = button.getAttribute('data-example-href');
      if (href) {
        const modal = new ExampleModal(href);
        modal.open();
      }
    });
  });
}

// Run on DOMContentLoaded or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExampleButtons);
} else {
  initExampleButtons();
}

// Inject styles
const styles = document.createElement('style');
styles.textContent = `
  .example-modal-backdrop {
    z-index: 10000;
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    background-color: rgba(30, 30, 30, .2);
    transition: .15s opacity;
    inset: 0;
  }

  .example-modal-backdrop.animated {
    opacity: 1;
  }

  .example-modal-dialog {
    display: flex;
    flex-direction: column;
    border-radius: 6px;
    background-color: var(--color-bg);
    width: 700px;
    height: 80dvh;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .example-modal-header {
    display: flex;
    padding: 10px 15px;
    border-bottom: 1px solid rgb(233 232 230);
    align-items: center;
  }

  .example-modal-title {
    flex: 1;
    font-weight: 700;
    font-size: 14px;
  }

  .example-modal-actions {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .example-modal-btn {
    border: 1px solid var(--color-primary);
    background-color: white;
    padding: 1px 9px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }

  .example-modal-close {
    padding: 5px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
  }

  .example-modal-close:hover {
  }

  .example-modal-content {
    padding: 20px;
    overflow: auto;
    flex: 1;
  }

  .example-modal-content.source-content pre {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre;
  }

  .example-modal-content.source-content code {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  }

  @media (max-width: 800px) {
    .example-modal-dialog {
      width: 90vw;
      height: 95dvh;
    }
  }
`;
document.head.appendChild(styles);
