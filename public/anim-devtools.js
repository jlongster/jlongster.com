// Animation DevTools - Interactive sidebar for managing animation coordination
(function () {
  let isCollapsed = true;
  let selectedGroup = null;

  console.log('[AnimDevTools] Script loaded');

  function init() {
    console.log('[AnimDevTools] Initializing...');
    createDevToolsUI();
    // Wait for AnimationCoordinator to be ready
    setTimeout(() => {
      updateDevToolsUI();
    }, 100);
    console.log('[AnimDevTools] Initialization complete');
  }

  function createDevToolsUI() {
    // Create sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'anim-devtools';
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
          Animation DevTools
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">
          Coordinate animation groups
        </p>
      </div>
      <button id="anim-collapse-btn" style="
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
      <button id="refresh-groups-btn" style="
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
        ↻ Refresh Groups
      </button>
      <button id="export-anim-btn" style="
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
        Export Selected Group
      </button>
    `;
    sidebar.appendChild(globalControls);

    // Groups list container
    const groupsContainer = document.createElement('div');
    groupsContainer.id = 'anim-groups-container';
    groupsContainer.style.cssText = `
      padding: 8px;
    `;
    sidebar.appendChild(groupsContainer);

    document.body.appendChild(sidebar);

    // Create collapse tab - positioned below other devtools tabs
    const collapseTab = document.createElement('div');
    collapseTab.id = 'anim-devtools-tab';
    collapseTab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%) translateY(200px);
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
    collapseTab.textContent = 'Anim DevTools';
    document.body.appendChild(collapseTab);

    // Apply initial collapsed state
    if (isCollapsed) {
      sidebar.style.transform = 'translateX(320px)';
      collapseTab.style.display = 'block';
    }

    // Event listeners
    document.getElementById('refresh-groups-btn').addEventListener('click', () => {
      updateDevToolsUI();
    });

    document.getElementById('export-anim-btn').addEventListener('click', () => {
      exportGroupConfig();
    });

    document.getElementById('anim-collapse-btn').addEventListener('click', () => {
      toggleCollapse();
    });

    collapseTab.addEventListener('click', () => {
      toggleCollapse();
    });
  }

  function getGroups() {
    if (!window.AnimationCoordinator || !window.AnimationCoordinator.getGroups) {
      return new Map();
    }
    return window.AnimationCoordinator.getGroups();
  }

  function updateDevToolsUI() {
    const container = document.getElementById('anim-groups-container');
    if (!container) return;

    const groups = getGroups();

    if (groups.size === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          No animation groups found.<br>
          Make sure AnimationCoordinator is loaded.
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    groups.forEach((groupData, groupName) => {
      const card = createGroupCard(groupName, groupData);
      container.appendChild(card);
    });
  }

  function createGroupCard(groupName, groupData) {
    const isSelected = selectedGroup === groupName;

    const card = document.createElement('div');
    card.className = 'anim-group-card';
    card.style.cssText = `
      background: #374151;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      border: 2px solid ${isSelected ? '#3b82f6' : 'transparent'};
      cursor: pointer;
    `;

    // Header with group name and status
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const statusColor = groupData.triggered ? '#10b981' : '#f59e0b';
    const statusText = groupData.triggered ? 'Triggered' : 'Pending';

    header.innerHTML = `
      <div style="font-weight: 600; color: #f9fafb;">${groupName}</div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${statusColor};
        "></span>
        <span style="font-size: 10px; color: #9ca3af;">${statusText}</span>
      </div>
    `;
    card.appendChild(header);

    // Info row
    const info = document.createElement('div');
    info.style.cssText = `
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 8px;
    `;
    info.textContent = `${groupData.elements.length} element${groupData.elements.length !== 1 ? 's' : ''}`;
    card.appendChild(info);

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
    `;
    actions.innerHTML = `
      <button class="trigger-btn" style="
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
        ▶ Trigger
      </button>
    `;
    card.appendChild(actions);

    // Elements list
    const elementsList = document.createElement('div');
    elementsList.style.cssText = `
      border-top: 1px solid #4b5563;
      padding-top: 8px;
    `;

    const elementsHeader = document.createElement('div');
    elementsHeader.style.cssText = `
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 6px;
      font-weight: 500;
    `;
    elementsHeader.textContent = 'ELEMENTS';
    elementsList.appendChild(elementsHeader);

    groupData.elements.forEach((elemData, index) => {
      const elementRow = createElementRow(groupName, elemData, index);
      elementsList.appendChild(elementRow);
    });

    card.appendChild(elementsList);

    // Event listeners
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button') && !e.target.closest('input')) {
        selectGroup(groupName);
      }
    });

    card.querySelector('.trigger-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      triggerGroup(groupName);
    });

    return card;
  }

  function createElementRow(groupName, elemData, index) {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      background: #1f2937;
      border-radius: 4px;
      margin-bottom: 4px;
    `;

    // Type badge
    const typeColors = {
      paper: '#f59e0b',
      text: '#3b82f6',
      arrow: '#10b981',
      unknown: '#6b7280',
    };
    const typeColor = typeColors[elemData.type] || typeColors.unknown;

    // Element identifier
    let elementId = '';
    if (elemData.element.id) {
      elementId = elemData.element.id;
    } else if (elemData.element.dataset?.paperId) {
      elementId = elemData.element.dataset.paperId;
    } else {
      elementId = `${elemData.type}-${index}`;
    }

    row.innerHTML = `
      <span style="
        font-size: 9px;
        padding: 2px 6px;
        background: ${typeColor};
        color: white;
        border-radius: 3px;
        font-weight: 600;
        text-transform: uppercase;
      ">${elemData.type}</span>
      <span style="flex: 1; font-size: 11px; color: #d1d5db; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${elementId}
      </span>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 10px; color: #9ca3af;">Delay:</span>
        <input type="number" class="delay-input" value="${elemData.delay}" min="0" step="50"
          data-group="${groupName}" data-index="${index}"
          style="width: 60px; padding: 2px 4px; background: #374151; border: 1px solid #4b5563;
          border-radius: 3px; color: #f3f4f6; font-size: 11px; text-align: right;">
        <span style="font-size: 10px; color: #9ca3af;">ms</span>
      </div>
    `;

    // Delay input listener
    const delayInput = row.querySelector('.delay-input');
    delayInput.addEventListener('change', (e) => {
      const newDelay = parseInt(e.target.value) || 0;
      updateElementDelay(groupName, index, newDelay);
    });

    delayInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return row;
  }

  function selectGroup(groupName) {
    selectedGroup = groupName;
    updateDevToolsUI();
  }

  function triggerGroup(groupName) {
    if (window.AnimationCoordinator && window.AnimationCoordinator.triggerGroup) {
      // Reset first if already triggered
      const groups = getGroups();
      const groupData = groups.get(groupName);
      if (groupData && groupData.triggered) {
        resetGroup(groupName);
        // Small delay to let reset complete
        setTimeout(() => {
          window.AnimationCoordinator.triggerGroup(groupName);
          updateDevToolsUI();
        }, 50);
      } else {
        window.AnimationCoordinator.triggerGroup(groupName);
        updateDevToolsUI();
      }
    }
  }

  function resetGroup(groupName) {
    if (window.AnimationCoordinator && window.AnimationCoordinator.resetGroup) {
      window.AnimationCoordinator.resetGroup(groupName);
      updateDevToolsUI();
    }
  }

  function updateElementDelay(groupName, elementIndex, newDelay) {
    if (window.AnimationCoordinator && window.AnimationCoordinator.setElementDelay) {
      window.AnimationCoordinator.setElementDelay(groupName, elementIndex, newDelay);

      // Also update the data attribute on the element
      const groups = getGroups();
      const groupData = groups.get(groupName);
      if (groupData && groupData.elements[elementIndex]) {
        const element = groupData.elements[elementIndex].element;
        element.dataset.animDelay = newDelay;
      }
    }
  }

  async function exportGroupConfig() {
    if (!selectedGroup) {
      alert('No group selected. Please select a group to export.');
      return;
    }

    const groups = getGroups();
    const groupData = groups.get(selectedGroup);
    if (!groupData) {
      alert('Selected group not found');
      return;
    }

    // Build export data
    const exportData = {
      group: selectedGroup,
      elements: groupData.elements.map((elemData, index) => {
        let elementId = '';
        if (elemData.element.id) {
          elementId = elemData.element.id;
        } else if (elemData.element.dataset?.paperId) {
          elementId = elemData.element.dataset.paperId;
        } else {
          elementId = `${elemData.type}-${index}`;
        }

        return {
          id: elementId,
          type: elemData.type,
          delay: elemData.delay,
        };
      }),
    };

    // Generate code snippet
    let codeSnippet = `// Animation group: "${selectedGroup}"\n`;
    codeSnippet += `// Delays configuration:\n`;
    exportData.elements.forEach((elem) => {
      codeSnippet += `// - ${elem.id} (${elem.type}): ${elem.delay}ms\n`;
    });
    codeSnippet += `\n// JSX props for each element:\n`;
    exportData.elements.forEach((elem) => {
      if (elem.type === 'paper') {
        codeSnippet += `anim={{ group: '${selectedGroup}', delay: ${elem.delay}, trigger: 'load' }}\n`;
      } else if (elem.type === 'text') {
        codeSnippet += `anim={{ group: '${selectedGroup}', textDelay: ${elem.delay}, trigger: 'load' }}\n`;
      } else if (elem.type === 'arrow') {
        codeSnippet += `// Arrow delay set via arrowDelay in parent CanvasText\n`;
      }
    });

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(codeSnippet);
      console.log('[AnimDevTools] Configuration copied to clipboard');

      // Show feedback
      const exportBtn = document.getElementById('export-anim-btn');
      const originalText = exportBtn.textContent;
      exportBtn.textContent = '✓ Copied!';
      exportBtn.style.background = '#3b82f6';

      setTimeout(() => {
        exportBtn.textContent = originalText;
        exportBtn.style.background = '#10b981';
      }, 2000);
    } catch (err) {
      console.error('[AnimDevTools] Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;

    const sidebar = document.getElementById('anim-devtools');
    const collapseBtn = document.getElementById('anim-collapse-btn');
    const collapseTab = document.getElementById('anim-devtools-tab');

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

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
