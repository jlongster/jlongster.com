// Paper DevTools - Interactive sidebar for managing paper animations
(function () {
  let animatorRegistry = new Map(); // id -> animator
  let savedConfigs = new Map(); // id -> config
  let selectedAnimatorId = null;
  let lastUnregisteredId = null; // Track last unregistered ID for auto-reselect

  let isCollapsed = true;

  console.log('[PaperDevTools] Script loaded');

  // Expose API for paper-animator to register animators
  window.PaperDevTools = {
    registerAnimator: function (id, animator) {
      console.log('[PaperDevTools] Registering animator:', id);
      animatorRegistry.set(id, animator);

      // Read config from PaperAnimator (source of truth)
      if (window.PaperAnimator && window.PaperAnimator.getConfig) {
        const config = window.PaperAnimator.getConfig(id);
        if (config) {
          savedConfigs.set(id, config);
          console.log(
            '[PaperDevTools] Loaded config from PaperAnimator:',
            id,
            config,
          );
        }
      }

      // Auto-reselect if this was the previously unregistered animator (restart case)
      if (lastUnregisteredId === id) {
        console.log('[PaperDevTools] Auto-reselecting after restart:', id);
        lastUnregisteredId = null;
        selectAnimator(id);
      } else {
        updateDevToolsUI();
      }
    },
    unregisterAnimator: function (id) {
      console.log('[PaperDevTools] Unregistering animator:', id);
      animatorRegistry.delete(id);
      if (selectedAnimatorId === id) {
        lastUnregisteredId = id; // Remember for auto-reselect
        selectedAnimatorId = null;
      }
      updateDevToolsUI();
    },
    getSavedConfig: function (id) {
      return savedConfigs.get(id);
    },
    saveConfig: function (id, config) {
      savedConfigs.set(id, config);
      console.log('[PaperDevTools] Saved config:', id, config);
    },
    selectAnimator: function (id) {
      selectAnimator(id);
    },
    onConfigUpdate: function (id) {
      // Update the UI to reflect the new config values
      console.log('[PaperDevTools] onConfigUpdate called for:', id);
      updateDevToolsUI();
    },
  };

  function init() {
    console.log('[PaperDevTools] Initializing...');
    createDevToolsUI();

    // Apply initial collapsed state
    if (isCollapsed) {
      const sidebar = document.getElementById('paper-devtools');
      const collapseBtn = document.getElementById('collapse-btn');
      const collapseTab = document.getElementById('devtools-tab');

      if (sidebar) sidebar.style.transform = 'translateX(320px)';
      if (collapseBtn) collapseBtn.textContent = '←';
      if (collapseTab) collapseTab.style.display = 'block';
    }

    setupKeyboardShortcuts();
    console.log('[PaperDevTools] Initialization complete');
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl+Shift+R to restart all animations
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log(
          '[PaperDevTools] Restarting all animations via keyboard shortcut',
        );
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
          Paper DevTools
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
          Click any paper to configure it
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
      <button id="new-animation-btn" style="
        width: 100%;
        padding: 8px;
        background: #f59e0b;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
      ">
        + Create New Animation
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

    // Selected paper info
    const selectedInfo = document.createElement('div');
    selectedInfo.id = 'selected-info';
    selectedInfo.style.cssText = `
      padding: 12px 16px;
      background: #374151;
      border-bottom: 1px solid #4b5563;
      font-size: 12px;
      color: #9ca3af;
    `;
    selectedInfo.textContent = 'No paper selected';
    sidebar.appendChild(selectedInfo);

    // Animator config container (will show selected paper's config)
    const configContainer = document.createElement('div');
    configContainer.id = 'config-container';
    configContainer.style.cssText = `
      padding: 8px;
    `;
    sidebar.appendChild(configContainer);

    document.body.appendChild(sidebar);

    // Create collapse tab (visible when collapsed)
    const collapseTab = document.createElement('div');
    collapseTab.id = 'devtools-tab';
    collapseTab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%) translateY(-200px);
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
    collapseTab.textContent = 'Paper DevTools';
    document.body.appendChild(collapseTab);

    // Event listeners
    document.getElementById('restart-all-btn').addEventListener('click', () => {
      if (window.PaperRenderer) {
        window.PaperRenderer.restartAll();
      }
    });

    document.getElementById('new-animation-btn').addEventListener('click', () => {
      openNewAnimationEditor();
    });

    document
      .getElementById('export-config-btn')
      .addEventListener('click', () => {
        exportConfiguration();
      });

    document
      .getElementById('import-config-btn')
      .addEventListener('click', () => {
        document.getElementById('import-file-input').click();
      });

    document
      .getElementById('import-file-input')
      .addEventListener('change', e => {
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

  async function exportConfiguration() {
    if (!selectedAnimatorId) {
      alert('No animation selected');
      return;
    }

    const selectedAnimator = animatorRegistry.get(selectedAnimatorId);
    if (!selectedAnimator) {
      alert('Selected animation not found');
      return;
    }

    const groupName = selectedAnimator.groupName;
    let configToExport;

    if (groupName) {
      // Export all configs for the group as an array
      const groupAnimators = Array.from(animatorRegistry.entries())
        .filter(([_, animator]) => animator.groupName === groupName)
        .sort((a, b) => {
          const numA = parseInt(a[0].replace('paper-', ''));
          const numB = parseInt(b[0].replace('paper-', ''));
          return numA - numB;
        });

      configToExport = groupAnimators.map(([id, _]) => {
        const config = savedConfigs.get(id);
        const animations = window.PaperAnimator?.getAnimations() || {};
        const firstAnimName = Object.keys(animations)[0] || null;
        return config || {
          animationName: firstAnimName,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          scale: 1,
          startKeyframe: 0,
          endKeyframe: 59,
        };
      });
    } else {
      // Export just the selected animation's config (not as an array)
      const config = savedConfigs.get(selectedAnimatorId);
      const animations = window.PaperAnimator?.getAnimations() || {};
      const firstAnimName = Object.keys(animations)[0] || null;
      configToExport = config || {
        animationName: firstAnimName,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        scale: 1,
        startKeyframe: 0,
        endKeyframe: 59,
      };
    }

    const configJson = JSON.stringify(configToExport, null, 2);

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(configJson);
      console.log('[PaperDevTools] Configuration copied to clipboard:', configToExport);

      // Show feedback to user
      const exportBtn = document.getElementById('export-config-btn');
      const originalText = exportBtn.textContent;
      exportBtn.textContent = '✓ Copied!';
      exportBtn.style.background = '#10b981';

      setTimeout(() => {
        exportBtn.textContent = originalText;
        exportBtn.style.background = '#3b82f6';
      }, 2000);
    } catch (err) {
      console.error('[PaperDevTools] Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  }

  function importConfiguration(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const configData = JSON.parse(e.target.result);

        // Clear existing configs
        savedConfigs.clear();

        // Handle array format
        if (configData.animations && Array.isArray(configData.animations)) {
          configData.animations.forEach((config, index) => {
            const paperId = `paper-${index}`;
            savedConfigs.set(paperId, config);
          });
          console.log('[PaperDevTools] Configuration imported:', configData);
        }

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

    // Save state to localStorage
    localStorage.setItem('paperDevToolsCollapsed', isCollapsed.toString());

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
    const configContainer = document.getElementById('config-container');
    const selectedInfo = document.getElementById('selected-info');
    if (!configContainer || !selectedInfo) return;

    if (!selectedAnimatorId) {
      selectedInfo.textContent = 'No paper selected';
      configContainer.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          Click any paper element to configure it
        </div>
      `;
      return;
    }

    const animator = animatorRegistry.get(selectedAnimatorId);
    if (!animator) {
      selectedInfo.textContent = 'Selected paper not found';
      configContainer.innerHTML = '';
      return;
    }

    const groupName = animator.groupName || 'none';
    selectedInfo.innerHTML = `
      <div style="font-weight: 600; color: #f9fafb;">Selected: ${selectedAnimatorId}</div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Group: ${groupName}</div>
    `;

    const card = createAnimatorCard(selectedAnimatorId, animator);
    configContainer.innerHTML = '';
    configContainer.appendChild(card);
  }

  function createAnimatorCard(id, animator) {
    const card = document.createElement('div');
    card.className = 'animator-card';
    card.style.cssText = `
      background: #374151;
      border-radius: 6px;
      padding: 12px;
      border: 2px solid #3b82f6;
    `;

    // Animation selector
    const animations = window.PaperAnimator?.getAnimations() || {};
    const currentConfig = window.PaperAnimator?.getConfig(id) || {};
    const currentAnimationName = currentConfig.animationName ?? Object.keys(animations)[0];

    const animationSection = document.createElement('div');
    animationSection.style.cssText = `
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #4b5563;
    `;

    const animationOptions = Object.keys(animations)
      .map((animName) => {
        return `<option value="${animName}" ${
          animName === currentAnimationName ? 'selected' : ''
        }>${animName}</option>`;
      })
      .join('');

    animationSection.innerHTML = `
      <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 500;">
        ANIMATION
      </div>
      <label style="display: block;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Select Animation</div>
        <select class="animation-selector"
          style="width: 100%; padding: 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px; cursor: pointer;">
          ${animationOptions}
        </select>
      </label>
    `;
    card.appendChild(animationSection);

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
        <input type="number" class="rotation" value="${
          animator.rotation || 0
        }" step="1"
          style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px;">
      </label>
      <label style="display: block; margin-bottom: 6px;">
        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Scale (0-3)</div>
        <input type="number" class="scale" value="${
          animator.globalScale !== undefined ? animator.globalScale : 1
        }" step="0.1" min="0" max="3"
          style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 12px;">
      </label>
      <div style="font-size: 10px; color: #6b7280; font-style: italic;">
        Drag the paper to adjust position
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
      <div style="display: flex; gap: 8px;">
        <label style="flex: 1;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Start Keyframe</div>
          <input type="number" class="start-keyframe" value="${
            animator.startKeyframe || 0
          }" min="0" max="${animator.totalKeyframes - 1}"
            style="width: 100%; padding: 4px 6px; background: #1f2937; border: 1px solid #4b5563;
            border-radius: 3px; color: #f3f4f6; font-size: 12px;">
        </label>
        <label style="flex: 1;">
          <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">End Keyframe</div>
          <input type="number" class="end-keyframe" value="${
            animator.endKeyframe
          }" min="0" max="${animator.totalKeyframes - 1}"
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
      flex-direction: column;
    `;
    actions.innerHTML = `
      <button class="edit-animation-btn" style="
        width: 100%;
        padding: 8px;
        background: #f59e0b;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      ">
        ✎ Edit Animation
      </button>
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
    const animationSelector = card.querySelector('.animation-selector');
    const offsetXInput = card.querySelector('.offset-x');
    const offsetYInput = card.querySelector('.offset-y');
    const rotationInput = card.querySelector('.rotation');
    const scaleInput = card.querySelector('.scale');
    const startKeyframeInput = card.querySelector('.start-keyframe');
    const endKeyframeInput = card.querySelector('.end-keyframe');

    // Animation selector change
    animationSelector.addEventListener('change', e => {
      const newAnimationName = animationSelector.value;
      const currentConfig = window.PaperAnimator.getConfig(id);

      const updatedConfig = {
        animationName: newAnimationName,
        startKeyframe: 0,
        offsetX: currentConfig.offsetX,
        offsetY: currentConfig.offsetY,
        rotation: currentConfig.rotation,
        scale: currentConfig.scale,
        endKeyframe: currentConfig.endKeyframe,
      };

      window.PaperAnimator.clearConfig(id);
      window.PaperAnimator.setConfig(id, updatedConfig);
      savedConfigs.set(id, updatedConfig);

      if (window.PaperRenderer) {
        window.PaperRenderer.restartAnimator(id);
      }
    });

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

    // Auto-apply scale changes
    scaleInput.addEventListener('input', () => {
      const newScale = parseFloat(scaleInput.value);
      if (!isNaN(newScale)) {
        animator.updateScale(newScale);
        saveConfig(id, animator);
      }
    });

    // Auto-apply timing changes
    startKeyframeInput.addEventListener('change', () => {
      animator.startKeyframe = parseInt(startKeyframeInput.value) || 0;
      saveConfig(id, animator);
    });

    endKeyframeInput.addEventListener('change', () => {
      animator.endKeyframe =
        parseInt(endKeyframeInput.value) || animator.endKeyframe;
      saveConfig(id, animator);
    });

    card.querySelector('.restart-btn').addEventListener('click', e => {
      if (window.PaperRenderer) {
        window.PaperRenderer.restartAnimator(id);
      }
    });

    card.querySelector('.edit-animation-btn').addEventListener('click', e => {
      openAnimationEditor(id, animator);
    });

    // Auto-update offset inputs when dragging
    card._updateOffsets = function (x, y) {
      offsetXInput.value = x;
      offsetYInput.value = y;
    };

    return card;
  }

  function openAnimationEditor(id, animator) {
    if (!window.PaperAnimationEditor) {
      console.error('[PaperDevTools] PaperAnimationEditor not loaded');
      return;
    }

    const currentConfig = window.PaperAnimator?.getConfig(id) || {};
    const animationName = currentConfig.animationName ?? animator.animationName;

    // Hide devtools sidebar
    const sidebar = document.getElementById('paper-devtools');
    const collapseTab = document.getElementById('devtools-tab');
    if (sidebar) sidebar.style.display = 'none';
    if (collapseTab) collapseTab.style.display = 'none';

    // Open the animation editor
    window.PaperAnimationEditor.open(animationName, animator.paperElement, animator, {
      onClose: () => {
        // Restore devtools to its previous state
        if (isCollapsed) {
          // Was collapsed - show the tab
          if (collapseTab) collapseTab.style.display = 'block';
        } else {
          // Was expanded - show the sidebar
          if (sidebar) sidebar.style.display = 'block';
        }
      },
      onAnimationChange: (animName, animationData) => {
        console.log('[PaperDevTools] Animation changed:', animName, animationData);
      }
    });
  }

  function openNewAnimationEditor() {
    if (!window.PaperAnimationEditor) {
      console.error('[PaperDevTools] PaperAnimationEditor not loaded');
      return;
    }

    // Hide devtools sidebar
    const sidebar = document.getElementById('paper-devtools');
    const collapseTab = document.getElementById('devtools-tab');
    if (sidebar) sidebar.style.display = 'none';
    if (collapseTab) collapseTab.style.display = 'none';

    // Open the animation editor for new animation
    window.PaperAnimationEditor.openNew({
      onClose: () => {
        // Restore devtools to its previous state
        if (isCollapsed) {
          // Was collapsed - show the tab
          if (collapseTab) collapseTab.style.display = 'block';
        } else {
          // Was expanded - show the sidebar
          if (sidebar) sidebar.style.display = 'block';
        }
      },
      onAnimationChange: (animIndex, animationData) => {
        console.log('[PaperDevTools] New animation created:', animationData);
      }
    });
  }

  function saveConfig(id, animator) {
    const config = {
      animationName: animator.animationName,
      offsetX: animator.offsetX,
      offsetY: animator.offsetY,
      rotation: animator.rotation,
      scale: animator.globalScale,
      startKeyframe: animator.startKeyframe,
      endKeyframe: animator.endKeyframe,
    };

    // Save to PaperAnimator (source of truth)
    if (window.PaperAnimator && window.PaperAnimator.setConfig) {
      window.PaperAnimator.setConfig(id, config);
    }

    savedConfigs.set(id, config);
    console.log('[PaperDevTools] Saved config:', id, config);
  }

  function selectAnimator(id) {
    selectedAnimatorId = id;
    updateDevToolsUI();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
