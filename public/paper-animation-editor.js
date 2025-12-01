// Paper Animation Editor - Reusable animation editor component
// Can be triggered from DevTools to edit any animation in memory
(function () {
  const numSlices = 10;
  const numLines = numSlices + 1;
  const totalKeyframes = 60;

  let isOpen = false;
  let currentAnimationIndex = null; // Which animation we're editing
  let targetPaperElement = null; // The paper element we're editing (for overlay positioning)
  let targetAnimator = null; // The animator instance we're editing

  // Editor state
  let timePerKeyframe = 0.1;
  let playbackFPS = 30;
  let leftCurvePoints = [];
  let rightCurvePoints = [];
  let slicePoints = [];
  let overlayOffsetX = 0;
  let overlayOffsetY = 0;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // Shadow/shape state
  let shapeLeftCurvePoints = [];
  let shapeRightCurvePoints = [];
  let shapeGeneratedPoints = [];
  let shapePointColors = [];
  let selectedShapePoint = null;
  let shadowBlurEnabled = false;
  let shadowBlurAmount = 5;

  // Animation state
  let keyframes = Array(totalKeyframes).fill(null);
  let scaleKeyframes = Array(totalKeyframes).fill(null);
  let shadowKeyframes = Array(totalKeyframes).fill(null);
  let currentKeyframe = 0;
  let currentScaleKeyframe = 0;
  let currentShadowKeyframe = 0;
  let currentPlaybackFrame = 0;
  let isPlaying = false;
  let animationInterval = null;
  let paperPlayerMode = false;
  let shadowPlayerMode = false;
  let loopAnimation = true;

  // UI elements
  let editorContainer = null;
  let timelineContainer = null;
  let playButton = null;
  let overlay = null;
  let shapeOverlay = null;
  let dragging = null;
  let updateScheduled = false;

  // Callbacks
  let onCloseCallback = null;
  let onAnimationChangeCallback = null;

  // Scroll handler reference (for cleanup)
  let scrollHandler = null;

  // Original paper wrapper (hidden while editing) and editor-controlled paper
  let originalPaperWrapper = null;
  let editorPaperElement = null;

  // Initialize control points with defaults
  function initializeControlPoints() {
    leftCurvePoints = [
      { x: 0, y: 0, element: null },
      { x: 0, y: 100, element: null },
      { x: 0, y: 200, element: null },
      { x: 0, y: 300, element: null },
    ];

    rightCurvePoints = [
      { x: 250, y: 0, element: null },
      { x: 250, y: 100, element: null },
      { x: 250, y: 200, element: null },
      { x: 250, y: 300, element: null },
    ];

    // Shadow coordinates use SAME baseline as paper: 0-250 x 0-300
    // This makes shadows and paper share the exact same origin and coordinate system
    shapeLeftCurvePoints = [
      { x: 0, y: 0, element: null },
      { x: 0, y: 100, element: null },
      { x: 0, y: 200, element: null },
      { x: 0, y: 300, element: null },
    ];

    shapeRightCurvePoints = [
      { x: 250, y: 0, element: null },
      { x: 250, y: 100, element: null },
      { x: 250, y: 200, element: null },
      { x: 250, y: 300, element: null },
    ];

    shapePointColors = [];
    for (let i = 0; i < 9; i++) {
      shapePointColors[i] = null;
    }
  }

  // Store instance config for reference
  let instanceConfig = null;

  // Apply a keyframe to the editor paper (no animation, direct application)
  function applyKeyframeToEditorPaper(keyframeIndex) {
    if (!editorPaperElement) return;

    const keyframe = keyframes[keyframeIndex];
    if (!keyframe) return;

    // Apply the keyframe transforms to each slice
    for (let i = 0; i < numSlices; i++) {
      const slice = editorPaperElement.querySelector(`.paper-slice-${i}`);
      if (!slice) continue;

      // Get the slice data from keyframe
      const sliceData = keyframe.slices?.[i];
      if (sliceData) {
        slice.style.transform = `
          translateX(${sliceData.translateX || 0}px)
          translateY(${sliceData.translateY || 0}px)
          rotateX(${sliceData.rotateX || 0}deg)
          rotateY(${sliceData.rotateY || 0}deg)
          rotateZ(${sliceData.rotateZ || 0}deg)
        `;
      }
    }
  }

  // Open the editor for an existing animation
  function open(animationIndex, paperElement, animator, options = {}) {
    if (isOpen) {
      close();
    }

    // Reset dragging state to prevent carrying over drag state from play mode
    dragging = null;

    currentAnimationIndex = animationIndex;
    targetPaperElement = paperElement;
    targetAnimator = animator;
    onCloseCallback = options.onClose;
    onAnimationChangeCallback = options.onAnimationChange;

    // Store the original wrapper (don't hide it - we'll overlay on top)
    originalPaperWrapper = paperElement.closest('.paper-component-wrapper');

    // Get the instance config from the animator (if available) or paper element attributes
    // Use animator values to get current offset after dragging
    instanceConfig = {
      offsetX: animator ? animator.offsetX : (parseFloat(paperElement.getAttribute('data-offset-x')) || 0),
      offsetY: animator ? animator.offsetY : (parseFloat(paperElement.getAttribute('data-offset-y')) || 0),
      rotation: animator ? animator.rotation : (parseFloat(paperElement.getAttribute('data-rotation')) || 0),
      scale: animator ? animator.globalScale : (parseFloat(paperElement.getAttribute('data-scale')) || 1),
    };

    // Pause the animator while editing (but don't unregister - keep the paper visible)
    if (targetAnimator) {
      targetAnimator.pause();
      // Hide the animator's shadow SVG while editing (we show our own editable shadow)
      if (targetAnimator.shadowSVG) {
        targetAnimator.shadowSVG.style.display = 'none';
      }
    }

    // Elevate the paper wrapper's z-index so it appears above the shadow editor SVG
    if (originalPaperWrapper) {
      originalPaperWrapper._originalZIndex = originalPaperWrapper.style.zIndex;
      originalPaperWrapper.style.zIndex = '9999';
      originalPaperWrapper.style.position = 'relative';
    }

    // Disable paper interactions (hover, drag) while editor is open
    if (window.PaperAnimator) {
      window.PaperAnimator.disableInteractions();
    }

    initializeControlPoints();

    // Load the animation data
    const animations = window.PaperAnimator?.getAnimations() || [];
    if (animationIndex >= 0 && animationIndex < animations.length) {
      loadAnimationData(animations[animationIndex]);
    }

    createEditorUI();
    createOverlays();
    isOpen = true;

    // Add scroll listener to update overlay position
    scrollHandler = () => updateOverlayPosition();
    window.addEventListener('scroll', scrollHandler, true);

    // Find the last keyframe and select it
    let lastKeyframeIndex = 0;
    for (let i = keyframes.length - 1; i >= 0; i--) {
      if (keyframes[i]) {
        lastKeyframeIndex = i;
        break;
      }
    }
    currentKeyframe = lastKeyframeIndex;
    loadKeyframe(lastKeyframeIndex);

    // Same for shadow keyframes
    let lastShadowKeyframeIndex = 0;
    for (let i = shadowKeyframes.length - 1; i >= 0; i--) {
      if (shadowKeyframes[i]) {
        lastShadowKeyframeIndex = i;
        break;
      }
    }
    currentShadowKeyframe = lastShadowKeyframeIndex;
    if (shadowKeyframes[lastShadowKeyframeIndex]) {
      loadShadowKeyframe(lastShadowKeyframeIndex);
    }

    updateTimelineUI();
  }

  // Open the editor for creating a new animation
  function openNew(options = {}) {
    if (isOpen) {
      close();
    }

    // Reset dragging state to prevent carrying over drag state from play mode
    dragging = null;

    currentAnimationIndex = -1; // -1 means new animation
    targetPaperElement = null;
    targetAnimator = null;
    onCloseCallback = options.onClose;
    onAnimationChangeCallback = options.onAnimationChange;

    // Disable paper interactions (hover, drag) while editor is open
    if (window.PaperAnimator) {
      window.PaperAnimator.disableInteractions();
    }

    initializeControlPoints();

    // Reset to defaults
    keyframes = Array(totalKeyframes).fill(null);
    scaleKeyframes = Array(totalKeyframes).fill(null);
    shadowKeyframes = Array(totalKeyframes).fill(null);
    timePerKeyframe = 0.08;
    playbackFPS = 30;
    offsetX = 0;
    offsetY = 0;
    scale = 1;

    createEditorUI();
    createNewAnimationPreview();
    createOverlays();
    isOpen = true;

    updateTimelineUI();
  }

  function close() {
    if (!isOpen) return;

    stopAnimation();

    // Note: close() does NOT save changes - use saveAndClose() to save

    // Remove UI elements
    if (editorContainer) {
      editorContainer.remove();
      editorContainer = null;
    }
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (shapeOverlay) {
      shapeOverlay.remove();
      shapeOverlay = null;
    }

    // Remove shape SVG
    const shapeSvg = document.getElementById('animation-editor-shape-svg');
    if (shapeSvg) shapeSvg.remove();

    // Remove preview paper if it exists
    const previewContainer = document.getElementById('animation-editor-preview');
    if (previewContainer) previewContainer.remove();

    // Clean up state
    editorPaperElement = null;
    instanceConfig = null;

    // Remove event listeners
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('keydown', handleKeyDown);
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
      scrollHandler = null;
    }

    // Restore the paper wrapper's original z-index
    if (originalPaperWrapper) {
      originalPaperWrapper.style.zIndex = originalPaperWrapper._originalZIndex || '';
      delete originalPaperWrapper._originalZIndex;
    }

    // Re-enable paper interactions
    if (window.PaperAnimator) {
      window.PaperAnimator.enableInteractions();
    }

    // Capture references before clearing state
    const animatorToResume = targetAnimator;
    const closeCallback = onCloseCallback;

    isOpen = false;
    currentAnimationIndex = null;
    targetPaperElement = null;
    targetAnimator = null;
    onCloseCallback = null;
    onAnimationChangeCallback = null;
    originalPaperWrapper = null;

    // Restart the animator from the beginning - ensures it picks up any animation changes
    if (animatorToResume) {
      // Restore the animator's shadow SVG visibility
      if (animatorToResume.shadowSVG) {
        animatorToResume.shadowSVG.style.display = '';
      }
      animatorToResume.start();
    }

    if (closeCallback) {
      closeCallback();
    }
  }

  function saveAndClose() {
    if (!isOpen) return;

    // Save changes to global state before closing
    notifyAnimationChange();

    // Now close (which won't save again)
    close();
  }

  // Deep copy a keyframe object
  function deepCopyKeyframe(keyframe) {
    if (!keyframe) return null;
    return JSON.parse(JSON.stringify(keyframe));
  }

  function loadAnimationData(animationData) {
    if (!animationData) return;

    // Load settings
    if (animationData.timePerKeyframe !== undefined) {
      timePerKeyframe = animationData.timePerKeyframe;
    }
    if (animationData.playbackFPS !== undefined) {
      playbackFPS = animationData.playbackFPS;
    }
    if (animationData.offsetX !== undefined) {
      offsetX = animationData.offsetX;
    }
    if (animationData.offsetY !== undefined) {
      offsetY = animationData.offsetY;
    }

    // Load keyframes - deep copy to avoid mutating global state
    if (animationData.keyframes) {
      keyframes = animationData.keyframes.map(deepCopyKeyframe);
      // Ensure array is proper length
      while (keyframes.length < totalKeyframes) {
        keyframes.push(null);
      }
    }

    if (animationData.scaleKeyframes) {
      scaleKeyframes = animationData.scaleKeyframes.map(deepCopyKeyframe);
      while (scaleKeyframes.length < totalKeyframes) {
        scaleKeyframes.push(null);
      }
    }

    if (animationData.shadowKeyframes) {
      shadowKeyframes = animationData.shadowKeyframes.map(deepCopyKeyframe);
      while (shadowKeyframes.length < totalKeyframes) {
        shadowKeyframes.push(null);
      }
    }

    currentKeyframe = 0;
    currentScaleKeyframe = 0;
    currentShadowKeyframe = 0;
  }

  function createNewAnimationPreview() {
    // Create a centered preview paper element for new animations
    const previewContainer = document.createElement('div');
    previewContainer.id = 'animation-editor-preview';
    previewContainer.style.cssText = `
      position: fixed;
      top: 100px;
      left: 100px;
      z-index: 9998;
    `;

    // Generate paper HTML using PaperRenderer
    if (window.PaperRenderer && window.PaperRenderer.createPaperHTML) {
      const htmlContent = `
        <p style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">New Animation</p>
        <p style="font-size: 14px;">This is a preview paper for creating a new animation. Edit the bezier curves to shape the paper.</p>
      `;
      const paperHtml = window.PaperRenderer.createPaperHTML(htmlContent, 'text');
      previewContainer.innerHTML = paperHtml;

      const paperElement = previewContainer.querySelector('.paper-element');
      if (paperElement) {
        paperElement.style.visibility = 'visible';
        // Mark as editor-controlled to prevent mutation observer from animating it
        paperElement.setAttribute('data-editor-controlled', 'true');
        targetPaperElement = paperElement;
      }
    } else {
      console.error('[PaperAnimationEditor] PaperRenderer.createPaperHTML not available');
    }

    document.body.appendChild(previewContainer);
  }

  function createEditorUI() {
    editorContainer = document.createElement('div');
    editorContainer.id = 'animation-editor';
    editorContainer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-top: 2px solid #e5e7eb;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
    `;

    // Header with close button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #1f2937;
      color: white;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-weight: 600;
      font-size: 14px;
    `;
    title.textContent = currentAnimationIndex === -1
      ? 'Creating New Animation'
      : `Editing Animation ${currentAnimationIndex + 1}`;

    // Button container for close buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      padding: 8px 16px;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    closeButton.innerHTML = '✕ Discard';
    closeButton.onclick = close;

    const saveCloseButton = document.createElement('button');
    saveCloseButton.style.cssText = `
      padding: 8px 16px;
      background: #22c55e;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    saveCloseButton.innerHTML = '✓ Save & Close';
    saveCloseButton.onclick = saveAndClose;

    buttonContainer.appendChild(closeButton);
    buttonContainer.appendChild(saveCloseButton);

    header.appendChild(title);
    header.appendChild(buttonContainer);
    editorContainer.appendChild(header);

    // Main timeline container
    timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = `
      padding: 8px 16px;
      background: white;
    `;

    createTimelineControls();
    editorContainer.appendChild(timelineContainer);

    document.body.appendChild(editorContainer);

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);
  }

  function createTimelineControls() {
    // Collapsed controls row (always visible)
    const collapsedControls = document.createElement('div');
    collapsedControls.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 4px;
    `;

    // Expanded controls container
    const expandedContainer = document.createElement('div');
    expandedContainer.id = 'expanded-timeline';
    expandedContainer.style.cssText = `
      display: block;
    `;

    let isCollapsed = false;

    // Collapse button
    const collapseButton = document.createElement('button');
    collapseButton.textContent = '▼';
    collapseButton.style.cssText = `
      padding: 4px 8px;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 11px;
    `;
    collapseButton.onclick = () => {
      isCollapsed = !isCollapsed;
      expandedContainer.style.display = isCollapsed ? 'none' : 'block';
      collapseButton.textContent = isCollapsed ? '▲' : '▼';
    };

    // Play button
    playButton = document.createElement('button');
    playButton.textContent = '▶ Play';
    playButton.style.cssText = `
      padding: 4px 10px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    playButton.onclick = togglePlay;

    // Loop checkbox
    const loopCheckbox = document.createElement('input');
    loopCheckbox.type = 'checkbox';
    loopCheckbox.id = 'editor-loop-checkbox';
    loopCheckbox.checked = loopAnimation;
    loopCheckbox.style.cssText = `margin-left: 8px; cursor: pointer;`;
    loopCheckbox.onchange = (e) => {
      loopAnimation = e.target.checked;
    };

    const loopLabel = document.createElement('label');
    loopLabel.htmlFor = 'editor-loop-checkbox';
    loopLabel.textContent = 'Loop';
    loopLabel.style.cssText = `
      margin-left: 4px;
      font-size: 12px;
      color: #374151;
      cursor: pointer;
    `;

    // Frame display
    const frameDisplay = document.createElement('span');
    frameDisplay.id = 'editor-frame-display';
    frameDisplay.style.cssText = `
      font-weight: 500;
      color: #374151;
      font-size: 11px;
      margin-left: 8px;
    `;
    frameDisplay.textContent = `KF: 1/${totalKeyframes}`;

    collapsedControls.appendChild(collapseButton);
    collapsedControls.appendChild(playButton);
    collapsedControls.appendChild(loopCheckbox);
    collapsedControls.appendChild(loopLabel);
    collapsedControls.appendChild(frameDisplay);

    // View controls row
    const viewControls = document.createElement('div');
    viewControls.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
      align-items: center;
    `;

    // Paper player mode toggle
    const paperPlayerModeBtn = document.createElement('button');
    paperPlayerModeBtn.textContent = 'Paper: Edit';
    paperPlayerModeBtn.style.cssText = `
      padding: 4px 10px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    paperPlayerModeBtn.onclick = () => {
      paperPlayerMode = !paperPlayerMode;
      togglePaperPlayerMode();
      paperPlayerModeBtn.textContent = paperPlayerMode ? 'Paper: View' : 'Paper: Edit';
      paperPlayerModeBtn.style.background = paperPlayerMode ? '#10b981' : '#8b5cf6';
    };

    // Shadow player mode toggle
    const shadowPlayerModeBtn = document.createElement('button');
    shadowPlayerModeBtn.textContent = 'Shadow: Edit';
    shadowPlayerModeBtn.style.cssText = `
      padding: 4px 10px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    shadowPlayerModeBtn.onclick = () => {
      shadowPlayerMode = !shadowPlayerMode;
      toggleShadowPlayerMode();
      shadowPlayerModeBtn.textContent = shadowPlayerMode ? 'Shadow: View' : 'Shadow: Edit';
      shadowPlayerModeBtn.style.background = shadowPlayerMode ? '#10b981' : '#8b5cf6';
    };

    // Shadow blur toggle
    const shadowBlurBtn = document.createElement('button');
    shadowBlurBtn.textContent = 'Blur: Off';
    shadowBlurBtn.style.cssText = `
      padding: 4px 10px;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    shadowBlurBtn.onclick = () => {
      shadowBlurEnabled = !shadowBlurEnabled;
      shadowBlurBtn.textContent = shadowBlurEnabled ? 'Blur: On' : 'Blur: Off';
      shadowBlurBtn.style.background = shadowBlurEnabled ? '#10b981' : '#6b7280';
      drawSVGShape();
    };

    // Blur amount slider
    const blurAmountLabel = document.createElement('label');
    blurAmountLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    blurAmountLabel.innerHTML = `
      Blur:
      <input type="range" id="editor-shadow-blur-amount" value="${shadowBlurAmount}" min="0" max="20" step="0.5"
        style="width: 60px; cursor: pointer;">
      <span id="editor-blur-amount-value" style="min-width: 30px;">${shadowBlurAmount}px</span>
    `;

    const blurSlider = blurAmountLabel.querySelector('#editor-shadow-blur-amount');
    const blurValue = blurAmountLabel.querySelector('#editor-blur-amount-value');
    blurSlider.addEventListener('input', (e) => {
      shadowBlurAmount = parseFloat(e.target.value);
      blurValue.textContent = `${shadowBlurAmount}px`;
      drawSVGShape();
    });

    // Transparency toggle
    let isTransparent = false;
    const transparencyBtn = document.createElement('button');
    transparencyBtn.textContent = 'Opaque';
    transparencyBtn.style.cssText = `
      padding: 4px 10px;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    transparencyBtn.onclick = () => {
      isTransparent = !isTransparent;
      togglePaperTransparency(isTransparent);
      transparencyBtn.textContent = isTransparent ? 'Transparent' : 'Opaque';
      transparencyBtn.style.background = isTransparent ? '#ef4444' : '#6b7280';
    };

    viewControls.appendChild(paperPlayerModeBtn);
    viewControls.appendChild(shadowPlayerModeBtn);
    viewControls.appendChild(shadowBlurBtn);
    viewControls.appendChild(blurAmountLabel);
    viewControls.appendChild(transparencyBtn);

    // Main editing controls row
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
      align-items: center;
      flex-wrap: wrap;
    `;

    // Save keyframe button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
      padding: 4px 10px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    saveButton.onclick = saveCurrentKeyframe;

    // Clear keyframe button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear';
    clearButton.style.cssText = `
      padding: 4px 10px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    clearButton.onclick = clearCurrentKeyframe;

    // Straighten button
    const straightenButton = document.createElement('button');
    straightenButton.textContent = 'Straighten';
    straightenButton.style.cssText = `
      padding: 4px 10px;
      background: #f59e0b;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    straightenButton.onclick = straightenAndMarkKeyframe;

    // Export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export';
    exportButton.style.cssText = `
      padding: 4px 10px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    exportButton.onclick = exportAnimation;

    // Import button
    const importButton = document.createElement('button');
    importButton.textContent = 'Import';
    importButton.style.cssText = `
      padding: 4px 10px;
      background: #06b6d4;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;

    const importFileInput = document.createElement('input');
    importFileInput.type = 'file';
    importFileInput.accept = '.json';
    importFileInput.style.display = 'none';
    importFileInput.onchange = importAnimation;
    importButton.onclick = () => importFileInput.click();

    // Color picker
    const colorPickerLabel = document.createElement('label');
    colorPickerLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    colorPickerLabel.innerHTML = `
      Color:
      <input type="color" id="editor-shape-point-color-picker" value="#ffffff"
        style="width: 40px; height: 24px; border: 1px solid #d1d5db; border-radius: 3px; cursor: pointer;">
    `;
    const colorPicker = colorPickerLabel.querySelector('#editor-shape-point-color-picker');
    colorPicker.addEventListener('input', (e) => {
      const alpha = parseFloat(document.getElementById('editor-shape-point-alpha-picker')?.value || 1);
      setShapePointColor(e.target.value, alpha);
    });

    // Opacity slider
    const opacityLabel = document.createElement('label');
    opacityLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    opacityLabel.innerHTML = `
      Opacity:
      <input type="range" id="editor-shape-point-alpha-picker" value="1" min="0" max="1" step="0.01"
        style="width: 60px; cursor: pointer;">
      <span id="editor-opacity-value" style="min-width: 30px;">100%</span>
    `;
    const alphaPicker = opacityLabel.querySelector('#editor-shape-point-alpha-picker');
    const opacityValue = opacityLabel.querySelector('#editor-opacity-value');
    alphaPicker.addEventListener('input', (e) => {
      const alpha = parseFloat(e.target.value);
      opacityValue.textContent = `${Math.round(alpha * 100)}%`;
      const color = document.getElementById('editor-shape-point-color-picker')?.value || '#ffffff';
      setShapePointColor(color, alpha);
    });

    // Time per keyframe input
    const timePerKeyframeLabel = document.createElement('label');
    timePerKeyframeLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    timePerKeyframeLabel.innerHTML = `
      Time/KF:
      <input type="number" id="editor-time-per-keyframe" value="${timePerKeyframe}" min="0.01" max="10" step="0.01"
        style="width: 50px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const timePerKeyframeInput = timePerKeyframeLabel.querySelector('#editor-time-per-keyframe');
    timePerKeyframeInput.addEventListener('change', (e) => {
      timePerKeyframe = parseFloat(e.target.value);
      updateTimelineUI();
    });

    // Playback FPS input
    const playbackFPSLabel = document.createElement('label');
    playbackFPSLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    playbackFPSLabel.innerHTML = `
      FPS:
      <input type="number" id="editor-playback-fps" value="${playbackFPS}" min="1" max="120" step="1"
        style="width: 45px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const playbackFPSInput = playbackFPSLabel.querySelector('#editor-playback-fps');
    playbackFPSInput.addEventListener('change', (e) => {
      playbackFPS = parseFloat(e.target.value);
      if (isPlaying) {
        stopAnimation();
        startAnimation();
      }
    });

    // Scale input
    const scaleLabel = document.createElement('label');
    scaleLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    scaleLabel.innerHTML = `
      Scale:
      <input type="number" id="editor-scale-input" value="${scale}" min="0.1" max="5" step="0.1"
        style="width: 45px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const scaleInput = scaleLabel.querySelector('#editor-scale-input');
    scaleInput.addEventListener('change', (e) => {
      scale = parseFloat(e.target.value);
      calculateSlicePoints();
      updateAllTransforms();
    });

    // Time display
    const timeDisplay = document.createElement('span');
    timeDisplay.id = 'editor-time-display';
    timeDisplay.style.cssText = `
      margin-left: auto;
      font-weight: 500;
      color: #374151;
      font-family: monospace;
      font-size: 11px;
    `;
    timeDisplay.textContent = `Time: 0.00s / 0.00s`;

    controls.appendChild(saveButton);
    controls.appendChild(clearButton);
    controls.appendChild(straightenButton);
    controls.appendChild(exportButton);
    controls.appendChild(importButton);
    controls.appendChild(importFileInput);
    controls.appendChild(colorPickerLabel);
    controls.appendChild(opacityLabel);
    controls.appendChild(timePerKeyframeLabel);
    controls.appendChild(playbackFPSLabel);
    controls.appendChild(scaleLabel);
    controls.appendChild(timeDisplay);

    expandedContainer.appendChild(viewControls);
    expandedContainer.appendChild(controls);

    // Timeline track
    const timeline = document.createElement('div');
    timeline.style.cssText = `
      display: flex;
      gap: 1px;
      background: #e5e7eb;
      padding: 3px;
      border-radius: 3px;
    `;

    for (let i = 0; i < totalKeyframes; i++) {
      const slotContainer = document.createElement('div');
      slotContainer.style.cssText = `
        position: relative;
        width: 10px;
        height: 24px;
        cursor: pointer;
      `;

      const slot = document.createElement('div');
      slot.dataset.frame = i;
      slot.style.cssText = `
        width: 100%;
        height: 100%;
        background: #9ca3af;
        border-radius: 2px;
        transition: all 0.1s;
      `;

      const markers = document.createElement('div');
      markers.className = 'keyframe-markers';
      markers.style.cssText = `
        position: absolute;
        top: 2px;
        left: 2px;
        right: 2px;
        bottom: 2px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        pointer-events: none;
      `;

      const posMarker = document.createElement('div');
      posMarker.className = 'marker-position';
      posMarker.style.cssText = `
        flex: 1;
        background: #ef4444;
        border-radius: 1px;
        opacity: 0;
        transition: opacity 0.1s;
      `;

      const scaleMarker = document.createElement('div');
      scaleMarker.className = 'marker-scale';
      scaleMarker.style.cssText = `
        flex: 1;
        background: #8b5cf6;
        border-radius: 1px;
        opacity: 0;
        transition: opacity 0.1s;
      `;

      const shadowMarker = document.createElement('div');
      shadowMarker.className = 'marker-shadow';
      shadowMarker.style.cssText = `
        flex: 1;
        background: #10b981;
        border-radius: 1px;
        opacity: 0;
        transition: opacity 0.1s;
      `;

      markers.appendChild(posMarker);
      markers.appendChild(scaleMarker);
      markers.appendChild(shadowMarker);

      slotContainer.appendChild(slot);
      slotContainer.appendChild(markers);
      slotContainer.onclick = () => selectUnifiedKeyframe(i);
      timeline.appendChild(slotContainer);
    }

    expandedContainer.appendChild(timeline);

    // Keyframe controls for each type
    const keyframeControlsLabel = document.createElement('div');
    keyframeControlsLabel.style.cssText = `
      margin-top: 8px;
      margin-bottom: 3px;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    `;
    keyframeControlsLabel.textContent = 'Keyframe Controls';
    expandedContainer.appendChild(keyframeControlsLabel);

    const keyframeControls = document.createElement('div');
    keyframeControls.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      align-items: center;
      flex-wrap: wrap;
    `;

    // Position controls
    const positionGroup = createKeyframeControlGroup('Position:', '#ef4444', 'rgba(239, 68, 68, 0.1)',
      saveCurrentKeyframe, clearCurrentKeyframe);

    // Scale controls
    const scaleGroup = createKeyframeControlGroup('Scale:', '#8b5cf6', 'rgba(139, 92, 246, 0.1)',
      saveCurrentScaleKeyframe, clearCurrentScaleKeyframe);

    // Shadow controls
    const shadowGroup = createKeyframeControlGroup('Shadow:', '#10b981', 'rgba(16, 185, 129, 0.1)',
      saveCurrentShadowKeyframe, clearCurrentShadowKeyframe);

    keyframeControls.appendChild(positionGroup);
    keyframeControls.appendChild(scaleGroup);
    keyframeControls.appendChild(shadowGroup);

    expandedContainer.appendChild(keyframeControls);

    timelineContainer.appendChild(collapsedControls);
    timelineContainer.appendChild(expandedContainer);
  }

  function createKeyframeControlGroup(label, color, bgColor, onSave, onClear) {
    const group = document.createElement('div');
    group.style.cssText = `
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 4px 8px;
      background: ${bgColor};
      border-radius: 4px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 11px;
      color: ${color};
      font-weight: 500;
    `;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = `
      padding: 3px 8px;
      background: ${color};
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    saveBtn.onclick = onSave;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = `
      padding: 3px 8px;
      background: ${color};
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      opacity: 0.8;
    `;
    clearBtn.onclick = onClear;

    group.appendChild(labelEl);
    group.appendChild(saveBtn);
    group.appendChild(clearBtn);

    return group;
  }

  function createOverlays() {
    if (!targetPaperElement) return;

    // Get the paper element's bounding box
    // Even if visibility:hidden, getBoundingClientRect still returns the correct position
    const paperRect = targetPaperElement.getBoundingClientRect();

    const basePaperWidth = 250;
    const basePaperHeight = 300;

    // Use base paper dimensions - the animation data is in raw coordinate space
    const width = basePaperWidth;
    const height = basePaperHeight;

    // If paperRect has no size (visibility issue), fall back to wrapper + offset
    let top = paperRect.top;
    let left = paperRect.left;

    if (paperRect.width === 0 || paperRect.height === 0) {
      const wrapper = targetPaperElement.closest('.paper-component-wrapper');
      const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : { top: 0, left: 0 };
      const config = instanceConfig || { offsetX: 0, offsetY: 0 };
      top = wrapperRect.top + config.offsetY;
      left = wrapperRect.left + config.offsetX;
    }

    console.log('[PaperAnimationEditor] Creating overlay:', {
      paperRect: { top: paperRect.top, left: paperRect.left, width: paperRect.width, height: paperRect.height },
      computed: { top, left, width, height }
    });

    // Create overlay at paper position, with base paper dimensions
    overlay = document.createElement('div');
    overlay.id = 'animation-editor-overlay';
    overlay.style.cssText = `
      position: fixed;
      width: ${width}px;
      height: ${height}px;
      pointer-events: none;
      z-index: 10000;
      overflow: visible;
      top: ${top}px;
      left: ${left}px;
    `;

    // Store reference to paper element for position updates
    overlay._paperElement = targetPaperElement;

    // Create SVG for curves
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: absolute;
      top: -400px;
      left: -400px;
      width: 1000px;
      height: 1000px;
      pointer-events: none;
      overflow: visible;
    `;
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '1000');
    svg.setAttribute('viewBox', '-400 -400 1000 1000');
    svg.id = 'animation-editor-tool-svg';
    overlay.appendChild(svg);

    // Create control points
    leftCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'left', index);
      overlay.appendChild(dot);
    });

    rightCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'right', index);
      overlay.appendChild(dot);
    });

    document.body.appendChild(overlay);

    // Get paper dimensions - shadow uses same dimensions as paper
    const paperWidth = targetAnimator ? targetAnimator.paperWidth : 250;
    const paperHeight = targetAnimator ? targetAnimator.paperHeight : 300;

    // Shadow overlay matches paper overlay size and will be positioned identically
    shapeOverlay = document.createElement('div');
    shapeOverlay.id = 'animation-editor-shape-overlay';

    // For new animations, add 100px offset to match preview container position
    const shapeTop = currentAnimationIndex === -1 ? top + 100 : top;
    const shapeLeft = currentAnimationIndex === -1 ? left + 100 : left;

    shapeOverlay.style.cssText = `
      position: fixed;
      width: ${paperWidth}px;
      height: ${paperHeight}px;
      pointer-events: none;
      z-index: 10002;
      overflow: visible;
      top: ${shapeTop}px;
      left: ${shapeLeft}px;
    `;

    // Create shape SVG using shared renderer - same setup as animator
    const shapeSvg = window.ShadowRenderer.createShadowSVG(
      targetPaperElement,
      paperWidth,
      paperHeight
    );
    shapeSvg.id = 'animation-editor-shape-svg';
    // Keep z-index: -1 from createShadowSVG so shadow renders underneath paper
    // (no need to override it for editing)

    // Create shape control points
    shapeLeftCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'shape-left', index);
      shapeOverlay.appendChild(dot);
    });

    shapeRightCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'shape-right', index);
      shapeOverlay.appendChild(dot);
    });

    document.body.appendChild(shapeOverlay);

    // Initialize positions
    updateOverlayPosition(); // Position both overlays initially
    updateControlPointPositions();
    updateShapeControlPointPositions();
    calculateSlicePoints();
    drawCurves();
    drawShapeCurves();
    generateShapePoints();
    drawSVGShape();

    // Attach drag listeners
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);

    // Make paper slices draggable
    attachSliceDragListeners();
  }

  function createControlPoint(point, side, index) {
    const dot = document.createElement('div');
    let bgColor;
    if (side === 'left') bgColor = '#ef4444';
    else if (side === 'right') bgColor = '#3b82f6';
    else if (side === 'shape-left') bgColor = '#10b981';
    else if (side === 'shape-right') bgColor = '#f59e0b';

    dot.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      background: ${bgColor};
      border: 2px solid white;
      border-radius: 50%;
      cursor: move;
      pointer-events: all;
      z-index: 10001;
      transform: translate(-50%, -50%);
    `;
    dot.dataset.side = side;
    dot.dataset.index = index;
    dot.addEventListener('mousedown', startDrag);

    point.element = dot;
    return dot;
  }

  function attachSliceDragListeners() {
    if (!targetPaperElement) return;

    for (let i = 0; i < numSlices; i++) {
      const slice = targetPaperElement.querySelector(`.paper-slice-${i}`);
      if (slice) {
        slice.style.cursor = 'move';
        // Remove any CSS transitions so dragging is instant
        slice.style.transition = 'none';
        slice.addEventListener('mousedown', startWholeDrag);
      }
    }
  }

  function updateOverlayPosition() {
    if (!overlay || !targetPaperElement) return;

    const paperRect = targetPaperElement.getBoundingClientRect();

    let top = paperRect.top;
    let left = paperRect.left;

    if (paperRect.width === 0 || paperRect.height === 0) {
      const wrapper = targetPaperElement.closest('.paper-component-wrapper');
      const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : { top: 0, left: 0 };
      const config = instanceConfig || { offsetX: 0, offsetY: 0 };
      top = wrapperRect.top + config.offsetY;
      left = wrapperRect.left + config.offsetX;
    }

    // For new animations, add 100px offset to match preview container position
    const newAnimOffset = currentAnimationIndex === -1 ? 100 : 0;

    overlay.style.top = (top + overlayOffsetY + newAnimOffset) + 'px';
    overlay.style.left = (left + overlayOffsetX + newAnimOffset) + 'px';

    // Position shape overlay at the same location as paper overlay
    if (shapeOverlay) {
      shapeOverlay.style.top = (top + overlayOffsetY + newAnimOffset) + 'px';
      shapeOverlay.style.left = (left + overlayOffsetX + newAnimOffset) + 'px';
    }
  }

  function updateControlPointPositions() {
    // Control points are in raw coordinate space (0-250, 0-300)
    // The overlay is fixed at 250x300, so no scaling needed
    leftCurvePoints.forEach((point, i) => {
      if (point.element) {
        point.element.style.left = point.x + 'px';
        point.element.style.top = point.y + 'px';
      }
    });

    rightCurvePoints.forEach((point, i) => {
      if (point.element) {
        point.element.style.left = point.x + 'px';
        point.element.style.top = point.y + 'px';
      }
    });
  }

  function updateShapeControlPointPositions() {
    // Control points are in editor coordinate space - position them directly
    shapeLeftCurvePoints.forEach(point => {
      if (point.element) {
        point.element.style.left = point.x + 'px';
        point.element.style.top = point.y + 'px';
      }
    });

    shapeRightCurvePoints.forEach(point => {
      if (point.element) {
        point.element.style.left = point.x + 'px';
        point.element.style.top = point.y + 'px';
      }
    });
  }

  function drawCurves() {
    const svg = document.getElementById('animation-editor-tool-svg');
    if (!svg) return;

    const existing = svg.querySelectorAll('path, line, polygon');
    existing.forEach(el => el.remove());

    if (!paperPlayerMode) {
      drawControlHandles(svg, leftCurvePoints, '#ef4444');
      drawControlHandles(svg, rightCurvePoints, '#3b82f6');

      const leftPath = createBezierPath(leftCurvePoints, '#ef4444');
      svg.appendChild(leftPath);

      const rightPath = createBezierPath(rightCurvePoints, '#3b82f6');
      svg.appendChild(rightPath);
    }

    drawSliceOutlines(svg);
  }

  function drawShapeCurves() {
    const svg = document.getElementById('animation-editor-shape-svg');
    if (!svg) return;

    const existing = svg.querySelectorAll('path, line');
    existing.forEach(el => el.remove());

    if (!shadowPlayerMode) {
      drawControlHandles(svg, shapeLeftCurvePoints, '#10b981');
      drawControlHandles(svg, shapeRightCurvePoints, '#f59e0b');

      const shapeLeftPath = createBezierPath(shapeLeftCurvePoints, '#10b981');
      svg.appendChild(shapeLeftPath);

      const shapeRightPath = createBezierPath(shapeRightCurvePoints, '#f59e0b');
      svg.appendChild(shapeRightPath);
    }
  }

  function drawControlHandles(svg, points, color) {
    // No scaling - overlay is fixed at 250x300
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', points[0].x);
    line1.setAttribute('y1', points[0].y);
    line1.setAttribute('x2', points[1].x);
    line1.setAttribute('y2', points[1].y);
    line1.setAttribute('stroke', color);
    line1.setAttribute('stroke-width', '1');
    line1.setAttribute('stroke-dasharray', '4,4');
    line1.setAttribute('opacity', '0.4');
    line1.style.pointerEvents = 'none';
    svg.appendChild(line1);

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', points[2].x);
    line2.setAttribute('y1', points[2].y);
    line2.setAttribute('x2', points[3].x);
    line2.setAttribute('y2', points[3].y);
    line2.setAttribute('stroke', color);
    line2.setAttribute('stroke-width', '1');
    line2.setAttribute('stroke-dasharray', '4,4');
    line2.setAttribute('opacity', '0.4');
    line2.style.pointerEvents = 'none';
    svg.appendChild(line2);
  }

  function createBezierPath(points, color) {
    // Coordinates are in raw space (0-250, 0-300)
    // No scaling needed - overlay is fixed at 250x300
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${points[0].x},${points[0].y} C ${points[1].x},${points[1].y} ${points[2].x},${points[2].y} ${points[3].x},${points[3].y}`;

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('opacity', '0.6');
    path.style.pointerEvents = 'none';

    return path;
  }

  function drawSliceOutlines(svg) {
    // No scaling - overlay is fixed at 250x300
    for (let i = 0; i < numSlices; i++) {
      const corners = getSliceCorners(i);

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('fill', 'none');
      polygon.setAttribute('stroke', 'rgba(100, 100, 100, 0.2)');
      polygon.setAttribute('stroke-width', '1');
      polygon.style.pointerEvents = 'none';

      const points = `${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`;
      polygon.setAttribute('points', points);

      svg.appendChild(polygon);
    }
  }

  function generateShapePoints() {
    if (!window.ShadowRenderer) return;

    // Shadow control points are stored in editor coordinate space
    // They will be scaled by the animator when the animation is played
    // For editing, we render them directly without transformation
    shapeGeneratedPoints = window.ShadowRenderer.generateShapePoints(
      shapeLeftCurvePoints,
      shapeRightCurvePoints,
      10
    );
  }

  function getInterpolatedColor(index) {
    if (window.ShadowRenderer) {
      return window.ShadowRenderer.getInterpolatedColor(index, shapePointColors);
    }
    return '#ffffff';
  }

  function drawSVGShape() {
    const svg = document.getElementById('animation-editor-shape-svg');
    if (!svg || !window.ShadowRenderer) return;

    window.ShadowRenderer.drawSVGShape(
      svg,
      shapeGeneratedPoints,
      shapePointColors,
      shadowBlurEnabled,
      shadowBlurAmount
    );

    const polygon = svg.querySelector('.shape-slice');
    if (polygon) {
      polygon.style.cursor = 'move';
      console.log('jwl adding l;istenr')
      polygon.addEventListener('mousedown', startShadowWholeDrag, true);
    }

    drawShapePointMarkers();
  }

  function drawShapePointMarkers() {
    if (!shapeOverlay) return;

    const existingMarkers = shapeOverlay.querySelectorAll('.shape-point-marker');
    existingMarkers.forEach(marker => marker.remove());

    const numPointsPerCurve = 10;
    const leftPoints = shapeGeneratedPoints.slice(0, numPointsPerCurve);
    const rightPoints = shapeGeneratedPoints.slice(numPointsPerCurve, numPointsPerCurve * 2).reverse();

    const markerDisplay = shadowPlayerMode ? 'none' : 'block';

    for (let i = 0; i < numPointsPerCurve; i++) {
      const leftPoint = leftPoints[i];
      const rightPoint = rightPoints[i];

      const sliceIndex = Math.min(i, 8);
      const isSelected = selectedShapePoint === i;
      const fillColor = getInterpolatedColor(sliceIndex);

      // Left marker
      const leftMarker = document.createElement('div');
      leftMarker.style.cssText = `
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${fillColor};
        border: ${isSelected ? '3px' : '2px'} solid ${isSelected ? '#000' : '#666'};
        cursor: pointer;
        pointer-events: all;
        z-index: 10000;
        transform: translate(-50%, -50%);
        left: ${leftPoint.x}px;
        top: ${leftPoint.y}px;
        display: ${markerDisplay};
      `;
      leftMarker.className = 'shape-point-marker';
      leftMarker.dataset.sliceIndex = i;
      leftMarker.addEventListener('click', (e) => {
        e.stopPropagation();
        selectShapePoint(i);
      });
      shapeOverlay.appendChild(leftMarker);

      // Right marker
      const rightMarker = document.createElement('div');
      rightMarker.style.cssText = `
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${fillColor};
        border: ${isSelected ? '3px' : '2px'} solid ${isSelected ? '#000' : '#666'};
        cursor: pointer;
        pointer-events: all;
        z-index: 10000;
        transform: translate(-50%, -50%);
        left: ${rightPoint.x}px;
        top: ${rightPoint.y}px;
        display: ${markerDisplay};
      `;
      rightMarker.className = 'shape-point-marker';
      rightMarker.dataset.sliceIndex = i;
      rightMarker.addEventListener('click', (e) => {
        e.stopPropagation();
        selectShapePoint(i);
      });
      shapeOverlay.appendChild(rightMarker);
    }
  }

  function selectShapePoint(index) {
    selectedShapePoint = index;
    drawShapePointMarkers();
    updateColorPicker();
  }

  function updateColorPicker() {
    const colorInput = document.getElementById('editor-shape-point-color-picker');
    const alphaInput = document.getElementById('editor-shape-point-alpha-picker');
    const opacityValue = document.getElementById('editor-opacity-value');

    if (colorInput && selectedShapePoint !== null) {
      const sliceIndex = Math.min(selectedShapePoint, 8);
      const color = getInterpolatedColor(sliceIndex);
      const parsed = parseColor(color);

      const hexColor = `#${parsed.r.toString(16).padStart(2, '0')}${parsed.g.toString(16).padStart(2, '0')}${parsed.b.toString(16).padStart(2, '0')}`;
      colorInput.value = hexColor;

      if (alphaInput) {
        alphaInput.value = parsed.a;
      }
      if (opacityValue) {
        opacityValue.textContent = `${Math.round(parsed.a * 100)}%`;
      }
    }
  }

  function parseColor(colorStr) {
    if (!colorStr) return { r: 255, g: 255, b: 255, a: 1 };

    if (colorStr.startsWith('rgba')) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] ? parseFloat(match[4]) : 1
        };
      }
    }

    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }

    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function setShapePointColor(hexColor, alpha = 1) {
    if (selectedShapePoint !== null) {
      const sliceIndex = Math.min(selectedShapePoint, 8);
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      shapePointColors[sliceIndex] = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      drawSVGShape();
    }
  }

  function calculateSlicePoints() {
    slicePoints = [];

    const allPoints = [...leftCurvePoints, ...rightCurvePoints];
    const centerX = allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
    const centerY = allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;

    const scaledLeftPoints = leftCurvePoints.map(p => ({
      x: centerX + (p.x - centerX) * scale,
      y: centerY + (p.y - centerY) * scale,
    }));

    const scaledRightPoints = rightCurvePoints.map(p => ({
      x: centerX + (p.x - centerX) * scale,
      y: centerY + (p.y - centerY) * scale,
    }));

    for (let i = 0; i < numLines; i++) {
      const t = i / numSlices;

      const leftX = cubicBezier(
        scaledLeftPoints[0].x, scaledLeftPoints[1].x,
        scaledLeftPoints[2].x, scaledLeftPoints[3].x, t
      );
      const leftY = cubicBezier(
        scaledLeftPoints[0].y, scaledLeftPoints[1].y,
        scaledLeftPoints[2].y, scaledLeftPoints[3].y, t
      );

      const rightX = cubicBezier(
        scaledRightPoints[0].x, scaledRightPoints[1].x,
        scaledRightPoints[2].x, scaledRightPoints[3].x, t
      );
      const rightY = cubicBezier(
        scaledRightPoints[0].y, scaledRightPoints[1].y,
        scaledRightPoints[2].y, scaledRightPoints[3].y, t
      );

      slicePoints.push({
        lineIndex: i,
        left: { x: leftX, y: leftY },
        right: { x: rightX, y: rightY },
      });
    }
  }

  function cubicBezier(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
  }

  function getSliceCorners(sliceIndex) {
    const topLine = slicePoints[sliceIndex];
    const bottomLine = slicePoints[sliceIndex + 1];
    return {
      tl: topLine.left,
      tr: topLine.right,
      bl: bottomLine.left,
      br: bottomLine.right,
    };
  }

  // Drag handling
  function startDrag(e) {
    if (isPlaying) return;

    const side = e.target.dataset.side;
    if ((side === 'left' || side === 'right') && paperPlayerMode) return;
    if ((side === 'shape-left' || side === 'shape-right') && shadowPlayerMode) return;

    e.preventDefault();
    dragging = {
      type: 'controlPoint',
      side: side,
      index: parseInt(e.target.dataset.index),
    };
  }

  function startWholeDrag(e) {
    if (isPlaying || paperPlayerMode) return;
    e.preventDefault();

    dragging = {
      type: 'wholeElement',
      startX: e.clientX,
      startY: e.clientY,
      initialLeftPoints: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      initialRightPoints: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
    };
  }

  function startShadowWholeDrag(e) {
    console.log(isPlaying, shadowPlayerMode)
    if (isPlaying || shadowPlayerMode) return;
    e.preventDefault();
    e.stopPropagation();

    dragging = {
      type: 'wholeShadow',
      startX: e.clientX,
      startY: e.clientY,
      initialLeftPoints: shapeLeftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      initialRightPoints: shapeRightCurvePoints.map(p => ({ x: p.x, y: p.y })),
    };
  }

  function onDrag(e) {
    if (!dragging) return;

    const currentDrag = { ...dragging };

    if (currentDrag.type === 'controlPoint') {
      const currentOverlay = (currentDrag.side === 'shape-left' || currentDrag.side === 'shape-right')
        ? shapeOverlay : overlay;

      if (!currentOverlay) return;

      const rect = currentOverlay.getBoundingClientRect();

      // Get pixel coordinates relative to overlay
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;

      let points;
      if (currentDrag.side === 'left') points = leftCurvePoints;
      else if (currentDrag.side === 'right') points = rightCurvePoints;
      else if (currentDrag.side === 'shape-left') points = shapeLeftCurvePoints;
      else if (currentDrag.side === 'shape-right') points = shapeRightCurvePoints;

      if (!points) return;

      // Both paper and shadow control points use their natural coordinate spaces
      points[currentDrag.index].x = pixelX;
      points[currentDrag.index].y = pixelY;

      if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
          if (currentDrag.side === 'left' || currentDrag.side === 'right') {
            updateControlPointPositions();
            calculateSlicePoints();
            drawCurves();
            updateAllTransforms();
          }

          if (currentDrag.side === 'shape-left' || currentDrag.side === 'shape-right') {
            updateShapeControlPointPositions();
            drawShapeCurves();
            generateShapePoints();
            drawSVGShape();
          }

          updateScheduled = false;
        });
      }
    } else if (currentDrag.type === 'wholeElement') {
      // Simple delta - overlay is fixed at 250x300
      const deltaX = e.clientX - currentDrag.startX;
      const deltaY = e.clientY - currentDrag.startY;

      leftCurvePoints.forEach((p, i) => {
        p.x = currentDrag.initialLeftPoints[i].x + deltaX;
        p.y = currentDrag.initialLeftPoints[i].y + deltaY;
      });

      rightCurvePoints.forEach((p, i) => {
        p.x = currentDrag.initialRightPoints[i].x + deltaX;
        p.y = currentDrag.initialRightPoints[i].y + deltaY;
      });

      if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
          updateControlPointPositions();
          calculateSlicePoints();
          drawCurves();
          updateAllTransforms();
          updateScheduled = false;
        });
      }
    } else if (currentDrag.type === 'wholeShadow') {
      const deltaX = e.clientX - currentDrag.startX;
      const deltaY = e.clientY - currentDrag.startY;

      shapeLeftCurvePoints.forEach((p, i) => {
        p.x = currentDrag.initialLeftPoints[i].x + deltaX;
        p.y = currentDrag.initialLeftPoints[i].y + deltaY;
      });

      shapeRightCurvePoints.forEach((p, i) => {
        p.x = currentDrag.initialRightPoints[i].x + deltaX;
        p.y = currentDrag.initialRightPoints[i].y + deltaY;
      });

      if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
          updateShapeControlPointPositions();
          drawShapeCurves();
          generateShapePoints();
          drawSVGShape();
          updateScheduled = false;
        });
      }
    }
  }

  function stopDrag() {
    dragging = null;
  }

  function updateAllTransforms() {
    if (!targetPaperElement) return;

    for (let i = 0; i < numSlices; i++) {
      updateSliceTransform(i);
    }
  }

  function updateSliceTransform(sliceIndex) {
    if (!targetPaperElement) return;

    const sliceElement = targetPaperElement.querySelector(`.paper-slice-${sliceIndex}`);
    if (!sliceElement) return;

    const corners = getSliceCorners(sliceIndex);

    const sliceHeight = 300 / numSlices;
    const startY = sliceIndex * sliceHeight;
    const src = [
      { x: 0, y: startY },
      { x: 250, y: startY },
      { x: 0, y: startY + sliceHeight },
      { x: 250, y: startY + sliceHeight },
    ];

    const dst = [
      { x: corners.tl.x + offsetX, y: corners.tl.y + offsetY },
      { x: corners.tr.x + offsetX, y: corners.tr.y + offsetY },
      { x: corners.bl.x + offsetX, y: corners.bl.y + offsetY },
      { x: corners.br.x + offsetX, y: corners.br.y + offsetY },
    ];

    const matrix = getPerspectiveTransform(src, dst);

    sliceElement.style.transform = `matrix3d(${matrix.join(',')})`;
    sliceElement.style.transformOrigin = '0 0';
  }

  function getPerspectiveTransform(src, dst) {
    const [s0, s1, s2, s3] = src;
    const [d0, d1, d2, d3] = dst;

    const A = [
      [s0.x, s0.y, 1, 0, 0, 0, -d0.x * s0.x, -d0.x * s0.y],
      [0, 0, 0, s0.x, s0.y, 1, -d0.y * s0.x, -d0.y * s0.y],
      [s1.x, s1.y, 1, 0, 0, 0, -d1.x * s1.x, -d1.x * s1.y],
      [0, 0, 0, s1.x, s1.y, 1, -d1.y * s1.x, -d1.y * s1.y],
      [s2.x, s2.y, 1, 0, 0, 0, -d2.x * s2.x, -d2.x * s2.y],
      [0, 0, 0, s2.x, s2.y, 1, -d2.y * s2.x, -d2.y * s2.y],
      [s3.x, s3.y, 1, 0, 0, 0, -d3.x * s3.x, -d3.x * s3.y],
      [0, 0, 0, s3.x, s3.y, 1, -d3.y * s3.x, -d3.y * s3.y],
    ];

    const b = [d0.x, d0.y, d1.x, d1.y, d2.x, d2.y, d3.x, d3.y];

    const h = gaussianElimination(A, b);
    h.push(1);

    return [
      h[0], h[3], 0, h[6],
      h[1], h[4], 0, h[7],
      0, 0, 1, 0,
      h[2], h[5], 0, h[8],
    ];
  }

  function gaussianElimination(A, b) {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i];
    }

    return x;
  }

  // Keyframe operations
  function saveCurrentKeyframe() {
    const existingKeyframe = keyframes[currentKeyframe];
    const newKeyframe = {
      leftCurve: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      overlayOffsetX: overlayOffsetX,
      overlayOffsetY: overlayOffsetY,
    };

    if (existingKeyframe && existingKeyframe.isRectangle) {
      newKeyframe.isRectangle = true;
    }

    keyframes[currentKeyframe] = newKeyframe;
    updateTimelineUI();
  }

  function clearCurrentKeyframe() {
    keyframes[currentKeyframe] = null;
    updateTimelineUI();
  }

  function saveCurrentScaleKeyframe() {
    scaleKeyframes[currentScaleKeyframe] = scale;
    updateTimelineUI();
  }

  function clearCurrentScaleKeyframe() {
    scaleKeyframes[currentScaleKeyframe] = null;
    updateTimelineUI();
  }

  function saveCurrentShadowKeyframe() {
    shadowKeyframes[currentShadowKeyframe] = {
      leftCurve: shapeLeftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: shapeRightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      colors: [...shapePointColors],
      blurEnabled: shadowBlurEnabled,
      blurAmount: shadowBlurAmount
    };
    updateTimelineUI();
  }

  function clearCurrentShadowKeyframe() {
    shadowKeyframes[currentShadowKeyframe] = null;
    updateTimelineUI();
  }

  function loadKeyframe(index) {
    const kf = keyframes[index];
    if (!kf) return;

    leftCurvePoints.forEach((p, i) => {
      p.x = kf.leftCurve[i].x;
      p.y = kf.leftCurve[i].y;
    });

    rightCurvePoints.forEach((p, i) => {
      p.x = kf.rightCurve[i].x;
      p.y = kf.rightCurve[i].y;
    });

    if (kf.overlayOffsetX !== undefined && kf.overlayOffsetY !== undefined) {
      overlayOffsetX = kf.overlayOffsetX;
      overlayOffsetY = kf.overlayOffsetY;
      updateOverlayPosition();
    }

    updateControlPointPositions();
    calculateSlicePoints();
    drawCurves();
    updateAllTransforms();
  }

  function loadShadowKeyframe(index) {
    const kf = shadowKeyframes[index];
    if (!kf) return;

    shapeLeftCurvePoints.forEach((p, i) => {
      p.x = kf.leftCurve[i].x;
      p.y = kf.leftCurve[i].y;
    });

    shapeRightCurvePoints.forEach((p, i) => {
      p.x = kf.rightCurve[i].x;
      p.y = kf.rightCurve[i].y;
    });

    if (kf.colors) {
      shapePointColors = [...kf.colors];
    }

    if (kf.blurEnabled !== undefined) {
      shadowBlurEnabled = kf.blurEnabled;
    }
    if (kf.blurAmount !== undefined) {
      shadowBlurAmount = kf.blurAmount;
      const blurSlider = document.getElementById('editor-shadow-blur-amount');
      const blurValue = document.getElementById('editor-blur-amount-value');
      if (blurSlider) blurSlider.value = shadowBlurAmount;
      if (blurValue) blurValue.textContent = `${shadowBlurAmount}px`;
    }

    updateShapeControlPointPositions();
    drawShapeCurves();
    generateShapePoints();
    drawSVGShape();
  }

  function straightenAndMarkKeyframe() {
    const topLeft = leftCurvePoints[0];
    const topRight = rightCurvePoints[0];
    const bottomLeft = leftCurvePoints[3];
    const bottomRight = rightCurvePoints[3];

    const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;
    const centerY = (topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4;

    const topWidth = Math.sqrt(
      Math.pow(topRight.x - topLeft.x, 2) + Math.pow(topRight.y - topLeft.y, 2)
    );
    const bottomWidth = Math.sqrt(
      Math.pow(bottomRight.x - bottomLeft.x, 2) + Math.pow(bottomRight.y - bottomLeft.y, 2)
    );
    const leftHeight = Math.sqrt(
      Math.pow(bottomLeft.x - topLeft.x, 2) + Math.pow(bottomLeft.y - topLeft.y, 2)
    );
    const rightHeight = Math.sqrt(
      Math.pow(bottomRight.x - topRight.x, 2) + Math.pow(bottomRight.y - topRight.y, 2)
    );

    const width = (topWidth + bottomWidth) / 2;
    const height = (leftHeight + rightHeight) / 2;

    const dx = topRight.x - topLeft.x;
    const dy = topRight.y - topLeft.y;
    const rotation = Math.atan2(dy, dx);

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: -halfWidth, y: halfHeight },
      { x: halfWidth, y: halfHeight },
    ];

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const rotatedCorners = corners.map(corner => ({
      x: corner.x * cos - corner.y * sin + centerX,
      y: corner.x * sin + corner.y * cos + centerY,
    }));

    leftCurvePoints[0].x = rotatedCorners[0].x;
    leftCurvePoints[0].y = rotatedCorners[0].y;
    rightCurvePoints[0].x = rotatedCorners[1].x;
    rightCurvePoints[0].y = rotatedCorners[1].y;
    leftCurvePoints[3].x = rotatedCorners[2].x;
    leftCurvePoints[3].y = rotatedCorners[2].y;
    rightCurvePoints[3].x = rotatedCorners[3].x;
    rightCurvePoints[3].y = rotatedCorners[3].y;

    leftCurvePoints[1].x = leftCurvePoints[0].x + (leftCurvePoints[3].x - leftCurvePoints[0].x) / 3;
    leftCurvePoints[1].y = leftCurvePoints[0].y + (leftCurvePoints[3].y - leftCurvePoints[0].y) / 3;
    leftCurvePoints[2].x = leftCurvePoints[0].x + (2 * (leftCurvePoints[3].x - leftCurvePoints[0].x)) / 3;
    leftCurvePoints[2].y = leftCurvePoints[0].y + (2 * (leftCurvePoints[3].y - leftCurvePoints[0].y)) / 3;

    rightCurvePoints[1].x = rightCurvePoints[0].x + (rightCurvePoints[3].x - rightCurvePoints[0].x) / 3;
    rightCurvePoints[1].y = rightCurvePoints[0].y + (rightCurvePoints[3].y - rightCurvePoints[0].y) / 3;
    rightCurvePoints[2].x = rightCurvePoints[0].x + (2 * (rightCurvePoints[3].x - rightCurvePoints[0].x)) / 3;
    rightCurvePoints[2].y = rightCurvePoints[0].y + (2 * (rightCurvePoints[3].y - rightCurvePoints[0].y)) / 3;

    calculateSlicePoints();
    updateAllTransforms();
    updateControlPointPositions();

    keyframes[currentKeyframe] = {
      leftCurve: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      overlayOffsetX: overlayOffsetX,
      overlayOffsetY: overlayOffsetY,
      isRectangle: true,
    };

    updateTimelineUI();
  }

  function selectUnifiedKeyframe(index) {
    if (isPlaying) return;

    currentKeyframe = index;
    currentScaleKeyframe = index;
    currentShadowKeyframe = index;

    applyInterpolatedFrame(index);

    const scaleInput = document.getElementById('editor-scale-input');
    if (scaleInput) scaleInput.value = scale;

    updateTimelineUI();
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function findNextKeyframe(startIndex) {
    for (let i = startIndex; i < totalKeyframes; i++) {
      if (keyframes[i]) return i;
    }
    for (let i = 0; i < startIndex; i++) {
      if (keyframes[i]) return i;
    }
    return null;
  }

  function findPreviousKeyframe(startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      if (keyframes[i]) return i;
    }
    for (let i = totalKeyframes - 1; i > startIndex; i--) {
      if (keyframes[i]) return i;
    }
    return null;
  }

  function findNextScaleKeyframe(startIndex) {
    for (let i = startIndex; i < totalKeyframes; i++) {
      if (scaleKeyframes[i] !== null) return i;
    }
    for (let i = 0; i < startIndex; i++) {
      if (scaleKeyframes[i] !== null) return i;
    }
    return null;
  }

  function findPreviousScaleKeyframe(startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      if (scaleKeyframes[i] !== null) return i;
    }
    for (let i = totalKeyframes - 1; i > startIndex; i--) {
      if (scaleKeyframes[i] !== null) return i;
    }
    return null;
  }

  function findNextShadowKeyframe(startIndex) {
    for (let i = startIndex; i < totalKeyframes; i++) {
      if (shadowKeyframes[i] !== null) return i;
    }
    for (let i = 0; i < startIndex; i++) {
      if (shadowKeyframes[i] !== null) return i;
    }
    return null;
  }

  function findPreviousShadowKeyframe(startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      if (shadowKeyframes[i] !== null) return i;
    }
    for (let i = totalKeyframes - 1; i > startIndex; i--) {
      if (shadowKeyframes[i] !== null) return i;
    }
    return null;
  }

  function applyInterpolatedFrame(keyframePosition) {
    let lastKeyframeIndex = -1;
    for (let i = totalKeyframes - 1; i >= 0; i--) {
      if (keyframes[i]) {
        lastKeyframeIndex = i;
        break;
      }
    }

    if (lastKeyframeIndex >= 0 && keyframePosition >= lastKeyframeIndex) {
      keyframePosition = lastKeyframeIndex;
    }

    const lowerIndex = Math.floor(keyframePosition);
    const upperIndex = Math.ceil(keyframePosition);

    let lowerKeyframeIndex = findPreviousKeyframe(lowerIndex);
    let upperKeyframeIndex = findNextKeyframe(upperIndex);

    if (lowerKeyframeIndex === null || upperKeyframeIndex === null) {
      return;
    }

    if (lastKeyframeIndex >= 0 && lowerKeyframeIndex >= lastKeyframeIndex) {
      upperKeyframeIndex = lastKeyframeIndex;
      lowerKeyframeIndex = lastKeyframeIndex;
    }

    const lowerKf = keyframes[lowerKeyframeIndex];
    const upperKf = keyframes[upperKeyframeIndex];

    let t;
    if (lowerKeyframeIndex === upperKeyframeIndex) {
      t = 0;
    } else {
      t = (keyframePosition - lowerKeyframeIndex) / (upperKeyframeIndex - lowerKeyframeIndex);
      t = Math.max(0, Math.min(1, t));
    }

    leftCurvePoints.forEach((p, i) => {
      p.x = lerp(lowerKf.leftCurve[i].x, upperKf.leftCurve[i].x, t);
      p.y = lerp(lowerKf.leftCurve[i].y, upperKf.leftCurve[i].y, t);
    });

    rightCurvePoints.forEach((p, i) => {
      p.x = lerp(lowerKf.rightCurve[i].x, upperKf.rightCurve[i].x, t);
      p.y = lerp(lowerKf.rightCurve[i].y, upperKf.rightCurve[i].y, t);
    });

    if (lowerKf.overlayOffsetX !== undefined && upperKf.overlayOffsetX !== undefined) {
      overlayOffsetX = lerp(lowerKf.overlayOffsetX, upperKf.overlayOffsetX, t);
      overlayOffsetY = lerp(lowerKf.overlayOffsetY, upperKf.overlayOffsetY, t);
      updateOverlayPosition();
    }

    // Interpolate scale
    let lowerScaleIndex = findPreviousScaleKeyframe(lowerIndex);
    let upperScaleIndex = findNextScaleKeyframe(upperIndex);

    let lastScaleKeyframeIndex = -1;
    for (let i = totalKeyframes - 1; i >= 0; i--) {
      if (scaleKeyframes[i] !== null) {
        lastScaleKeyframeIndex = i;
        break;
      }
    }

    if (lastScaleKeyframeIndex >= 0 && lowerScaleIndex >= lastScaleKeyframeIndex) {
      upperScaleIndex = lastScaleKeyframeIndex;
      lowerScaleIndex = lastScaleKeyframeIndex;
    }

    if (lowerScaleIndex !== null && upperScaleIndex !== null) {
      const lowerScale = scaleKeyframes[lowerScaleIndex];
      const upperScale = scaleKeyframes[upperScaleIndex];

      let scaleT;
      if (lowerScaleIndex === upperScaleIndex) {
        scaleT = 0;
      } else {
        scaleT = (keyframePosition - lowerScaleIndex) / (upperScaleIndex - lowerScaleIndex);
        scaleT = Math.max(0, Math.min(1, scaleT));
      }

      scale = lerp(lowerScale, upperScale, scaleT);
    }

    // Interpolate shadow
    let lowerShadowIndex = findPreviousShadowKeyframe(lowerIndex);
    let upperShadowIndex = findNextShadowKeyframe(upperIndex);

    let lastShadowKeyframeIndex = -1;
    for (let i = totalKeyframes - 1; i >= 0; i--) {
      if (shadowKeyframes[i] !== null) {
        lastShadowKeyframeIndex = i;
        break;
      }
    }

    if (lastShadowKeyframeIndex >= 0 && lowerShadowIndex >= lastShadowKeyframeIndex) {
      upperShadowIndex = lastShadowKeyframeIndex;
      lowerShadowIndex = lastShadowKeyframeIndex;
    }

    if (lowerShadowIndex !== null && upperShadowIndex !== null) {
      const lowerShadow = shadowKeyframes[lowerShadowIndex];
      const upperShadow = shadowKeyframes[upperShadowIndex];

      let shadowT;
      if (lowerShadowIndex === upperShadowIndex) {
        shadowT = 0;
      } else {
        shadowT = (keyframePosition - lowerShadowIndex) / (upperShadowIndex - lowerShadowIndex);
        shadowT = Math.max(0, Math.min(1, shadowT));
      }

      shapeLeftCurvePoints.forEach((p, i) => {
        p.x = lerp(lowerShadow.leftCurve[i].x, upperShadow.leftCurve[i].x, shadowT);
        p.y = lerp(lowerShadow.leftCurve[i].y, upperShadow.leftCurve[i].y, shadowT);
      });

      shapeRightCurvePoints.forEach((p, i) => {
        p.x = lerp(lowerShadow.rightCurve[i].x, upperShadow.rightCurve[i].x, shadowT);
        p.y = lerp(lowerShadow.rightCurve[i].y, upperShadow.rightCurve[i].y, shadowT);
      });

      if (lowerShadow.colors && upperShadow.colors && window.ShadowRenderer) {
        shapePointColors = lowerShadow.colors.map((lowerColor, i) => {
          const upperColor = upperShadow.colors[i];
          if (lowerColor === null || upperColor === null) {
            return lowerColor || upperColor;
          }
          return window.ShadowRenderer.interpolateColors(lowerColor, upperColor, shadowT);
        });
      }

      if (lowerShadow.blurAmount !== undefined && upperShadow.blurAmount !== undefined) {
        shadowBlurAmount = lerp(lowerShadow.blurAmount, upperShadow.blurAmount, shadowT);
      }

      if (shadowT < 0.5 && lowerShadow.blurEnabled !== undefined) {
        shadowBlurEnabled = lowerShadow.blurEnabled;
      } else if (upperShadow.blurEnabled !== undefined) {
        shadowBlurEnabled = upperShadow.blurEnabled;
      }

      updateShapeControlPointPositions();
      drawShapeCurves();
      generateShapePoints();
      drawSVGShape();
    }

    updateControlPointPositions();
    calculateSlicePoints();
    drawCurves();
    updateAllTransforms();
  }

  // Playback
  function togglePlay() {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }

  function startAnimation() {
    isPlaying = true;
    playButton.textContent = '⏸ Pause';
    playButton.style.background = '#ef4444';
    currentPlaybackFrame = 0;

    const frameTime = 1000 / playbackFPS;

    animationInterval = setInterval(() => {
      const currentTime = currentPlaybackFrame / playbackFPS;
      const keyframePosition = currentTime / timePerKeyframe;

      let lastKeyframeIndex = -1;
      for (let i = totalKeyframes - 1; i >= 0; i--) {
        if (keyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }

      const totalAnimationTime = lastKeyframeIndex >= 0 ? (lastKeyframeIndex + 1) * timePerKeyframe : 0;

      if (totalAnimationTime > 0 && currentTime >= totalAnimationTime) {
        if (loopAnimation) {
          currentPlaybackFrame = 0;
          applyInterpolatedFrame(0);
        } else {
          stopAnimation();
          applyInterpolatedFrame(lastKeyframeIndex);
          currentKeyframe = lastKeyframeIndex;
          currentScaleKeyframe = lastKeyframeIndex;
          currentShadowKeyframe = lastKeyframeIndex;
          updateTimelineUI();
        }
      } else {
        applyInterpolatedFrame(keyframePosition);
        currentPlaybackFrame++;
      }

      currentKeyframe = Math.round(keyframePosition) % totalKeyframes;
      currentScaleKeyframe = Math.round(keyframePosition) % totalKeyframes;
      currentShadowKeyframe = Math.round(keyframePosition) % totalKeyframes;
      updateTimelineUI();
    }, frameTime);
  }

  function stopAnimation() {
    isPlaying = false;
    if (playButton) {
      playButton.textContent = '▶ Play';
      playButton.style.background = '#3b82f6';
    }

    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  }

  function updateTimelineUI() {
    if (!timelineContainer) return;

    const slots = timelineContainer.querySelectorAll('[data-frame]');
    slots.forEach((slot, i) => {
      const isActive = i === currentKeyframe;
      const hasPosition = keyframes[i] !== null;
      const hasScale = scaleKeyframes[i] !== null;
      const hasShadow = shadowKeyframes[i] !== null;
      const hasAny = hasPosition || hasScale || hasShadow;

      if (isActive) {
        slot.style.background = '#3b82f6';
        slot.style.transform = 'scaleY(1.2)';
      } else if (hasAny) {
        slot.style.background = '#d1d5db';
        slot.style.transform = 'scaleY(1)';
      } else {
        slot.style.background = '#9ca3af';
        slot.style.transform = 'scaleY(1)';
      }

      const markers = slot.parentElement.querySelector('.keyframe-markers');
      if (markers) {
        const posMarker = markers.querySelector('.marker-position');
        const scaleMarker = markers.querySelector('.marker-scale');
        const shadowMarker = markers.querySelector('.marker-shadow');

        if (posMarker) posMarker.style.opacity = hasPosition ? '1' : '0';
        if (scaleMarker) scaleMarker.style.opacity = hasScale ? '1' : '0';
        if (shadowMarker) shadowMarker.style.opacity = hasShadow ? '1' : '0';
      }
    });

    const frameDisplay = document.getElementById('editor-frame-display');
    if (frameDisplay) {
      const hasPos = keyframes[currentKeyframe] !== null ? 'P' : '-';
      const hasScl = scaleKeyframes[currentKeyframe] !== null ? 'S' : '-';
      const hasShd = shadowKeyframes[currentKeyframe] !== null ? 'W' : '-';
      frameDisplay.textContent = `KF: ${currentKeyframe + 1}/${totalKeyframes} [${hasPos}${hasScl}${hasShd}]`;
    }

    const timeDisplay = document.getElementById('editor-time-display');
    if (timeDisplay) {
      let lastKeyframeIndex = -1;
      for (let i = totalKeyframes - 1; i >= 0; i--) {
        if (keyframes[i] || scaleKeyframes[i] || shadowKeyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }

      const totalTime = lastKeyframeIndex >= 0 ? (lastKeyframeIndex + 1) * timePerKeyframe : 0;

      let currentTime;
      if (isPlaying) {
        currentTime = (currentPlaybackFrame / playbackFPS);
      } else {
        currentTime = currentKeyframe * timePerKeyframe;
      }

      timeDisplay.textContent = `Time: ${currentTime.toFixed(2)}s / ${totalTime.toFixed(2)}s`;
    }
  }

  // Export/Import
  function exportAnimation() {
    const data = {
      version: 2,
      timePerKeyframe: timePerKeyframe,
      playbackFPS: playbackFPS,
      keyframes: keyframes,
      scaleKeyframes: scaleKeyframes,
      shadowKeyframes: shadowKeyframes,
      offsetX: offsetX,
      offsetY: offsetY,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `paper-animation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importAnimation(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = JSON.parse(event.target.result);

      if (data.timePerKeyframe !== undefined) {
        timePerKeyframe = data.timePerKeyframe;
        const input = document.getElementById('editor-time-per-keyframe');
        if (input) input.value = timePerKeyframe;
      }

      if (data.playbackFPS !== undefined) {
        playbackFPS = data.playbackFPS;
        const input = document.getElementById('editor-playback-fps');
        if (input) input.value = playbackFPS;
      }

      if (data.keyframes) {
        keyframes = data.keyframes;
      }

      if (data.scaleKeyframes) {
        scaleKeyframes = data.scaleKeyframes;
      } else {
        scaleKeyframes = Array(totalKeyframes).fill(null);
      }

      if (data.shadowKeyframes) {
        shadowKeyframes = data.shadowKeyframes;
      } else {
        shadowKeyframes = Array(totalKeyframes).fill(null);
      }

      if (data.offsetX !== undefined) {
        offsetX = data.offsetX;
      }

      if (data.offsetY !== undefined) {
        offsetY = data.offsetY;
      }

      currentKeyframe = 0;
      currentScaleKeyframe = 0;
      currentShadowKeyframe = 0;

      if (keyframes[0] && overlay) {
        loadKeyframe(0);
      }
      if (shadowKeyframes[0]) {
        loadShadowKeyframe(0);
      }

      updateTimelineUI();

      if (e.target) {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // Toggle modes
  function togglePaperPlayerMode() {
    if (!overlay) return;

    if (paperPlayerMode) {
      overlay.style.display = 'none';
      if (targetPaperElement) {
        for (let i = 0; i < numSlices; i++) {
          const slice = targetPaperElement.querySelector(`.paper-slice-${i}`);
          if (slice) slice.style.cursor = 'default';
        }
      }
    } else {
      overlay.style.display = 'block';
      if (targetPaperElement) {
        for (let i = 0; i < numSlices; i++) {
          const slice = targetPaperElement.querySelector(`.paper-slice-${i}`);
          if (slice) slice.style.cursor = 'move';
        }
      }
    }
  }

  function toggleShadowPlayerMode() {
    if (!shapeOverlay) return;

    if (shadowPlayerMode) {
      const shapeControlPoints = shapeOverlay.querySelectorAll('[data-side^="shape-"]');
      shapeControlPoints.forEach(point => point.style.display = 'none');

      const shapePointMarkers = shapeOverlay.querySelectorAll('.shape-point-marker');
      shapePointMarkers.forEach(marker => marker.style.display = 'none');

      const shapeSvg = document.getElementById('animation-editor-shape-svg');
      if (shapeSvg) {
        const curves = shapeSvg.querySelectorAll('path, line');
        curves.forEach(curve => curve.style.display = 'none');

        const shapeSlices = shapeSvg.querySelectorAll('.shape-slice');
        shapeSlices.forEach(slice => slice.style.cursor = 'default');
      }
    } else {
      const shapeControlPoints = shapeOverlay.querySelectorAll('[data-side^="shape-"]');
      shapeControlPoints.forEach(point => point.style.display = 'block');

      const shapePointMarkers = shapeOverlay.querySelectorAll('.shape-point-marker');
      shapePointMarkers.forEach(marker => marker.style.display = 'block');

      const shapeSvg = document.getElementById('animation-editor-shape-svg');
      if (shapeSvg) {
        const curves = shapeSvg.querySelectorAll('path, line');
        curves.forEach(curve => curve.style.display = 'block');

        const shapeSlices = shapeSvg.querySelectorAll('.shape-slice');
        shapeSlices.forEach(slice => slice.style.cursor = 'move');
      }
    }
  }

  function togglePaperTransparency(isTransparent) {
    if (!targetPaperElement) return;

    const slices = targetPaperElement.querySelectorAll('.paper-slice > div');
    slices.forEach(slice => {
      if (isTransparent) {
        slice.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
      } else {
        slice.style.backgroundColor = 'white';
      }
    });
  }

  function handleKeyDown(e) {
    // Spacebar - toggle play/pause
    if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      togglePlay();
    }

    // Escape - close editor
    if (e.code === 'Escape') {
      close();
    }
  }

  // Notify that animation data has changed
  function notifyAnimationChange() {
    if (currentAnimationIndex === -1) {
      // New animation - don't update existing animations
      return;
    }

    const animationData = {
      version: 2,
      timePerKeyframe: timePerKeyframe,
      playbackFPS: playbackFPS,
      keyframes: keyframes,
      scaleKeyframes: scaleKeyframes,
      shadowKeyframes: shadowKeyframes,
      offsetX: offsetX,
      offsetY: offsetY,
    };

    // Update the animation in PaperAnimator's memory
    if (window.PaperAnimator && window.PaperAnimator.updateAnimation) {
      window.PaperAnimator.updateAnimation(currentAnimationIndex, animationData);
    }

    if (onAnimationChangeCallback) {
      onAnimationChangeCallback(currentAnimationIndex, animationData);
    }
  }

  // Get current animation data (for creating new animations)
  function getCurrentAnimationData() {
    return {
      version: 2,
      timePerKeyframe: timePerKeyframe,
      playbackFPS: playbackFPS,
      keyframes: keyframes,
      scaleKeyframes: scaleKeyframes,
      shadowKeyframes: shadowKeyframes,
      offsetX: offsetX,
      offsetY: offsetY,
    };
  }

  // Expose API
  window.PaperAnimationEditor = {
    open: open,
    openNew: openNew,
    close: close,
    saveAndClose: saveAndClose,
    isOpen: () => isOpen,
    getCurrentAnimationData: getCurrentAnimationData,
  };
})();
