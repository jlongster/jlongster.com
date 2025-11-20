// Paper DevTools - Interactive sidebar for managing paper animations
(function () {
  let animatorRegistry = new Map(); // id -> animator
  let savedConfigs = new Map(); // id -> config
  let selectedAnimatorId = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let isCollapsed = false;

  console.log('[PaperDevTools] Script loaded');

  // Expose API for paper-animator to register animators
  window.PaperDevTools = {
    registerAnimator: function (id, animator) {
      console.log('[PaperDevTools] Registering animator:', id);
      animatorRegistry.set(id, animator);

      // Apply saved config if it exists
      const savedConfig = savedConfigs.get(id);
      if (savedConfig) {
        console.log('[PaperDevTools] Applying saved config:', id, savedConfig);
        Object.assign(animator, savedConfig);
      }

      updateDevToolsUI();
    },
    unregisterAnimator: function (id) {
      console.log('[PaperDevTools] Unregistering animator:', id);
      animatorRegistry.delete(id);
      updateDevToolsUI();
    },
    getSavedConfig: function(id) {
      return savedConfigs.get(id);
    },
    saveConfig: function(id, config) {
      savedConfigs.set(id, config);
      console.log('[PaperDevTools] Saved config:', id, config);
    }
  };

  function init() {
    console.log('[PaperDevTools] Initializing...');
    createDevToolsUI();
    setupDragListeners();
    setupKeyboardShortcuts();
    console.log('[PaperDevTools] Initialization complete');
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+R to restart all animations
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log('[PaperDevTools] Restarting all animations via keyboard shortcut');
        if (window.PaperRenderer) {
          window.PaperRenderer.restartAll();
        }
      }
    });
  }

  function createDevToolsUI() {
    // Create sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'paper-devtools';
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      background: #1f2937;
      color: #f3f4f6;
      overflow-y: auto;
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
          Paper DevTools
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
          Drag papers to adjust position
        </p>
      </div>
      <button id="collapse-btn" style="
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
      <button id="restart-all-btn" style="
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
        ↻ Restart All Animations
      </button>
      <div style="display: flex; gap: 6px;">
        <button id="export-config-btn" style="
          flex: 1;
          padding: 6px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
        ">
          Export Config
        </button>
        <button id="import-config-btn" style="
          flex: 1;
          padding: 6px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
        ">
          Import Config
        </button>
      </div>
      <input type="file" id="import-file-input" accept=".json" style="display: none;">
    `;
    sidebar.appendChild(globalControls);

    // Animators list container
    const animatorsList = document.createElement('div');
    animatorsList.id = 'animators-list';
    animatorsList.style.cssText = `
      padding: 8px;
    `;
    sidebar.appendChild(animatorsList);

    document.body.appendChild(sidebar);

    // Create collapse tab (visible when collapsed)
    const collapseTab = document.createElement('div');
    collapseTab.id = 'devtools-tab';
    collapseTab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
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
    collapseTab.textContent = 'DevTools';
    document.body.appendChild(collapseTab);

    // Event listeners
    document.getElementById('restart-all-btn').addEventListener('click', () => {
      // Trigger full restart from paper-renderer
      if (window.PaperRenderer) {
        window.PaperRenderer.restartAll();
      }
    });

    document.getElementById('export-config-btn').addEventListener('click', () => {
      exportConfiguration();
    });

    document.getElementById('import-config-btn').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importConfiguration(file);
        e.target.value = ''; // Reset input
      }
    });

    document.getElementById('collapse-btn').addEventListener('click', () => {
      toggleCollapse();
    });

    collapseTab.addEventListener('click', () => {
      toggleCollapse();
    });
  }

  function exportConfiguration() {
    // Convert savedConfigs Map to plain object
    const configObject = {};
    savedConfigs.forEach((config, id) => {
      configObject[id] = config;
    });

    const configJson = JSON.stringify(configObject, null, 2);

    // Create a blob and download
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paper-animations-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[PaperDevTools] Configuration exported');
  }

  function importConfiguration(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const configObject = JSON.parse(e.target.result);

        // Clear existing configs
        savedConfigs.clear();

        // Load new configs
        Object.entries(configObject).forEach(([id, config]) => {
          savedConfigs.set(id, config);
        });

        console.log('[PaperDevTools] Configuration imported:', configObject);

        // Restart all animations to apply the new configuration
        if (window.PaperRenderer) {
          window.PaperRenderer.restartAll();
        }
      } catch (error) {
        console.error('[PaperDevTools] Failed to import configuration:', error);
        alert('Failed to import configuration. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    const sidebar = document.getElementById('paper-devtools');
    const collapseBtn = document.getElementById('collapse-btn');
    const collapseTab = document.getElementById('devtools-tab');

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

  function updateDevToolsUI() {
    const listContainer = document.getElementById('animators-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Sort by ID for consistent ordering
    const sortedEntries = Array.from(animatorRegistry.entries()).sort((a, b) => {
      const numA = parseInt(a[0].replace('paper-', ''));
      const numB = parseInt(b[0].replace('paper-', ''));
      return numA - numB;
    });

    sortedEntries.forEach(([id, animator]) => {
      const card = createAnimatorCard(id, animator);
      listContainer.appendChild(card);
    });
  }

  function createAnimatorCard(id, animator) {
    const card = document.createElement('div');
    card.className = 'animator-card';
    card.setAttribute('data-animator-id', id);
    card.style.cssText = `
      background: #374151;
      border-radius: 6px;
      margin-bottom: 8px;
      padding: 12px;
      border: 2px solid ${selectedAnimatorId === id ? '#3b82f6' : 'transparent'};
      cursor: pointer;
      transition: border-color 0.2s;
    `;

    card.addEventListener('click', () => {
      selectAnimator(id);
    });

    // Header with title and select button
    const cardHeader = document.createElement('div');
    cardHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    `;
    cardHeader.innerHTML = `
      <div style="font-weight: 600; color: #f9fafb; font-size: 13px;">
        ${id}
      </div>
      <button class="select-btn" style="
        padding: 4px 8px;
        background: ${selectedAnimatorId === id ? '#3b82f6' : '#4b5563'};
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">
        ${selectedAnimatorId === id ? 'Selected' : 'Select'}
      </button>
    `;
    card.appendChild(cardHeader);

    // Position controls
    const positionSection = document.createElement('div');
    positionSection.style.cssText = `
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4b5563;
    `;
    positionSection.innerHTML = `
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500;">
        POSITION & ROTATION
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 6px;">
        <label style="flex: 1;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">X</div>
          <input type="number" class="offset-x" value="${animator.offsetX}"
            style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
        <label style="flex: 1;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Y</div>
          <input type="number" class="offset-y" value="${animator.offsetY}"
            style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
      </div>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Rotation (degrees)</div>
        <input type="number" class="rotation" value="${animator.rotation || 0}" step="1"
          style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px;">
      </label>
      <div style="font-size: 10px; color: #6b7280; font-style: italic;">
        Click "Select" then drag the paper to adjust position
      </div>
    `;
    card.appendChild(positionSection);

    // Timing controls
    const timingSection = document.createElement('div');
    timingSection.style.cssText = `
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4b5563;
    `;
    timingSection.innerHTML = `
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500;">
        PLAYBACK TIMING
      </div>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Start Delay (ms)</div>
        <input type="number" class="start-delay" value="${animator.startDelay || 0}" min="0" step="100"
          style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px;">
      </label>
      <div style="display: flex; gap: 8px;">
        <label style="flex: 1;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Start Keyframe</div>
          <input type="number" class="start-keyframe" value="${animator.startKeyframe || 0}" min="0" max="${animator.totalKeyframes - 1}"
            style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
        <label style="flex: 1;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">End Keyframe</div>
          <input type="number" class="end-keyframe" value="${animator.endKeyframe}" min="0" max="${animator.totalKeyframes - 1}"
            style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
      </div>
    `;
    card.appendChild(timingSection);

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 6px;
    `;
    actions.innerHTML = `
      <button class="restart-btn" style="
        width: 100%;
        padding: 6px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
      ">
        ↻ Restart
      </button>
    `;
    card.appendChild(actions);

    // Event listeners
    const offsetXInput = card.querySelector('.offset-x');
    const offsetYInput = card.querySelector('.offset-y');
    const rotationInput = card.querySelector('.rotation');
    const startDelayInput = card.querySelector('.start-delay');
    const startKeyframeInput = card.querySelector('.start-keyframe');
    const endKeyframeInput = card.querySelector('.end-keyframe');

    // Auto-apply offset changes
    offsetXInput.addEventListener('input', () => {
      const newOffsetX = parseFloat(offsetXInput.value) || 0;
      animator.updateOffsets(newOffsetX, animator.offsetY);
      saveConfig(id, animator);
    });

    offsetYInput.addEventListener('input', () => {
      const newOffsetY = parseFloat(offsetYInput.value) || 0;
      animator.updateOffsets(animator.offsetX, newOffsetY);
      saveConfig(id, animator);
    });

    // Auto-apply rotation changes
    rotationInput.addEventListener('input', () => {
      const newRotation = parseFloat(rotationInput.value) || 0;
      animator.updateRotation(newRotation);
      saveConfig(id, animator);
    });

    // Auto-apply timing changes
    startDelayInput.addEventListener('change', () => {
      animator.startDelay = parseFloat(startDelayInput.value) || 0;
      saveConfig(id, animator);
    });

    startKeyframeInput.addEventListener('change', () => {
      animator.startKeyframe = parseInt(startKeyframeInput.value) || 0;
      saveConfig(id, animator);
    });

    endKeyframeInput.addEventListener('change', () => {
      animator.endKeyframe = parseInt(endKeyframeInput.value) || animator.endKeyframe;
      saveConfig(id, animator);
    });

    card.querySelector('.select-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      selectAnimator(id);
    });

    card.querySelector('.restart-btn').addEventListener('click', (e) => {
      e.stopPropagation();

      // Trigger restart for this specific animator
      if (window.PaperRenderer) {
        window.PaperRenderer.restartAnimator(id);
      }
    });

    // Auto-update offset inputs when dragging
    card._updateOffsets = function (x, y) {
      offsetXInput.value = x;
      offsetYInput.value = y;
    };

    return card;
  }

  function saveConfig(id, animator) {
    const config = {
      offsetX: animator.offsetX,
      offsetY: animator.offsetY,
      rotation: animator.rotation,
      startDelay: animator.startDelay,
      startKeyframe: animator.startKeyframe,
      endKeyframe: animator.endKeyframe,
    };

    savedConfigs.set(id, config);
    console.log('[PaperDevTools] Saved config:', id, config);
  }

  function selectAnimator(id) {
    const previousId = selectedAnimatorId;
    selectedAnimatorId = id;

    // Update all cards
    const cards = document.querySelectorAll('.animator-card');
    cards.forEach((card) => {
      const cardId = card.getAttribute('data-animator-id');
      if (cardId === id) {
        card.style.borderColor = '#3b82f6';
        const btn = card.querySelector('.select-btn');
        btn.textContent = 'Selected';
        btn.style.background = '#3b82f6';
      } else {
        card.style.borderColor = 'transparent';
        const btn = card.querySelector('.select-btn');
        btn.textContent = 'Select';
        btn.style.background = '#4b5563';
      }
    });

    // Remove outline from previous paper element
    if (previousId !== null) {
      const prevAnimator = animatorRegistry.get(previousId);
      if (prevAnimator) {
        prevAnimator.paperElement.style.outline = '';
        prevAnimator.paperElement.style.outlineOffset = '';
      }
    }
  }

  function setupDragListeners() {
    document.addEventListener('mousedown', (e) => {
      // Use elementFromPoint to check what's actually at the mouse position
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);

      // Check if we clicked on any paper element
      let clickedPaperId = null;
      for (const [id, animator] of animatorRegistry.entries()) {
        const paperElement = animator.paperElement;
        if (elementAtPoint && (paperElement.contains(elementAtPoint) || paperElement === elementAtPoint)) {
          clickedPaperId = id;
          break;
        }
      }

      // If we clicked on a paper element
      if (clickedPaperId !== null) {
        // Select it if not already selected
        if (selectedAnimatorId !== clickedPaperId) {
          selectAnimator(clickedPaperId);
        }

        // Start dragging
        const animator = animatorRegistry.get(clickedPaperId);
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragOffsetX = animator.offsetX;
        dragOffsetY = animator.offsetY;

        animator.paperElement.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || selectedAnimatorId === null) return;

      const animator = animatorRegistry.get(selectedAnimatorId);
      if (!animator) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      const newOffsetX = dragOffsetX + deltaX;
      const newOffsetY = dragOffsetY + deltaY;

      animator.updateOffsets(newOffsetX, newOffsetY);

      // Update the UI
      const card = document.querySelector(`[data-animator-id="${selectedAnimatorId}"]`);
      if (card && card._updateOffsets) {
        card._updateOffsets(newOffsetX, newOffsetY);
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging && selectedAnimatorId !== null) {
        const animator = animatorRegistry.get(selectedAnimatorId);
        if (animator) {
          animator.paperElement.style.cursor = 'grab';
          // Save config after dragging
          saveConfig(selectedAnimatorId, animator);
        }
      }
      isDragging = false;
    });

    // Set cursor for selected paper when hovering over it
    // We need to use mousemove to continuously check elementFromPoint
    let lastCursorState = false;
    document.addEventListener('mousemove', (e) => {
      if (selectedAnimatorId === null || isDragging) return;

      const animator = animatorRegistry.get(selectedAnimatorId);
      if (!animator) return;

      const paperElement = animator.paperElement;

      // Use elementFromPoint to check what's actually at the mouse position
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const isOverPaper = elementAtPoint && (paperElement.contains(elementAtPoint) || paperElement === elementAtPoint);

      // Only update cursor if state changed (performance optimization)
      if (isOverPaper !== lastCursorState) {
        paperElement.style.cursor = isOverPaper ? 'grab' : '';
        lastCursorState = isOverPaper;
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
