(function() {
  'use strict';

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const state = {
    isActive: false,
    draggedElement: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    initialTransform: { x: 0, y: 0 }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function getTransformValues(element) {
    const style = window.getComputedStyle(element);
    const transform = style.transform;

    if (transform === 'none') {
      return { x: 0, y: 0 };
    }

    const matrix = transform.match(/matrix\(([^)]+)\)/);
    if (matrix) {
      const values = matrix[1].split(', ');
      return {
        x: parseFloat(values[4]) || 0,
        y: parseFloat(values[5]) || 0
      };
    }

    return { x: 0, y: 0 };
  }

  function setTransform(element, x, y) {
    element.style.transform = `translate(${x}px, ${y}px)`;
  }

  // ============================================================================
  // UI CREATION
  // ============================================================================

  function createUI() {
    const style = document.createElement('style');
    style.id = 'element-mover-style';
    style.textContent = `
      .element-mover-hoverable:hover {
        outline: 1px dashed rgba(255, 107, 107, 0.5) !important;
        outline-offset: 2px !important;
        cursor: move !important;
      }

      .element-mover-hoverable.element-mover-dragging {
        outline: none !important;
      }

      body.element-mover-dragging-body * {
        cursor: none !important;
      }

      body.element-mover-dragging-body .element-mover-hoverable:hover {
        cursor: none !important;
      }

      #element-mover-indicator {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #FF6B6B;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        z-index: 100000;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  function showIndicator() {
    let indicator = document.getElementById('element-mover-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'element-mover-indicator';
      indicator.textContent = 'Element Mover Active - Hover and drag';
      document.body.appendChild(indicator);
    }
  }

  function hideIndicator() {
    const indicator = document.getElementById('element-mover-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // ============================================================================
  // DRAGGING HELPERS
  // ============================================================================

  // ============================================================================
  // DRAGGING
  // ============================================================================

  function startDrag(e, element) {
    state.draggedElement = element;
    state.isDragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;

    const current = getTransformValues(element);
    state.currentX = current.x;
    state.currentY = current.y;

    // Hide outline and cursor during drag
    element.classList.add('element-mover-dragging');
    document.body.classList.add('element-mover-dragging-body');

    e.preventDefault();
  }

  function drag(e) {
    if (!state.isDragging || !state.draggedElement) return;

    let deltaX = e.clientX - state.startX;
    let deltaY = e.clientY - state.startY;

    // Shift key locks to dominant axis
    if (e.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Lock to X axis
        deltaY = 0;
      } else {
        // Lock to Y axis
        deltaX = 0;
      }
    }

    const newX = state.currentX + deltaX;
    const newY = state.currentY + deltaY;

    setTransform(state.draggedElement, newX, newY);
  }

  function stopDrag() {
    state.isDragging = false;

    // Restore outline and cursor
    if (state.draggedElement) {
      state.draggedElement.classList.remove('element-mover-dragging');
      state.draggedElement = null;
    }
    document.body.classList.remove('element-mover-dragging-body');
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  function handleMouseDown(e) {
    if (!state.isActive) return;

    // Don't drag the indicator
    if (e.target.id === 'element-mover-indicator') {
      return;
    }

    // Start dragging the target element
    startDrag(e, e.target);

    e.preventDefault();
    e.stopPropagation();
  }

  function handleMouseMove(e) {
    if (state.isDragging) {
      drag(e);
    }
  }

  function handleMouseUp() {
    if (state.isDragging) {
      stopDrag();
    }
  }

  function handleKeydown(e) {
    // Ctrl+Shift+E to toggle
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleMode();
    }

    // Escape to deactivate
    if (e.key === 'Escape' && state.isActive) {
      deactivate();
    }
  }

  // ============================================================================
  // MODE CONTROL
  // ============================================================================

  function activate() {
    state.isActive = true;
    showIndicator();

    // Add hoverable class to all elements
    document.querySelectorAll('body *').forEach(el => {
      if (el.id !== 'element-mover-indicator') {
        el.classList.add('element-mover-hoverable');
      }
    });
  }

  function deactivate() {
    state.isActive = false;
    hideIndicator();

    // Remove hoverable class from all elements
    document.querySelectorAll('.element-mover-hoverable').forEach(el => {
      el.classList.remove('element-mover-hoverable');
    });
  }

  function toggleMode() {
    if (state.isActive) {
      deactivate();
    } else {
      activate();
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    createUI();

    // Global event listeners
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeydown);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
