// Text DevTools - Interactive sidebar for managing CanvasText elements
(function () {
  let textElements = new Map(); // id -> {element, arrowElement, relativeContainer, position, arrow, text, fontSize, fontFamily}
  let nextTextId = 0;
  let selectedTextId = null;
  let isCollapsed = true;
  let dragState = null; // {textId, type: 'text'|'arrow', startX, startY, elementStartPos}
  let persistMode = localStorage.getItem('textDevToolsPersistMode') === 'true';
  let availableArrows = ['up-right']; // Will be populated by scanning /public/arrows/

  console.log('[TextDevTools] Script loaded');
  console.log('[TextDevTools] Persist mode:', persistMode);

  function init() {
    console.log('[TextDevTools] Initializing...');
    createDevToolsUI();
    scanForCanvasTextElements();
    setupMutationObserver();

    // Apply initial collapsed state
    if (isCollapsed) {
      const sidebar = document.getElementById('text-devtools');
      const collapseBtn = document.getElementById('text-collapse-btn');
      const collapseTab = document.getElementById('text-devtools-tab');

      if (sidebar) sidebar.style.transform = 'translateX(320px)';
      if (collapseBtn) collapseBtn.textContent = '←';
      if (collapseTab) collapseTab.style.display = 'block';
    }

    // Load persisted text if persist mode is enabled
    loadFromLocalStorage();

    console.log('[TextDevTools] Initialization complete');
  }

  function scanForCanvasTextElements() {
    const canvasTexts = document.querySelectorAll('[data-canvas-text="true"]');
    console.log('[TextDevTools] Found', canvasTexts.length, 'CanvasText elements');

    canvasTexts.forEach(element => {
      if (!element.id) {
        element.id = `canvas-text-${nextTextId++}`;
      }
      registerCanvasTextElement(element);
    });
  }

  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.dataset?.canvasText === 'true') {
              if (!node.id) {
                node.id = `canvas-text-${nextTextId++}`;
              }
              registerCanvasTextElement(node);
            }
            // Check children
            const children = node.querySelectorAll?.('[data-canvas-text="true"]');
            children?.forEach(child => {
              if (!child.id) {
                child.id = `canvas-text-${nextTextId++}`;
              }
              registerCanvasTextElement(child);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function registerCanvasTextElement(element) {
    const textId = element.id;
    if (textElements.has(textId)) return;

    console.log('[TextDevTools] Registering CanvasText element:', textId);

    // Find the relative container (ancestor with position: relative)
    const relativeContainer = findRelativeContainer(element);

    // Parse position and arrow data
    let position = {};
    let arrow = null;

    try {
      if (element.dataset.position) {
        position = JSON.parse(element.dataset.position);
      }
      if (element.dataset.arrow) {
        arrow = JSON.parse(element.dataset.arrow);
      }
    } catch (e) {
      console.error('[TextDevTools] Failed to parse data attributes:', e);
    }

    // Find associated arrow element
    let arrowElement = null;
    if (arrow) {
      // Look for the arrow img that follows this text element
      let sibling = element.nextElementSibling;
      while (sibling) {
        if (sibling.dataset?.canvasTextArrow === 'true') {
          arrowElement = sibling;
          break;
        }
        sibling = sibling.nextElementSibling;
      }
    }

    // Make element interactive
    setupTextElementInteraction(element, textId);
    if (arrowElement) {
      setupArrowElementInteraction(arrowElement, textId);
    }

    // Get styles from the CanvasText div element
    const computedStyle = window.getComputedStyle(element);

    // Parse rotation from inline style or computed style
    const inlineTransform = element.style.transform;
    const computedTransform = computedStyle.transform;
    const rotation = parseRotation(inlineTransform) || parseRotation(computedTransform) || 0;

    // Always use computed color to resolve CSS variables
    const color = computedStyle.color || '#000000';

    // Store text data
    textElements.set(textId, {
      element,
      arrowElement,
      relativeContainer,
      position,
      arrow,
      text: element.textContent,
      fontSize: parsePxValue(element.style.fontSize) || parsePxValue(computedStyle.fontSize) || 23,
      fontFamily: element.style.fontFamily || computedStyle.fontFamily || 'Inter, sans-serif',
      color: color,
      rotation: rotation,
    });
  }

  function findRelativeContainer(element) {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const position = window.getComputedStyle(parent).position;
      if (position === 'relative' || position === 'absolute' || position === 'fixed') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return document.body;
  }

  function parsePxValue(value) {
    if (!value) return null;
    const match = value.match(/^(\d+(?:\.\d+)?)px$/);
    return match ? parseFloat(match[1]) : null;
  }

  function parseRotation(transform) {
    if (!transform) return 0;
    const match = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function setupTextElementInteraction(element, textId) {
    // Highlight on hover
    element.addEventListener('mouseenter', () => {
      if (!dragState) {
        element.style.outline = '2px solid #3b82f6';
      }
    });
    element.addEventListener('mouseleave', () => {
      if (!dragState && selectedTextId !== textId) {
        element.style.outline = 'none';
      }
    });

    // Select on click
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!dragState) {
        selectText(textId);
      }
    });

    // Double-click to edit
    element.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      enterEditMode(textId);
    });

    // Update text content
    element.addEventListener('input', () => {
      const textData = textElements.get(textId);
      if (textData) {
        textData.text = element.textContent;
        saveToLocalStorage();
      }
    });

    // Exit edit mode on blur
    element.addEventListener('blur', () => {
      exitEditMode(textId);
    });
  }

  function setupArrowElementInteraction(arrowElement, textId) {
    arrowElement.style.cursor = 'move';

    // Highlight on hover
    arrowElement.addEventListener('mouseenter', () => {
      if (!dragState) {
        arrowElement.style.outline = '2px solid #f59e0b';
      }
    });
    arrowElement.addEventListener('mouseleave', () => {
      if (!dragState && selectedTextId !== textId) {
        arrowElement.style.outline = 'none';
      }
    });

    // Select parent text on click
    arrowElement.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!dragState) {
        selectText(textId);
      }
    });
  }

  function createDevToolsUI() {
    // Create sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'text-devtools';
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      background: #1f2937;
      color: #f3f4f6;
      overflow-y: auto;
      overscroll-behavior: contain;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      background: #111827;
      border-bottom: 1px solid #374151;
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <div>
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #f9fafb;">
          Text DevTools
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
          Manage CanvasText elements
        </p>
      </div>
      <button id="text-collapse-btn" style="
        padding: 4px 8px;
        background: #374151;
        color: #f3f4f6;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      ">
        →
      </button>
    `;
    sidebar.appendChild(header);

    // Global controls
    const globalControls = document.createElement('div');
    globalControls.style.cssText = `
      padding: 12px 16px;
      background: #374151;
      border-bottom: 1px solid #4b5563;
    `;
    globalControls.innerHTML = `
      <button id="add-text-btn" style="
        width: 100%;
        padding: 8px;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
      ">
        + Add New Text
      </button>
      <button id="export-text-btn" style="
        width: 100%;
        padding: 8px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
      ">
        Export Selected Text
      </button>
      <button id="persist-mode-btn" style="
        width: 100%;
        padding: 8px;
        background: ${persistMode ? '#10b981' : '#6b7280'};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      ">
        ${persistMode ? '✓ Persist Mode ON' : 'Persist Mode OFF'}
      </button>
    `;
    sidebar.appendChild(globalControls);

    // Selected text info
    const selectedInfo = document.createElement('div');
    selectedInfo.id = 'text-selected-info';
    selectedInfo.style.cssText = `
      padding: 12px 16px;
      background: #374151;
      border-bottom: 1px solid #4b5563;
      font-size: 12px;
      color: #9ca3af;
    `;
    selectedInfo.textContent = 'No text selected';
    sidebar.appendChild(selectedInfo);

    // Text config container
    const configContainer = document.createElement('div');
    configContainer.id = 'text-config-container';
    configContainer.style.cssText = `
      padding: 8px;
    `;
    sidebar.appendChild(configContainer);

    document.body.appendChild(sidebar);

    // Create collapse tab
    const collapseTab = document.createElement('div');
    collapseTab.id = 'text-devtools-tab';
    collapseTab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%) translateY(80px);
      background: #1f2937;
      color: #f3f4f6;
      padding: 12px 8px;
      cursor: pointer;
      z-index: 9999;
      border-radius: 4px 0 0 4px;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      font-size: 14px;
      font-weight: 600;
      writing-mode: vertical-rl;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    collapseTab.textContent = 'Text DevTools';
    document.body.appendChild(collapseTab);

    // Event listeners
    document.getElementById('add-text-btn').addEventListener('click', () => {
      addNewText();
    });

    document.getElementById('export-text-btn').addEventListener('click', () => {
      exportTextElements();
    });

    document.getElementById('persist-mode-btn').addEventListener('click', () => {
      togglePersistMode();
    });

    document.getElementById('text-collapse-btn').addEventListener('click', () => {
      toggleCollapse();
    });

    collapseTab.addEventListener('click', () => {
      toggleCollapse();
    });

    // Set up mouse event listeners for dragging
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleDocumentClick);
  }

  function addNewText() {
    // Find a relative container to add text to
    const relativeContainer = document.querySelector('[style*="position: relative"]') ||
                              document.querySelector('.intro') ||
                              document.body;

    const textId = `canvas-text-${nextTextId++}`;

    // Create text element
    const textEl = document.createElement('div');
    textEl.id = textId;
    textEl.dataset.canvasText = 'true';
    textEl.contentEditable = 'false';
    textEl.textContent = 'New text';

    const position = { top: 100, left: 100 };
    textEl.dataset.position = JSON.stringify(position);

    textEl.style.cssText = `
      position: absolute;
      top: 100px;
      left: 100px;
      font-size: 24px;
      font-family: Inter, sans-serif;
      cursor: move;
      user-select: none;
      padding: 8px;
    `;

    relativeContainer.appendChild(textEl);

    // Register and select
    registerCanvasTextElement(textEl);
    selectText(textId);
    saveToLocalStorage();
  }

  function enterEditMode(textId) {
    const textData = textElements.get(textId);
    if (!textData) return;

    textData.isEditing = true;
    textData.element.contentEditable = 'true';
    textData.element.style.cursor = 'text';
    textData.element.style.userSelect = 'text';
    textData.element.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(textData.element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function exitEditMode(textId) {
    const textData = textElements.get(textId);
    if (!textData) return;

    textData.isEditing = false;
    textData.element.contentEditable = 'false';
    textData.element.style.cursor = 'move';
    textData.element.style.userSelect = 'none';
  }

  function handleMouseDown(e) {
    // Check if clicking on text element
    const textEl = e.target.closest('[data-canvas-text="true"]');
    const arrowEl = e.target.closest('[data-canvas-text-arrow="true"]');

    if (arrowEl) {
      // Find which text this arrow belongs to
      let textId = null;
      for (const [id, data] of textElements) {
        if (data.arrowElement === arrowEl) {
          textId = id;
          break;
        }
      }

      if (textId) {
        const textData = textElements.get(textId);
        e.preventDefault();

        dragState = {
          textId: textId,
          type: 'arrow',
          startX: e.clientX,
          startY: e.clientY,
          elementStartPos: { ...textData.arrow },
        };

        arrowEl.style.cursor = 'grabbing';
      }
      return;
    }

    if (textEl) {
      const textId = textEl.id;
      const textData = textElements.get(textId);
      if (!textData || textData.isEditing) return;

      e.preventDefault();

      dragState = {
        textId: textId,
        type: 'text',
        startX: e.clientX,
        startY: e.clientY,
        elementStartPos: { ...textData.position },
      };

      textEl.style.cursor = 'grabbing';
    }
  }

  function handleMouseMove(e) {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const textData = textElements.get(dragState.textId);
    if (!textData) return;

    if (dragState.type === 'text') {
      // Update text position
      const startPos = dragState.elementStartPos;
      const newPos = { ...textData.position };

      if (typeof startPos.top === 'number') {
        newPos.top = startPos.top + deltaY;
        textData.element.style.top = `${newPos.top}px`;
      }
      if (typeof startPos.left === 'number') {
        newPos.left = startPos.left + deltaX;
        textData.element.style.left = `${newPos.left}px`;
      }

      textData.position = newPos;
      textData.element.dataset.position = JSON.stringify(newPos);

      if (selectedTextId === dragState.textId) {
        updatePositionInputs(newPos);
      }
    } else if (dragState.type === 'arrow' && textData.arrowElement) {
      // Update arrow position
      const startPos = dragState.elementStartPos;
      const newPos = { ...textData.arrow };

      if (typeof startPos.top === 'number') {
        newPos.top = startPos.top + deltaY;
        textData.arrowElement.style.top = `${newPos.top}px`;
      }
      if (typeof startPos.left === 'number') {
        newPos.left = startPos.left + deltaX;
        textData.arrowElement.style.left = `${newPos.left}px`;
      }

      textData.arrow = newPos;
      textData.element.dataset.arrow = JSON.stringify(newPos);

      if (selectedTextId === dragState.textId) {
        updateArrowInputs(newPos);
      }
    }
  }

  function handleMouseUp(e) {
    if (!dragState) return;

    const textData = textElements.get(dragState.textId);
    if (textData) {
      if (dragState.type === 'text') {
        textData.element.style.cursor = 'move';
      } else if (dragState.type === 'arrow' && textData.arrowElement) {
        textData.arrowElement.style.cursor = 'move';
      }
    }

    dragState = null;
    saveToLocalStorage();
  }

  function handleDocumentClick(e) {
    const textEl = e.target.closest('[data-canvas-text="true"]');
    const arrowEl = e.target.closest('[data-canvas-text-arrow="true"]');
    const sidebar = e.target.closest('#text-devtools');

    if (!textEl && !arrowEl && !sidebar) {
      deselectText();
    }
  }

  function selectText(textId) {
    // Deselect previous
    if (selectedTextId) {
      const prevData = textElements.get(selectedTextId);
      if (prevData) {
        prevData.element.style.outline = 'none';
        if (prevData.arrowElement) {
          prevData.arrowElement.style.outline = 'none';
        }
      }
    }

    selectedTextId = textId;

    // Highlight selected
    const textData = textElements.get(textId);
    if (textData) {
      textData.element.style.outline = '2px solid #3b82f6';
      if (textData.arrowElement) {
        textData.arrowElement.style.outline = '2px solid #f59e0b';
      }
    }

    updateDevToolsUI();
  }

  function deselectText() {
    if (selectedTextId) {
      const prevData = textElements.get(selectedTextId);
      if (prevData) {
        prevData.element.style.outline = 'none';
        if (prevData.arrowElement) {
          prevData.arrowElement.style.outline = 'none';
        }
      }
    }

    selectedTextId = null;
    updateDevToolsUI();
  }

  function updateDevToolsUI() {
    const configContainer = document.getElementById('text-config-container');
    const selectedInfo = document.getElementById('text-selected-info');
    if (!configContainer || !selectedInfo) return;

    if (!selectedTextId) {
      selectedInfo.textContent = 'No text selected';
      configContainer.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          Click any CanvasText element to configure it
        </div>
      `;
      return;
    }

    const textData = textElements.get(selectedTextId);
    if (!textData) {
      selectedInfo.textContent = 'Selected text not found';
      configContainer.innerHTML = '';
      return;
    }

    selectedInfo.innerHTML = `
      <div style="font-weight: 600; color: #f9fafb;">Selected: ${selectedTextId}</div>
    `;

    const card = createTextCard(selectedTextId, textData);
    configContainer.innerHTML = '';
    configContainer.appendChild(card);
  }

  function createTextCard(id, textData) {
    const card = document.createElement('div');
    card.className = 'text-card';
    card.style.cssText = `
      background: #374151;
      border-radius: 6px;
      padding: 12px;
      border: 2px solid #3b82f6;
    `;

    // Position controls
    const positionSection = document.createElement('div');
    positionSection.style.cssText = `
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4b5563;
    `;

    const pos = textData.position || {};
    positionSection.innerHTML = `
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500;">
        TEXT POSITION (relative to container)
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
        <label style="display: flex; flex-direction: column;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Top</div>
          <input type="number" class="text-top" value="${pos.top ?? ''}" placeholder="auto"
            style="padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
        <label style="display: flex; flex-direction: column;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Left</div>
          <input type="number" class="text-left" value="${pos.left ?? ''}" placeholder="auto"
            style="padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
      </div>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Rotation (degrees)</div>
        <input type="number" class="text-rotation" value="${textData.rotation || 0}" step="1"
          style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px;">
      </label>
      <div style="font-size: 10px; color: #6b7280; font-style: italic;">
        Drag the text to adjust position
      </div>
    `;
    card.appendChild(positionSection);

    // Font controls
    const fontSection = document.createElement('div');
    fontSection.style.cssText = `
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4b5563;
    `;
    fontSection.innerHTML = `
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500;">
        FONT & COLOR
      </div>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Font Family</div>
        <select class="font-family"
          style="width: 100%; padding: 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px; cursor: pointer;">
          <option value="LoveLexie" ${textData.fontFamily === 'LoveLexie' ? 'selected' : ''}>LoveLexie</option>
          <option value="Handero" ${textData.fontFamily === 'Handero' ? 'selected' : ''}>Handero</option>
          <option value="Caveat, cursive" ${textData.fontFamily === 'Caveat, cursive' ? 'selected' : ''}>Caveat</option>
          <option value="'Playfair Display', serif" ${textData.fontFamily === "'Playfair Display', serif" ? 'selected' : ''}>Playfair Display</option>
          <option value="'Georgia Pro', serif" ${textData.fontFamily === "'Georgia Pro', serif" ? 'selected' : ''}>Georgia Pro</option>
          <option value="Inter, sans-serif" ${textData.fontFamily === 'Inter, sans-serif' ? 'selected' : ''}>Inter</option>
          <option value="'SF Pro', -apple-system, sans-serif" ${textData.fontFamily === "'SF Pro', -apple-system, sans-serif" ? 'selected' : ''}>SF Pro</option>
          <option value="Arial, sans-serif" ${textData.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
        </select>
      </label>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Font Size (px)</div>
        <input type="number" class="font-size" value="${textData.fontSize}" min="8" max="200"
          style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px;">
      </label>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Text Color</div>
        <input type="color" class="text-color" value="${rgbToHex(textData.color)}"
          style="width: 100%; height: 36px; padding: 2px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; cursor: pointer;">
      </label>
    `;
    card.appendChild(fontSection);

    // Arrow section
    const arrowSection = document.createElement('div');
    arrowSection.style.cssText = `
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4b5563;
    `;

    if (textData.arrow && textData.arrowElement) {
      const arrow = textData.arrow;
      arrowSection.innerHTML = `
        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
          <span>ARROW</span>
          <button class="remove-arrow-btn" style="padding: 2px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">Remove</button>
        </div>
        <label style="display: block; margin-bottom: 6px;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Arrow Name</div>
          <select class="arrow-name"
            style="width: 100%; padding: 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px; cursor: pointer;">
            ${availableArrows.map(name => `<option value="${name}" ${arrow.name === name ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 6px;">
          <label>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Top</div>
            <input type="number" class="arrow-top" value="${arrow.top ?? ''}" placeholder="auto"
              style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
              border-radius: 3px; color: #f3f4f6; font-size: 12px;">
          </label>
          <label>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Left</div>
            <input type="number" class="arrow-left" value="${arrow.left ?? ''}" placeholder="auto"
              style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
              border-radius: 3px; color: #f3f4f6; font-size: 12px;">
          </label>
          <label>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Scale</div>
            <input type="number" class="arrow-scale" value="${arrow.scale ?? 1}" step="0.1" placeholder="1"
              style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
              border-radius: 3px; color: #f3f4f6; font-size: 12px;">
          </label>
        </div>
        <div style="font-size: 10px; color: #6b7280; font-style: italic; margin-top: 6px;">
          Drag the arrow to adjust position
        </div>
      `;
    } else {
      arrowSection.innerHTML = `
        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500;">
          ARROW
        </div>
        <button class="add-arrow-btn" style="
          width: 100%;
          padding: 8px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">
          + Add Arrow
        </button>
      `;
    }
    card.appendChild(arrowSection);

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 6px;
      flex-direction: column;
    `;
    actions.innerHTML = `
      <button class="delete-text-btn" style="
        width: 100%;
        padding: 6px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
      ">
        Delete Text
      </button>
    `;
    card.appendChild(actions);

    // Event listeners for text position
    const topInput = card.querySelector('.text-top');
    const leftInput = card.querySelector('.text-left');
    const rotationInput = card.querySelector('.text-rotation');

    [topInput, leftInput].forEach((input, idx) => {
      const prop = ['top', 'left'][idx];
      input.addEventListener('input', () => {
        const value = input.value.trim();
        if (value === '') {
          delete textData.position[prop];
          textData.element.style[prop] = '';
        } else {
          const numValue = parseFloat(value);
          textData.position[prop] = numValue;
          textData.element.style[prop] = `${numValue}px`;
        }
        textData.element.dataset.position = JSON.stringify(textData.position);
        saveToLocalStorage();
      });
    });

    rotationInput.addEventListener('input', () => {
      const rotation = parseFloat(rotationInput.value) || 0;
      textData.rotation = rotation;
      textData.element.style.transform = `rotate(${rotation}deg)`;
      saveToLocalStorage();
    });

    // Event listeners for font
    const fontFamilySelect = card.querySelector('.font-family');
    const fontSizeInput = card.querySelector('.font-size');
    const colorInput = card.querySelector('.text-color');

    fontFamilySelect.addEventListener('change', () => {
      textData.fontFamily = fontFamilySelect.value;
      textData.element.style.fontFamily = fontFamilySelect.value;
      saveToLocalStorage();
    });

    fontSizeInput.addEventListener('input', () => {
      const size = parseFloat(fontSizeInput.value) || 24;
      textData.fontSize = size;
      textData.element.style.fontSize = `${size}px`;
      saveToLocalStorage();
    });

    colorInput.addEventListener('input', () => {
      textData.color = colorInput.value;
      textData.element.style.color = colorInput.value;
      // Also update arrow color if arrow exists
      if (textData.arrowElement) {
        textData.arrowElement.style.color = colorInput.value;
      }
      saveToLocalStorage();
    });

    // Event listeners for arrow
    const addArrowBtn = card.querySelector('.add-arrow-btn');
    const removeArrowBtn = card.querySelector('.remove-arrow-btn');

    if (addArrowBtn) {
      addArrowBtn.addEventListener('click', () => {
        addArrowToText(id);
      });
    }

    if (removeArrowBtn) {
      removeArrowBtn.addEventListener('click', () => {
        removeArrowFromText(id);
      });
    }

    if (textData.arrow) {
      const arrowNameSelect = card.querySelector('.arrow-name');
      const arrowTopInput = card.querySelector('.arrow-top');
      const arrowLeftInput = card.querySelector('.arrow-left');
      const arrowScaleInput = card.querySelector('.arrow-scale');

      arrowNameSelect.addEventListener('change', () => {
        textData.arrow.name = arrowNameSelect.value;
        textData.element.dataset.arrow = JSON.stringify(textData.arrow);
        saveToLocalStorage();
      });

      [arrowTopInput, arrowLeftInput].forEach((input, idx) => {
        const prop = ['top', 'left'][idx];
        input.addEventListener('input', () => {
          const value = input.value.trim();
          if (value === '') {
            delete textData.arrow[prop];
            if (textData.arrowElement) textData.arrowElement.style[prop] = '';
          } else {
            const numValue = parseFloat(value);
            textData.arrow[prop] = numValue;
            if (textData.arrowElement) textData.arrowElement.style[prop] = `${numValue}px`;
          }
          textData.element.dataset.arrow = JSON.stringify(textData.arrow);
          saveToLocalStorage();
        });
      });

      arrowScaleInput.addEventListener('input', () => {
        const value = arrowScaleInput.value.trim();
        if (value === '' || value === '1') {
          delete textData.arrow.scale;
          if (textData.arrowElement) textData.arrowElement.style.transform = '';
        } else {
          const numValue = parseFloat(value);
          textData.arrow.scale = numValue;
          if (textData.arrowElement) textData.arrowElement.style.transform = `scale(${numValue})`;
        }
        textData.element.dataset.arrow = JSON.stringify(textData.arrow);
        saveToLocalStorage();
      });
    }

    // Delete button
    card.querySelector('.delete-text-btn').addEventListener('click', () => {
      deleteText(id);
    });

    // Store reference for updates during drag
    card._updatePositionInputs = function (pos) {
      if (pos.top !== undefined) topInput.value = Math.round(pos.top);
      if (pos.left !== undefined) leftInput.value = Math.round(pos.left);
    };

    card._updateArrowInputs = function (arrow) {
      const arrowTopInput = card.querySelector('.arrow-top');
      const arrowLeftInput = card.querySelector('.arrow-left');
      if (arrow.top !== undefined && arrowTopInput) arrowTopInput.value = Math.round(arrow.top);
      if (arrow.left !== undefined && arrowLeftInput) arrowLeftInput.value = Math.round(arrow.left);
    };

    return card;
  }

  function addArrowToText(textId) {
    const textData = textElements.get(textId);
    if (!textData) return;

    // Create arrow config
    const arrow = {
      name: availableArrows[0] || 'up-right',
      top: 0,
      left: 0,
      width: 50,
      height: 50,
    };

    // Create arrow element
    const arrowEl = document.createElement('img');
    arrowEl.dataset.canvasTextArrow = 'true';
    arrowEl.src = `/arrows/${arrow.name}.svg`;
    arrowEl.style.cssText = `
      position: absolute;
      top: 0px;
      left: 0px;
      width: 50px;
      height: 50px;
    `;

    // Insert after text element
    textData.element.parentNode.insertBefore(arrowEl, textData.element.nextSibling);

    // Update text data
    textData.arrow = arrow;
    textData.arrowElement = arrowEl;
    textData.element.dataset.arrow = JSON.stringify(arrow);

    // Setup interaction
    setupArrowElementInteraction(arrowEl, textId);

    // Refresh UI
    updateDevToolsUI();
    saveToLocalStorage();
  }

  function removeArrowFromText(textId) {
    const textData = textElements.get(textId);
    if (!textData || !textData.arrowElement) return;

    // Remove arrow element
    textData.arrowElement.remove();
    textData.arrowElement = null;
    textData.arrow = null;
    textData.element.removeAttribute('data-arrow');

    // Refresh UI
    updateDevToolsUI();
    saveToLocalStorage();
  }

  function updatePositionInputs(pos) {
    const configContainer = document.getElementById('text-config-container');
    const card = configContainer?.querySelector('.text-card');
    if (card && card._updatePositionInputs) {
      card._updatePositionInputs(pos);
    }
  }

  function updateArrowInputs(arrow) {
    const configContainer = document.getElementById('text-config-container');
    const card = configContainer?.querySelector('.text-card');
    if (card && card._updateArrowInputs) {
      card._updateArrowInputs(arrow);
    }
  }

  function deleteText(textId) {
    const textData = textElements.get(textId);
    if (textData) {
      textData.element.remove();
      if (textData.arrowElement) {
        textData.arrowElement.remove();
      }
      textElements.delete(textId);
    }

    if (selectedTextId === textId) {
      selectedTextId = null;
      updateDevToolsUI();
    }

    saveToLocalStorage();
  }

  async function exportTextElements() {
    if (!selectedTextId) {
      alert('No text selected. Please select a text element to export.');
      return;
    }

    const textData = textElements.get(selectedTextId);
    if (!textData) {
      alert('Selected text not found');
      return;
    }

    const data = {
      text: textData.text,
      position: textData.position,
      fontSize: textData.fontSize,
      fontFamily: textData.fontFamily,
      color: textData.color,
      rotation: textData.rotation,
    };
    if (textData.arrow) {
      data.arrow = textData.arrow;
    }

    // Generate CanvasText JSX code
    const positionStr = JSON.stringify(data.position, null, 2).replace(/\n/g, '\n      ');
    const arrowStr = data.arrow ? `\n    arrow={${JSON.stringify(data.arrow, null, 2).replace(/\n/g, '\n      ')}}` : '';

    // Add color prop if not default black
    const colorStr = data.color && data.color !== 'rgb(0, 0, 0)' && data.color !== '#000000'
      ? `\n    color="${data.color}"`
      : '';

    // Add rotation prop if not 0
    const rotationStr = data.rotation !== 0
      ? `\n    rotation={${data.rotation}}`
      : '';

    const jsxCode = `<CanvasText
  position={${positionStr}}${arrowStr}${colorStr}${rotationStr}
>
  ${data.text}
</CanvasText>`;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(jsxCode);
      console.log('[TextDevTools] CanvasText configuration copied to clipboard');

      // Show feedback
      const exportBtn = document.getElementById('export-text-btn');
      const originalText = exportBtn.textContent;
      exportBtn.textContent = '✓ Copied!';
      exportBtn.style.background = '#10b981';

      setTimeout(() => {
        exportBtn.textContent = originalText;
        exportBtn.style.background = '#3b82f6';
      }, 2000);
    } catch (err) {
      console.error('[TextDevTools] Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;

    const sidebar = document.getElementById('text-devtools');
    const collapseBtn = document.getElementById('text-collapse-btn');
    const collapseTab = document.getElementById('text-devtools-tab');

    if (isCollapsed) {
      sidebar.style.transform = 'translateX(320px)';
      collapseBtn.textContent = '←';
      collapseTab.style.display = 'block';
    } else {
      sidebar.style.transform = 'translateX(0)';
      collapseBtn.textContent = '→';
      collapseTab.style.display = 'none';
    }
  }

  function togglePersistMode() {
    persistMode = !persistMode;
    localStorage.setItem('textDevToolsPersistMode', persistMode.toString());

    const btn = document.getElementById('persist-mode-btn');
    if (persistMode) {
      btn.textContent = '✓ Persist Mode ON';
      btn.style.background = '#10b981';
      saveToLocalStorage();
      console.log('[TextDevTools] Persist mode enabled');
    } else {
      btn.textContent = 'Persist Mode OFF';
      btn.style.background = '#6b7280';
      console.log('[TextDevTools] Persist mode disabled');
    }
  }

  function saveToLocalStorage() {
    if (!persistMode) return;

    const textArray = Array.from(textElements.values()).map(textData => {
      const data = {
        text: textData.text,
        position: textData.position,
        fontSize: textData.fontSize,
        fontFamily: textData.fontFamily,
        color: textData.color,
        rotation: textData.rotation,
      };
      if (textData.arrow) {
        data.arrow = textData.arrow;
      }
      return data;
    });

    localStorage.setItem('textDevToolsData', JSON.stringify(textArray));
    console.log('[TextDevTools] Saved to localStorage:', textArray);
  }

  function loadFromLocalStorage() {
    if (!persistMode) return;

    const saved = localStorage.getItem('textDevToolsData');
    if (!saved) return;

    try {
      const textArray = JSON.parse(saved);
      console.log('[TextDevTools] Loading from localStorage:', textArray);

      // Find a relative container
      const relativeContainer = document.querySelector('[style*="position: relative"]') ||
                                document.querySelector('.intro') ||
                                document.body;

      textArray.forEach(data => {
        const textId = `canvas-text-${nextTextId++}`;

        // Create text element
        const textEl = document.createElement('div');
        textEl.id = textId;
        textEl.dataset.canvasText = 'true';
        textEl.contentEditable = 'false';
        textEl.textContent = data.text;
        textEl.dataset.position = JSON.stringify(data.position);

        // Apply position styles
        textEl.style.position = 'absolute';
        Object.entries(data.position).forEach(([key, value]) => {
          if (typeof value === 'number') {
            textEl.style[key] = `${value}px`;
          } else {
            textEl.style[key] = value;
          }
        });
        textEl.style.fontSize = `${data.fontSize}px`;
        textEl.style.fontFamily = data.fontFamily;
        textEl.style.color = data.color || '#000000';
        if (data.rotation) {
          textEl.style.transform = `rotate(${data.rotation}deg)`;
        }
        textEl.style.cursor = 'move';
        textEl.style.userSelect = 'none';
        textEl.style.padding = '8px';

        relativeContainer.appendChild(textEl);

        // Create arrow if exists
        let arrowEl = null;
        if (data.arrow) {
          textEl.dataset.arrow = JSON.stringify(data.arrow);
          arrowEl = document.createElement('img');
          arrowEl.dataset.canvasTextArrow = 'true';
          arrowEl.src = `/arrows/${data.arrow.name}.svg`;
          arrowEl.style.position = 'absolute';

          Object.entries(data.arrow).forEach(([key, value]) => {
            if (key !== 'name' && typeof value === 'number') {
              arrowEl.style[key] = `${value}px`;
            } else if (key !== 'name') {
              arrowEl.style[key] = value;
            }
          });

          relativeContainer.appendChild(arrowEl);
        }

        // Register
        registerCanvasTextElement(textEl);
      });
    } catch (err) {
      console.error('[TextDevTools] Failed to load from localStorage:', err);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
