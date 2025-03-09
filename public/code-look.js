const codeBlockCache = new Map();

function getPageId() {
  const m = window.location.pathname.match(/\/([^/]*)\/?/);
  if (m == null) {
    throw new Error('Invalid location: ' + window.location.pathname);
  }
  console.log(m);
  return m[1];
}

class InspectorDialog extends HTMLElement {
  constructor() {
    super();
    this.codeBlocks = [];
  }

  connectedCallback() {
    const container = document.createElement('div');
    container.className = 'dialog-outer-container';
    container.addEventListener('click', () => this.close());
    this.container = container;

    document.body.appendChild(container);

    const dialog = document.createElement('div');
    dialog.className = 'dialog-container';

    this.replacements = new Map();

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.addEventListener('click', e => {
      e.stopPropagation();
    });

    const text = document.createElement('div');

    const primaryBlock = this.codeBlocks.find(b => b.primary);
    text.textContent = this.customTitle || primaryBlock?.title || 'untitled';

    text.className = 'title ' + (!this.title ? 'untitled' : '');
    header.appendChild(text);

    const edit = document.createElement('button');
    edit.className = 'edit';
    edit.innerHTML = 'edit';
    edit.addEventListener('click', () => {
      const pageid = getPageId();
      const primaryBlock = this.codeBlocks[0];
      this.close();
      window.open(`/code-look/html/${pageid}/${primaryBlock.uuid}`, '_blank');
    });

    const close = document.createElement('button');
    close.className = 'close';
    close.innerHTML = 'X';
    close.addEventListener('click', () => {
      this.close();
    });

    const actions = document.createElement('div');
    actions.appendChild(edit);
    actions.appendChild(close);

    header.appendChild(actions);
    dialog.appendChild(header);

    // Left pane

    const left = document.createElement('div');
    left.className = 'left';
    for (let child of this.sourceNode.children) {
      if (!child.classList.contains('adornment')) {
        if (child.tagName === 'svg') {
          const prevSvgAspectRatio = child.getAttribute('preserveAspectRatio');
          child.setAttribute('preserveAspectRatio', 'xMinYMin meet');

          this.cleanupSvg = () => {
            if (prevSvgAspectRatio == null) {
              child.removeAttribute('preserveAspectRatio');
            } else {
              child.setAttribute('preserveAspectRatio', prevSvgAspectRatio);
            }
          };
        }

        // We clone the node, but use the original node in the dialog
        // and use the clone on the page. This maintains any event
        // listeners that have been wired up; we truly want the exact
        // same demo to be running inside the dialog
        const cl = child.cloneNode(true);
        child.replaceWith(cl);
        left.appendChild(child);

        this.replacements.set(child, cl);
      }
    }

    // Right pane

    const right = document.createElement('div');
    right.className = 'right';
    const rightContent = document.createElement('div');
    rightContent.className = 'right-content';
    right.appendChild(rightContent);

    for (let block of this.codeBlocks) {
      const div = document.createElement('div');
      div.className = 'code-block';

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.innerHTML = block.code;
      pre.appendChild(code);

      if (block.primary == null) {
        const details = document.createElement('details');
        const text = document.createElement('summary');
        text.className = 'title ' + (!block.title ? 'untitled' : '');
        text.textContent = block.title || 'untitled';
        details.appendChild(text);
        details.appendChild(pre);
        div.appendChild(details);
      } else {
        div.appendChild(pre);
      }

      rightContent.appendChild(div);
    }

    // Content

    const content = document.createElement('div');
    content.className = 'dialog-content';
    // Don't close on click
    content.addEventListener('click', e => e.stopPropagation(), true);

    content.appendChild(left);
    content.appendChild(right);
    dialog.appendChild(content);

    dialog.style.opacity = 0;
    dialog.style.transform = 'translateY(5px) scale(.99)';
    dialog.style.transition = '.125s opacity, .125s transform';
    container.appendChild(dialog);

    setTimeout(() => {
      dialog.style.opacity = 1;
      dialog.style.transform = '';
      container.classList.add('animated');
    }, 0);

    // Global stuff
    document.body.style.overflow = 'hidden';
    document.body.addEventListener('keyup', this.onKeyUp);
  }

  onKeyUp = e => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  close() {
    for (let [from, to] of this.replacements.entries()) {
      to.replaceWith(from);
    }

    this.container.remove();
    this.remove();

    if (this.cleanupSvg) {
      this.cleanupSvg();
    }

    // Cleanup global stuff
    document.body.style.overflow = '';
    document.body.removeEventListener('keyup', this.onKeyUp);
  }
}

class InspectCode extends HTMLElement {
  connectedCallback() {
    if (this.getAttribute('disabled') === 'true' || this.disabled) {
      return;
    }

    const viewSource = document.createElement('button');
    viewSource.className = 'view-source adornment';
    viewSource.innerHTML = 'view source';
    viewSource.addEventListener('click', async e => {
      const uuid = this.dataset['blockId'];

      let codeBlocks = codeBlockCache.get(uuid);
      if (!codeBlocks) {
        const pageid = getPageId();
        const res = await fetch(`/code-look/source/${pageid}/${uuid}`);
        const json = await res.json();
        // Render code blocks bottom up
        json.reverse();
        codeBlockCache.set(uuid, json);
        codeBlocks = json;
      }

      const dialog = document.createElement('inspector-dialog');
      dialog.className = 'adornment';
      dialog.sourceNode = this;
      dialog.codeBlocks = codeBlocks;
      dialog.customTitle = this.dataset['title'];
      this.appendChild(dialog);
    });
    this.appendChild(viewSource);
  }
}

customElements.define('inspector-dialog', InspectorDialog);
customElements.define('inspect-code', InspectCode);

document.addEventListener('mousemove', e => {
  const cursor = document.querySelector('.cursor');
  const follower = document.querySelector('.cursor-follower');

  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';

  setTimeout(() => {
    follower.style.left = e.clientX + 'px';
    follower.style.top = e.clientY + 'px';
  }, 50);
});
