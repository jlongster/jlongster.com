// Paper positioning tool - bezier curve-based positioning with keyframe animation
(function () {
  const numSlices = 10;
  const numLines = numSlices + 1; // 11 horizontal lines
  const totalKeyframes = 60;
  let timePerKeyframe = 0.1; // Time in seconds that each keyframe represents (e.g., 0.1s = each keyframe is 0.1 seconds apart)
  let playbackFPS = 30; // Actual playback framerate (frames per second)

  let paperElement = null;
  let overlay = null;
  let leftCurvePoints = [];  // 4 control points for left bezier
  let rightCurvePoints = []; // 4 control points for right bezier
  let slicePoints = [];       // Calculated points for each slice edge
  let dragging = null;
  let updateScheduled = false;
  let overlayOffsetX = 0;     // Track overlay position offset from element
  let overlayOffsetY = 0;
  let scale = 1;              // Scale factor
  let offsetX = 0;            // Global X offset for animation (px)
  let offsetY = 0;            // Global Y offset for animation (px)

  // SVG Shape creation variables
  let shapeOverlay = null;        // Separate overlay for shape controls
  let shapeLeftCurvePoints = [];  // 4 control points for shape left bezier
  let shapeRightCurvePoints = []; // 4 control points for shape right bezier
  let shapeGeneratedPoints = [];  // Generated points along both curves
  let shapePointColors = [];      // Color for each generated point
  let selectedShapePoint = null;  // Currently selected point for coloring
  let shapeSVGElement = null;     // The SVG shape element

  // Animation state
  let keyframes = Array(totalKeyframes).fill(null);
  let scaleKeyframes = Array(totalKeyframes).fill(null); // Separate timeline for scale
  let shadowKeyframes = Array(totalKeyframes).fill(null); // Separate timeline for shadow
  let currentKeyframe = 0;
  let currentScaleKeyframe = 0; // Current position in scale timeline
  let currentShadowKeyframe = 0; // Current position in shadow timeline
  let currentPlaybackFrame = 0; // Current frame in playback (can be fractional for interpolation)
  let isPlaying = false;
  let animationInterval = null;
  let paperPlayerMode = false; // Toggle to hide paper controls
  let shadowPlayerMode = false; // Toggle to hide shadow controls
  let shadowBlurEnabled = false; // Toggle for shadow blur
  let shadowBlurAmount = 5; // Blur amount in pixels
  let loopAnimation = true; // Whether to loop/repeat animation when it ends

  // UI elements
  let timelineContainer = null;
  let scaleTimelineContainer = null;
  let shadowTimelineContainer = null;
  let playButton = null;

  // Initialize bezier control points
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

  // Initialize shape bezier control points (in their own coordinate space)
  shapeLeftCurvePoints = [
    { x: 50, y: 50, element: null },
    { x: 50, y: 150, element: null },
    { x: 50, y: 250, element: null },
    { x: 50, y: 350, element: null },
  ];

  shapeRightCurvePoints = [
    { x: 350, y: 50, element: null },
    { x: 350, y: 150, element: null },
    { x: 350, y: 250, element: null },
    { x: 350, y: 350, element: null },
  ];

  // Initialize colors for slices (null means unset, will be interpolated)
  for (let i = 0; i < 9; i++) {
    shapePointColors[i] = null;
  }

  function init() {
    paperElement = document.querySelector('.paper-element');
    if (!paperElement) {
      console.warn('No paper element found');
      return;
    }

    // Set z-index to ensure paper is above video player
    paperElement.style.position = 'relative';
    paperElement.style.zIndex = '100';

    // Ensure all slices are visible (disable any fade-in effects)
    const slices = paperElement.querySelectorAll('.paper-slice');
    slices.forEach(slice => {
      slice.style.opacity = '1';
    });

    createOverlay();
    createShapeOverlay();
    createTimelineUI();
    calculateSlicePoints();
    // Don't apply transforms on init - let paper render normally
    // updateAllTransforms();
    attachSliceDragListeners();
  }

  function attachSliceDragListeners() {
    // Make all paper slices draggable
    for (let i = 0; i < numSlices; i++) {
      const slice = document.querySelector(`.paper-slice-${i}`);
      if (slice) {
        slice.style.cursor = 'move';
        slice.addEventListener('mousedown', startWholeDrag);
      }
    }
  }

  function updateOverlayPosition() {
    if (!overlay || !paperElement) return;
    const rect = paperElement.getBoundingClientRect();
    overlay.style.top = (rect.top + overlayOffsetY) + 'px';
    overlay.style.left = (rect.left + overlayOffsetX) + 'px';
  }

  function createOverlay() {
    // Create overlay container
    overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      width: 250px;
      height: 300px;
      pointer-events: none;
      z-index: 1000;
      overflow: visible;
    `;

    overlayOffsetX = 0;
    overlayOffsetY = 0;
    updateOverlayPosition();

    // Create SVG for curves and outlines
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
    svg.id = 'tool-svg';

    overlay.appendChild(svg);

    // Create control points for paper element only
    leftCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'left', index);
      overlay.appendChild(dot);
    });

    rightCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'right', index);
      overlay.appendChild(dot);
    });

    updateControlPointPositions();
    drawCurves();
    document.body.appendChild(overlay);

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }

  function createShapeOverlay() {
    // Create separate overlay container for shape
    shapeOverlay = document.createElement('div');
    shapeOverlay.style.cssText = `
      position: fixed;
      width: 400px;
      height: 400px;
      pointer-events: none;
      z-index: 10002;
      overflow: visible;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;

    // Create SVG for shape curves and shapes
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 800px;
      pointer-events: none;
      overflow: visible;
      z-index: 50;
    `;
    svg.setAttribute('width', '800');
    svg.setAttribute('height', '800');
    svg.setAttribute('viewBox', '-200 -200 800 800');
    svg.id = 'shape-svg';

    // Append SVG directly to body so it can have independent z-index
    document.body.appendChild(svg);

    // Create shape control points
    shapeLeftCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'shape-left', index);
      shapeOverlay.appendChild(dot);
    });

    shapeRightCurvePoints.forEach((point, index) => {
      const dot = createControlPoint(point, 'shape-right', index);
      shapeOverlay.appendChild(dot);
    });

    updateShapeControlPointPositions();
    drawShapeCurves();
    generateShapePoints();
    drawSVGShape();
    document.body.appendChild(shapeOverlay);
  }

  function createTimelineUI() {
    let isCollapsed = false;

    // Main timeline container
    timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 8px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      min-width: 800px;
    `;

    // Collapsed controls (always visible)
    const collapsedControls = document.createElement('div');
    collapsedControls.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 4px;
    `;

    // Expanded controls container (can be hidden)
    const expandedContainer = document.createElement('div');
    expandedContainer.id = 'expanded-timeline';
    expandedContainer.style.cssText = `
      display: block;
    `;

    // View/Display controls row (Paper/Shadow toggles, blur, video)
    const viewControls = document.createElement('div');
    viewControls.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
      align-items: center;
    `;

    // Main editing controls row
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
      align-items: center;
    `;

    // Collapse/Expand button
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
      if (isCollapsed) {
        expandedContainer.style.display = 'none';
        collapseButton.textContent = '▲';
      } else {
        expandedContainer.style.display = 'block';
        collapseButton.textContent = '▼';
      }
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

    // Loop animation checkbox
    const loopCheckbox = document.createElement('input');
    loopCheckbox.type = 'checkbox';
    loopCheckbox.id = 'loop-checkbox';
    loopCheckbox.checked = loopAnimation;
    loopCheckbox.style.cssText = `
      margin-left: 8px;
      cursor: pointer;
    `;
    loopCheckbox.onchange = (e) => {
      loopAnimation = e.target.checked;
    };

    const loopLabel = document.createElement('label');
    loopLabel.htmlFor = 'loop-checkbox';
    loopLabel.textContent = 'Loop';
    loopLabel.style.cssText = `
      margin-left: 4px;
      font-size: 12px;
      color: #374151;
      cursor: pointer;
      user-select: none;
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
    importButton.onclick = () => importFileInput.click();

    // Hidden file input for import
    const importFileInput = document.createElement('input');
    importFileInput.type = 'file';
    importFileInput.accept = '.json';
    importFileInput.style.display = 'none';
    importFileInput.onchange = importAnimation;

    // Transparency toggle button
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

    // Paper player mode toggle button
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

    // Shadow player mode toggle button
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
      // Redraw shadow to apply/remove blur
      drawSVGShape();
    };

    // Video player toggle
    let videoPlayerVisible = false; // Default: hidden
    const videoPlayerBtn = document.createElement('button');
    videoPlayerBtn.textContent = 'Video: Hide';
    videoPlayerBtn.style.cssText = `
      padding: 4px 10px;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;

    videoPlayerBtn.onclick = () => {
      videoPlayerVisible = !videoPlayerVisible;
      const videoPlayer = document.getElementById('video-player-container');

      if (videoPlayer) {
        videoPlayer.style.display = videoPlayerVisible ? 'block' : 'none';
        videoPlayerBtn.textContent = videoPlayerVisible ? 'Video: Show' : 'Video: Hide';
        videoPlayerBtn.style.background = videoPlayerVisible ? '#10b981' : '#6b7280';
      } else {
        console.warn('[Video Toggle] Could not find video player container');
      }
    };

    // Shadow blur amount slider
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
      <input type="range" id="shadow-blur-amount" value="5" min="0" max="20" step="0.5"
        style="width: 60px; cursor: pointer;">
      <span id="blur-amount-value" style="min-width: 30px;">5px</span>
    `;
    const blurSlider = blurAmountLabel.querySelector('#shadow-blur-amount');
    const blurValue = blurAmountLabel.querySelector('#blur-amount-value');
    blurSlider.addEventListener('input', (e) => {
      shadowBlurAmount = parseFloat(e.target.value);
      blurValue.textContent = `${shadowBlurAmount}px`;
      // Redraw shadow to apply new blur amount
      drawSVGShape();
    });

    // Shape point color picker
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
      <input type="color" id="shape-point-color-picker" value="#ffffff"
        style="width: 40px; height: 24px; border: 1px solid #d1d5db; border-radius: 3px; cursor: pointer;">
    `;
    const colorPicker = colorPickerLabel.querySelector('#shape-point-color-picker');
    colorPicker.addEventListener('input', (e) => {
      const alpha = parseFloat(document.getElementById('shape-point-alpha-picker')?.value || 1);
      setShapePointColor(e.target.value, alpha);
    });

    // Shape point opacity slider
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
      <input type="range" id="shape-point-alpha-picker" value="1" min="0" max="1" step="0.01"
        style="width: 60px; cursor: pointer;">
      <span id="opacity-value" style="min-width: 30px;">100%</span>
    `;
    const alphaPicker = opacityLabel.querySelector('#shape-point-alpha-picker');
    const opacityValue = opacityLabel.querySelector('#opacity-value');
    alphaPicker.addEventListener('input', (e) => {
      const alpha = parseFloat(e.target.value);
      opacityValue.textContent = `${Math.round(alpha * 100)}%`;
      const color = document.getElementById('shape-point-color-picker')?.value || '#ffffff';
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
      <input type="number" id="time-per-keyframe" value="${timePerKeyframe}" min="0.01" max="10" step="0.1"
        style="width: 50px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const timePerKeyframeInput = timePerKeyframeLabel.querySelector('#time-per-keyframe');
    timePerKeyframeInput.addEventListener('change', (e) => {
      timePerKeyframe = parseFloat(e.target.value);
      updateTimelineUI(); // Update time display when time changes
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
      <input type="number" id="playback-fps" value="${playbackFPS}" min="0.01" max="120" step="0.1"
        style="width: 45px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const playbackFPSInput = playbackFPSLabel.querySelector('#playback-fps');
    playbackFPSInput.addEventListener('change', (e) => {
      playbackFPS = parseFloat(e.target.value);
      // Restart animation with new FPS if playing
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
      <input type="number" id="scale-input" value="${scale}" min="0.1" max="5" step="0.1"
        style="width: 45px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const scaleInput = scaleLabel.querySelector('#scale-input');
    scaleInput.addEventListener('change', (e) => {
      scale = parseFloat(e.target.value);
      applyTransform();
    });

    // Offset X input
    const offsetXLabel = document.createElement('label');
    offsetXLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    offsetXLabel.innerHTML = `
      X:
      <input type="number" id="offset-x-input" value="${offsetX}" min="-500" max="500" step="1"
        style="width: 45px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const offsetXInput = offsetXLabel.querySelector('#offset-x-input');
    offsetXInput.addEventListener('change', (e) => {
      offsetX = parseFloat(e.target.value);
      applyTransform();
    });

    // Offset Y input
    const offsetYLabel = document.createElement('label');
    offsetYLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #374151;
    `;
    offsetYLabel.innerHTML = `
      Y:
      <input type="number" id="offset-y-input" value="${offsetY}" min="-500" max="500" step="1"
        style="width: 45px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
    `;
    const offsetYInput = offsetYLabel.querySelector('#offset-y-input');
    offsetYInput.addEventListener('change', (e) => {
      offsetY = parseFloat(e.target.value);
      applyTransform();
    });

    // Time display
    const timeDisplay = document.createElement('span');
    timeDisplay.id = 'time-display';
    timeDisplay.style.cssText = `
      margin-left: auto;
      font-weight: 500;
      color: #374151;
      font-family: monospace;
      font-size: 11px;
    `;
    timeDisplay.textContent = `Time: 0.00s / 0.00s`;

    // Current frame display
    const frameDisplay = document.createElement('span');
    frameDisplay.id = 'frame-display';
    frameDisplay.style.cssText = `
      font-weight: 500;
      color: #374151;
      font-size: 11px;
    `;
    frameDisplay.textContent = `KF: ${currentKeyframe + 1}/${totalKeyframes}`;

    // Collapsed controls: only play button, loop checkbox, and frame display
    collapsedControls.appendChild(collapseButton);
    collapsedControls.appendChild(playButton);
    collapsedControls.appendChild(loopCheckbox);
    collapsedControls.appendChild(loopLabel);
    collapsedControls.appendChild(frameDisplay);

    // Expanded controls: everything else
    // Add buttons to view controls row
    viewControls.appendChild(paperPlayerModeBtn);
    viewControls.appendChild(shadowPlayerModeBtn);
    viewControls.appendChild(shadowBlurBtn);
    viewControls.appendChild(blurAmountLabel);
    viewControls.appendChild(videoPlayerBtn);

    // Add buttons to main editing controls row
    controls.appendChild(saveButton);
    controls.appendChild(clearButton);
    controls.appendChild(straightenButton);
    controls.appendChild(exportButton);
    controls.appendChild(importButton);
    controls.appendChild(transparencyBtn);
    controls.appendChild(colorPickerLabel);
    controls.appendChild(opacityLabel);
    controls.appendChild(timePerKeyframeLabel);
    controls.appendChild(playbackFPSLabel);
    controls.appendChild(scaleLabel);
    controls.appendChild(offsetXLabel);
    controls.appendChild(offsetYLabel);
    controls.appendChild(timeDisplay);

    expandedContainer.appendChild(viewControls);
    expandedContainer.appendChild(controls);

    // Unified Timeline track
    const timeline = document.createElement('div');
    timeline.style.cssText = `
      display: flex;
      gap: 1px;
      background: #e5e7eb;
      padding: 3px;
      border-radius: 3px;
    `;

    // Create keyframe slots
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

      // Container for markers
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

      // Position marker (red)
      const posMarker = document.createElement('div');
      posMarker.className = 'marker-position';
      posMarker.style.cssText = `
        flex: 1;
        background: #ef4444;
        border-radius: 1px;
        opacity: 0;
        transition: opacity 0.1s;
      `;

      // Scale marker (purple)
      const scaleMarker = document.createElement('div');
      scaleMarker.className = 'marker-scale';
      scaleMarker.style.cssText = `
        flex: 1;
        background: #8b5cf6;
        border-radius: 1px;
        opacity: 0;
        transition: opacity 0.1s;
      `;

      // Shadow marker (green)
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

    // Keyframe save/clear controls for each type
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
    const positionGroup = document.createElement('div');
    positionGroup.style.cssText = `
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 4px 8px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
    `;

    const posLabel = document.createElement('span');
    posLabel.textContent = 'Position:';
    posLabel.style.cssText = `
      font-size: 11px;
      color: #ef4444;
      font-weight: 500;
    `;

    const savePositionButton = document.createElement('button');
    savePositionButton.textContent = 'Save';
    savePositionButton.style.cssText = `
      padding: 3px 8px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    savePositionButton.onclick = saveCurrentKeyframe;

    const clearPositionButton = document.createElement('button');
    clearPositionButton.textContent = 'Clear';
    clearPositionButton.style.cssText = `
      padding: 3px 8px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    clearPositionButton.onclick = clearCurrentKeyframe;

    positionGroup.appendChild(posLabel);
    positionGroup.appendChild(savePositionButton);
    positionGroup.appendChild(clearPositionButton);

    // Scale controls
    const scaleGroup = document.createElement('div');
    scaleGroup.style.cssText = `
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 4px 8px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 4px;
    `;

    const scaleKFLabel = document.createElement('span');
    scaleKFLabel.textContent = 'Scale:';
    scaleKFLabel.style.cssText = `
      font-size: 11px;
      color: #8b5cf6;
      font-weight: 500;
    `;

    const saveScaleButton = document.createElement('button');
    saveScaleButton.textContent = 'Save';
    saveScaleButton.style.cssText = `
      padding: 3px 8px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    saveScaleButton.onclick = saveCurrentScaleKeyframe;

    const clearScaleButton = document.createElement('button');
    clearScaleButton.textContent = 'Clear';
    clearScaleButton.style.cssText = `
      padding: 3px 8px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    clearScaleButton.onclick = clearCurrentScaleKeyframe;

    scaleGroup.appendChild(scaleKFLabel);
    scaleGroup.appendChild(saveScaleButton);
    scaleGroup.appendChild(clearScaleButton);

    // Shadow controls
    const shadowGroup = document.createElement('div');
    shadowGroup.style.cssText = `
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 4px 8px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 4px;
    `;

    const shadowLabel = document.createElement('span');
    shadowLabel.textContent = 'Shadow:';
    shadowLabel.style.cssText = `
      font-size: 11px;
      color: #10b981;
      font-weight: 500;
    `;

    const saveShadowButton = document.createElement('button');
    saveShadowButton.textContent = 'Save';
    saveShadowButton.style.cssText = `
      padding: 3px 8px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    saveShadowButton.onclick = saveCurrentShadowKeyframe;

    const clearShadowButton = document.createElement('button');
    clearShadowButton.textContent = 'Clear';
    clearShadowButton.style.cssText = `
      padding: 3px 8px;
      background: #059669;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;
    clearShadowButton.onclick = clearCurrentShadowKeyframe;

    shadowGroup.appendChild(shadowLabel);
    shadowGroup.appendChild(saveShadowButton);
    shadowGroup.appendChild(clearShadowButton);

    keyframeControls.appendChild(positionGroup);
    keyframeControls.appendChild(scaleGroup);
    keyframeControls.appendChild(shadowGroup);

    expandedContainer.appendChild(keyframeControls);

    timelineContainer.appendChild(collapsedControls);
    timelineContainer.appendChild(expandedContainer);

    document.body.appendChild(timelineContainer);

    updateTimelineUI();
  }

  function updateTimelineUI() {
    const slots = timelineContainer.querySelectorAll('[data-frame]');
    slots.forEach((slot, i) => {
      const isActive = i === currentKeyframe;
      const hasPosition = keyframes[i] !== null;
      const hasScale = scaleKeyframes[i] !== null;
      const hasShadow = shadowKeyframes[i] !== null;
      const hasAny = hasPosition || hasScale || hasShadow;

      // Update slot background
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

      // Update markers visibility
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

    const frameDisplay = document.getElementById('frame-display');
    if (frameDisplay) {
      const hasPos = keyframes[currentKeyframe] !== null ? 'P' : '-';
      const hasScl = scaleKeyframes[currentKeyframe] !== null ? 'S' : '-';
      const hasShd = shadowKeyframes[currentKeyframe] !== null ? 'W' : '-';
      frameDisplay.textContent = `KF: ${currentKeyframe + 1}/${totalKeyframes} [${hasPos}${hasScl}${hasShd}]`;
    }

    // Update time display
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
      // Find last keyframe with data
      let lastKeyframeIndex = -1;
      for (let i = totalKeyframes - 1; i >= 0; i--) {
        if (keyframes[i] || scaleKeyframes[i] || shadowKeyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }

      // Calculate total time based on last keyframe
      const totalTime = lastKeyframeIndex >= 0 ? (lastKeyframeIndex + 1) * timePerKeyframe : 0;

      // Calculate current time
      let currentTime;
      if (isPlaying) {
        // When playing, use playback frame position
        currentTime = (currentPlaybackFrame / playbackFPS);
      } else {
        // When not playing, use current keyframe
        currentTime = currentKeyframe * timePerKeyframe;
      }

      timeDisplay.textContent = `Time: ${currentTime.toFixed(2)}s / ${totalTime.toFixed(2)}s`;
    }
  }

  function selectUnifiedKeyframe(index) {
    if (isPlaying) return;

    currentKeyframe = index;
    currentScaleKeyframe = index;
    currentShadowKeyframe = index;

    // Use the same interpolation logic as playback
    applyInterpolatedFrame(index);

    // Update UI controls with interpolated values
    const scaleInput = document.getElementById('scale-input');
    if (scaleInput) scaleInput.value = scale;

    const blurToggle = document.getElementById('blur-toggle');
    const blurSlider = document.getElementById('blur-slider');
    if (blurToggle) blurToggle.checked = shadowBlurEnabled;
    if (blurSlider) blurSlider.value = shadowBlurAmount;

    updateTimelineUI();
  }

  function selectKeyframe(index) {
    selectUnifiedKeyframe(index);
  }

  function selectScaleKeyframe(index) {
    selectUnifiedKeyframe(index);
  }

  function selectShadowKeyframe(index) {
    selectUnifiedKeyframe(index);
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
    // Save current shadow state
    shadowKeyframes[currentShadowKeyframe] = {
      leftCurve: shapeLeftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: shapeRightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      colors: [...shapePointColors], // Copy the colors array
      blurEnabled: shadowBlurEnabled,
      blurAmount: shadowBlurAmount
    };
    updateTimelineUI();
  }

  function clearCurrentShadowKeyframe() {
    shadowKeyframes[currentShadowKeyframe] = null;
    updateTimelineUI();
  }

  function loadShadowKeyframe(index) {
    const kf = shadowKeyframes[index];
    if (!kf) return;

    // Restore shadow curve points
    shapeLeftCurvePoints.forEach((p, i) => {
      p.x = kf.leftCurve[i].x;
      p.y = kf.leftCurve[i].y;
    });

    shapeRightCurvePoints.forEach((p, i) => {
      p.x = kf.rightCurve[i].x;
      p.y = kf.rightCurve[i].y;
    });

    // Restore colors
    if (kf.colors) {
      shapePointColors = [...kf.colors];
    }

    // Restore blur settings
    if (kf.blurEnabled !== undefined) {
      shadowBlurEnabled = kf.blurEnabled;
    }
    if (kf.blurAmount !== undefined) {
      shadowBlurAmount = kf.blurAmount;
      const blurSlider = document.getElementById('shadow-blur-amount');
      const blurValue = document.getElementById('blur-amount-value');
      if (blurSlider) blurSlider.value = shadowBlurAmount;
      if (blurValue) blurValue.textContent = `${shadowBlurAmount}px`;
    }

    // Update visuals
    updateShapeControlPointPositions();
    drawShapeCurves();
    generateShapePoints();
    drawSVGShape();
    // applyShadowBlur(); // Don't call - permanent blur is applied in drawSVGShape()
  }

  function saveCurrentKeyframe() {
    // Preserve the isRectangle property if it exists
    const existingKeyframe = keyframes[currentKeyframe];
    const newKeyframe = {
      leftCurve: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      overlayOffsetX: overlayOffsetX,
      overlayOffsetY: overlayOffsetY,
    };

    // Preserve isRectangle flag if it existed
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

  function straightenAndMarkKeyframe() {
    // Get the four corner points from the current bezier curves
    const topLeft = leftCurvePoints[0];
    const topRight = rightCurvePoints[0];
    const bottomLeft = leftCurvePoints[3];
    const bottomRight = rightCurvePoints[3];

    // Calculate the center point of the current shape
    const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;
    const centerY = (topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4;

    // Calculate the average width and height
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

    // Calculate rotation angle from the top edge
    const dx = topRight.x - topLeft.x;
    const dy = topRight.y - topLeft.y;
    const rotation = Math.atan2(dy, dx);

    // Create perfect rectangle corners
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Calculate rectangle corners (unrotated, centered at origin)
    const corners = [
      { x: -halfWidth, y: -halfHeight }, // top-left
      { x: halfWidth, y: -halfHeight },  // top-right
      { x: -halfWidth, y: halfHeight },  // bottom-left
      { x: halfWidth, y: halfHeight },   // bottom-right
    ];

    // Rotate and translate corners
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const rotatedCorners = corners.map(corner => ({
      x: corner.x * cos - corner.y * sin + centerX,
      y: corner.x * sin + corner.y * cos + centerY,
    }));

    // Set the corner points
    leftCurvePoints[0].x = rotatedCorners[0].x;
    leftCurvePoints[0].y = rotatedCorners[0].y;
    rightCurvePoints[0].x = rotatedCorners[1].x;
    rightCurvePoints[0].y = rotatedCorners[1].y;
    leftCurvePoints[3].x = rotatedCorners[2].x;
    leftCurvePoints[3].y = rotatedCorners[2].y;
    rightCurvePoints[3].x = rotatedCorners[3].x;
    rightCurvePoints[3].y = rotatedCorners[3].y;

    // Set the middle control points to create straight lines
    // Left curve: straight line from top-left to bottom-left
    leftCurvePoints[1].x = leftCurvePoints[0].x + (leftCurvePoints[3].x - leftCurvePoints[0].x) / 3;
    leftCurvePoints[1].y = leftCurvePoints[0].y + (leftCurvePoints[3].y - leftCurvePoints[0].y) / 3;
    leftCurvePoints[2].x = leftCurvePoints[0].x + (2 * (leftCurvePoints[3].x - leftCurvePoints[0].x)) / 3;
    leftCurvePoints[2].y = leftCurvePoints[0].y + (2 * (leftCurvePoints[3].y - leftCurvePoints[0].y)) / 3;

    // Right curve: straight line from top-right to bottom-right
    rightCurvePoints[1].x = rightCurvePoints[0].x + (rightCurvePoints[3].x - rightCurvePoints[0].x) / 3;
    rightCurvePoints[1].y = rightCurvePoints[0].y + (rightCurvePoints[3].y - rightCurvePoints[0].y) / 3;
    rightCurvePoints[2].x = rightCurvePoints[0].x + (2 * (rightCurvePoints[3].x - rightCurvePoints[0].x)) / 3;
    rightCurvePoints[2].y = rightCurvePoints[0].y + (2 * (rightCurvePoints[3].y - rightCurvePoints[0].y)) / 3;

    // Update the visual representation
    calculateSlicePoints();
    updateAllTransforms();
    updateControlPointPositions();

    // Save the keyframe with a special flag
    keyframes[currentKeyframe] = {
      leftCurve: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      overlayOffsetX: overlayOffsetX,
      overlayOffsetY: overlayOffsetY,
      isRectangle: true, // Mark as special rectangle keyframe
    };

    updateTimelineUI();
    console.log('[Straighten] Created perfect rectangle keyframe at', currentKeyframe);
    console.log('[Straighten] Keyframe data:', keyframes[currentKeyframe]);
    console.log('[Straighten] Has isRectangle flag:', keyframes[currentKeyframe].isRectangle);
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

    // Restore overlay offset
    if (kf.overlayOffsetX !== undefined && kf.overlayOffsetY !== undefined) {
      overlayOffsetX = kf.overlayOffsetX;
      overlayOffsetY = kf.overlayOffsetY;
      const rect = paperElement.getBoundingClientRect();
      overlay.style.left = (rect.left + overlayOffsetX) + 'px';
      overlay.style.top = (rect.top + overlayOffsetY) + 'px';
    }

    // Restore scale
    if (kf.scale !== undefined) {
      scale = kf.scale;
      const scaleInput = document.getElementById('scale-input');
      if (scaleInput) scaleInput.value = scale;
    }

    updateControlPointPositions();
    calculateSlicePoints();
    drawCurves();
    updateAllTransforms();
    applyTransform();
  }

  // Apply flip and scale (now handled by rotating/scaling destination points)
  function applyTransform() {
    // Transforms are now applied by modifying the destination points in updateSliceTransform
    // Just trigger a redraw
    updateOverlayPosition();
    updateAllTransforms();
  }

  // Linear interpolation helper
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Find the next non-null keyframe after the given index
  function findNextKeyframe(startIndex) {
    for (let i = startIndex; i < totalKeyframes; i++) {
      if (keyframes[i]) return i;
    }
    // If no keyframe found, wrap to beginning
    for (let i = 0; i < startIndex; i++) {
      if (keyframes[i]) return i;
    }
    return null; // No keyframes at all
  }

  // Find the previous non-null keyframe before the given index
  function findPreviousKeyframe(startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      if (keyframes[i]) return i;
    }
    // If no keyframe found, wrap to end
    for (let i = totalKeyframes - 1; i > startIndex; i--) {
      if (keyframes[i]) return i;
    }
    return null; // No keyframes at all
  }

  // Find the next non-null scale keyframe after the given index
  function findNextScaleKeyframe(startIndex) {
    for (let i = startIndex; i < totalKeyframes; i++) {
      if (scaleKeyframes[i] !== null) return i;
    }
    // If no keyframe found, wrap to beginning
    for (let i = 0; i < startIndex; i++) {
      if (scaleKeyframes[i] !== null) return i;
    }
    return null; // No scale keyframes at all
  }

  // Find the previous non-null scale keyframe before the given index
  function findPreviousScaleKeyframe(startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      if (scaleKeyframes[i] !== null) return i;
    }
    // If no keyframe found, wrap to end
    for (let i = totalKeyframes - 1; i > startIndex; i--) {
      if (scaleKeyframes[i] !== null) return i;
    }
    return null; // No scale keyframes at all
  }

  // Find the next non-null shadow keyframe after the given index
  function findNextShadowKeyframe(startIndex) {
    for (let i = startIndex; i < totalKeyframes; i++) {
      if (shadowKeyframes[i] !== null) return i;
    }
    // If no keyframe found, wrap to beginning
    for (let i = 0; i < startIndex; i++) {
      if (shadowKeyframes[i] !== null) return i;
    }
    return null; // No shadow keyframes at all
  }

  // Find the previous non-null shadow keyframe before the given index
  function findPreviousShadowKeyframe(startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      if (shadowKeyframes[i] !== null) return i;
    }
    // If no keyframe found, wrap to end
    for (let i = totalKeyframes - 1; i > startIndex; i--) {
      if (shadowKeyframes[i] !== null) return i;
    }
    return null; // No shadow keyframes at all
  }

  // Interpolate and apply a frame at a given keyframe position (can be fractional)
  function applyInterpolatedFrame(keyframePosition) {
    // Find the last keyframe with data
    let lastKeyframeIndex = -1;
    for (let i = totalKeyframes - 1; i >= 0; i--) {
      if (keyframes[i]) {
        lastKeyframeIndex = i;
        break;
      }
    }

    // Clamp keyframePosition to not exceed the last keyframe
    if (lastKeyframeIndex >= 0 && keyframePosition >= lastKeyframeIndex) {
      keyframePosition = lastKeyframeIndex;
    }

    // Find the keyframes to interpolate between
    const lowerIndex = Math.floor(keyframePosition);
    const upperIndex = Math.ceil(keyframePosition);

    // Find actual keyframes (skip nulls)
    let lowerKeyframeIndex = findPreviousKeyframe(lowerIndex);
    let upperKeyframeIndex = findNextKeyframe(upperIndex);

    if (lowerKeyframeIndex === null || upperKeyframeIndex === null) {
      return; // No keyframes to interpolate
    }

    // If we're at or past the last keyframe, don't wrap around
    if (lastKeyframeIndex >= 0 && lowerKeyframeIndex >= lastKeyframeIndex) {
      upperKeyframeIndex = lastKeyframeIndex;
      lowerKeyframeIndex = lastKeyframeIndex;
    }

    const lowerKf = keyframes[lowerKeyframeIndex];
    const upperKf = keyframes[upperKeyframeIndex];

    // Calculate interpolation factor
    let t;
    if (lowerKeyframeIndex === upperKeyframeIndex) {
      // Same keyframe, no interpolation needed
      t = 0;
    } else {
      // Calculate t based on position between the two keyframes
      t = (keyframePosition - lowerKeyframeIndex) / (upperKeyframeIndex - lowerKeyframeIndex);
      t = Math.max(0, Math.min(1, t)); // Clamp between 0 and 1
    }

    // Interpolate control points
    leftCurvePoints.forEach((p, i) => {
      p.x = lerp(lowerKf.leftCurve[i].x, upperKf.leftCurve[i].x, t);
      p.y = lerp(lowerKf.leftCurve[i].y, upperKf.leftCurve[i].y, t);
    });

    rightCurvePoints.forEach((p, i) => {
      p.x = lerp(lowerKf.rightCurve[i].x, upperKf.rightCurve[i].x, t);
      p.y = lerp(lowerKf.rightCurve[i].y, upperKf.rightCurve[i].y, t);
    });

    // Interpolate overlay offset if available
    if (lowerKf.overlayOffsetX !== undefined && upperKf.overlayOffsetX !== undefined) {
      overlayOffsetX = lerp(lowerKf.overlayOffsetX, upperKf.overlayOffsetX, t);
      overlayOffsetY = lerp(lowerKf.overlayOffsetY, upperKf.overlayOffsetY, t);
      const rect = paperElement.getBoundingClientRect();
      overlay.style.left = (rect.left + overlayOffsetX) + 'px';
      overlay.style.top = (rect.top + overlayOffsetY) + 'px';
    }

    // Interpolate scale from scale timeline
    let lowerScaleIndex = findPreviousScaleKeyframe(lowerIndex);
    let upperScaleIndex = findNextScaleKeyframe(upperIndex);

    // Find the last scale keyframe
    let lastScaleKeyframeIndex = -1;
    for (let i = totalKeyframes - 1; i >= 0; i--) {
      if (scaleKeyframes[i] !== null) {
        lastScaleKeyframeIndex = i;
        break;
      }
    }

    // If we're at or past the last scale keyframe, don't wrap around
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

    // Interpolate shadow from shadow timeline
    let lowerShadowIndex = findPreviousShadowKeyframe(lowerIndex);
    let upperShadowIndex = findNextShadowKeyframe(upperIndex);

    // Find the last shadow keyframe
    let lastShadowKeyframeIndex = -1;
    for (let i = totalKeyframes - 1; i >= 0; i--) {
      if (shadowKeyframes[i] !== null) {
        lastShadowKeyframeIndex = i;
        break;
      }
    }

    // If we're at or past the last shadow keyframe, don't wrap around
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

      // Interpolate shadow curve points
      shapeLeftCurvePoints.forEach((p, i) => {
        p.x = lerp(lowerShadow.leftCurve[i].x, upperShadow.leftCurve[i].x, shadowT);
        p.y = lerp(lowerShadow.leftCurve[i].y, upperShadow.leftCurve[i].y, shadowT);
      });

      shapeRightCurvePoints.forEach((p, i) => {
        p.x = lerp(lowerShadow.rightCurve[i].x, upperShadow.rightCurve[i].x, shadowT);
        p.y = lerp(lowerShadow.rightCurve[i].y, upperShadow.rightCurve[i].y, shadowT);
      });

      // Interpolate colors
      if (lowerShadow.colors && upperShadow.colors) {
        shapePointColors = lowerShadow.colors.map((lowerColor, i) => {
          const upperColor = upperShadow.colors[i];
          if (lowerColor === null || upperColor === null) {
            return lowerColor || upperColor; // Use whichever is not null
          }
          return interpolateColors(lowerColor, upperColor, shadowT);
        });
      }

      // Interpolate blur amount
      if (lowerShadow.blurAmount !== undefined && upperShadow.blurAmount !== undefined) {
        shadowBlurAmount = lerp(lowerShadow.blurAmount, upperShadow.blurAmount, shadowT);
      }

      // Use blur enabled from the nearest keyframe
      if (shadowT < 0.5 && lowerShadow.blurEnabled !== undefined) {
        shadowBlurEnabled = lowerShadow.blurEnabled;
      } else if (upperShadow.blurEnabled !== undefined) {
        shadowBlurEnabled = upperShadow.blurEnabled;
      }

      // Update shadow visuals
      updateShapeControlPointPositions();
      drawShapeCurves();
      generateShapePoints();
      drawSVGShape();
      // applyShadowBlur(); // Don't call - permanent blur is applied in drawSVGShape()
    }

    // Update visuals
    updateControlPointPositions();
    calculateSlicePoints();
    drawCurves();
    updateAllTransforms();
    applyTransform();
  }

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

    const frameTime = 1000 / playbackFPS; // Time per playback frame

    animationInterval = setInterval(() => {
      // Calculate current time in the animation (in seconds)
      const currentTime = currentPlaybackFrame / playbackFPS;

      // Calculate which keyframe position we're at (can be fractional)
      const keyframePosition = currentTime / timePerKeyframe;

      // Find the last keyframe with data to determine when to loop
      let lastKeyframeIndex = -1;
      for (let i = totalKeyframes - 1; i >= 0; i--) {
        if (keyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }

      // Calculate total animation time
      const totalAnimationTime = lastKeyframeIndex >= 0 ? (lastKeyframeIndex + 1) * timePerKeyframe : 0;

      // If we've passed the end of the animation
      if (totalAnimationTime > 0 && currentTime >= totalAnimationTime) {
        if (loopAnimation) {
          // Loop back to start
          currentPlaybackFrame = 0;
          applyInterpolatedFrame(0);
        } else {
          // Stop at the end
          stopAnimation();
          // Show final frame
          applyInterpolatedFrame(lastKeyframeIndex);
          currentKeyframe = lastKeyframeIndex;
          currentScaleKeyframe = lastKeyframeIndex;
          currentShadowKeyframe = lastKeyframeIndex;
          updateTimelineUI();
        }
      } else {
        // Apply interpolated frame
        applyInterpolatedFrame(keyframePosition);
        currentPlaybackFrame++;
      }

      // Update current keyframe for UI display (rounded to nearest)
      currentKeyframe = Math.round(keyframePosition) % totalKeyframes;
      currentScaleKeyframe = Math.round(keyframePosition) % totalKeyframes;
      currentShadowKeyframe = Math.round(keyframePosition) % totalKeyframes;
      updateTimelineUI();
    }, frameTime);
  }

  function stopAnimation() {
    isPlaying = false;
    playButton.textContent = '▶ Play';
    playButton.style.background = '#3b82f6';

    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
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

  function updateControlPointPositions() {
    leftCurvePoints.forEach(point => {
      point.element.style.left = point.x + 'px';
      point.element.style.top = point.y + 'px';
    });

    rightCurvePoints.forEach(point => {
      point.element.style.left = point.x + 'px';
      point.element.style.top = point.y + 'px';
    });
  }

  function updateShapeControlPointPositions() {
    shapeLeftCurvePoints.forEach(point => {
      point.element.style.left = point.x + 'px';
      point.element.style.top = point.y + 'px';
    });

    shapeRightCurvePoints.forEach(point => {
      point.element.style.left = point.x + 'px';
      point.element.style.top = point.y + 'px';
    });
  }

  function drawCurves() {
    const svg = document.getElementById('tool-svg');
    if (!svg) return;

    // Remove existing curve elements
    const existing = svg.querySelectorAll('path, line, polygon');
    existing.forEach(el => el.remove());

    drawControlHandles(svg, leftCurvePoints, '#ef4444');
    drawControlHandles(svg, rightCurvePoints, '#3b82f6');

    const leftPath = createBezierPath(leftCurvePoints, '#ef4444');
    svg.appendChild(leftPath);

    const rightPath = createBezierPath(rightCurvePoints, '#3b82f6');
    svg.appendChild(rightPath);

    drawSliceOutlines(svg);
  }

  function drawShapeCurves() {
    const svg = document.getElementById('shape-svg');
    if (!svg) return;

    // Remove existing curve elements but NOT the shape slices
    const existing = svg.querySelectorAll('path, line');
    existing.forEach(el => el.remove());

    // Only draw curves if shadow player mode is off (edit mode)
    if (!shadowPlayerMode) {
      // Draw shape bezier curves
      drawControlHandles(svg, shapeLeftCurvePoints, '#10b981');
      drawControlHandles(svg, shapeRightCurvePoints, '#f59e0b');

      const shapeLeftPath = createBezierPath(shapeLeftCurvePoints, '#10b981');
      svg.appendChild(shapeLeftPath);

      const shapeRightPath = createBezierPath(shapeRightCurvePoints, '#f59e0b');
      svg.appendChild(shapeRightPath);
    }
  }

  function drawControlHandles(svg, points, color) {
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', points[0].x);
    line1.setAttribute('y1', points[0].y);
    line1.setAttribute('x2', points[1].x);
    line1.setAttribute('y2', points[1].y);
    line1.setAttribute('stroke', color);
    line1.setAttribute('stroke-width', '1');
    line1.setAttribute('stroke-dasharray', '4,4');
    line1.setAttribute('opacity', '0.4');
    line1.style.pointerEvents = 'none'; // Don't block marker clicks
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
    line2.style.pointerEvents = 'none'; // Don't block marker clicks
    svg.appendChild(line2);
  }

  function createBezierPath(points, color) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${points[0].x},${points[0].y} C ${points[1].x},${points[1].y} ${points[2].x},${points[2].y} ${points[3].x},${points[3].y}`;

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('opacity', '0.6');
    path.style.pointerEvents = 'none'; // Don't block marker clicks

    return path;
  }

  function drawSliceOutlines(svg) {
    for (let i = 0; i < numSlices; i++) {
      const corners = getSliceCorners(i);

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('fill', 'none');
      polygon.setAttribute('stroke', 'rgba(100, 100, 100, 0.2)');
      polygon.setAttribute('stroke-width', '1');
      polygon.style.pointerEvents = 'none'; // Don't block marker clicks

      const points = `${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`;
      polygon.setAttribute('points', points);

      svg.appendChild(polygon);
    }
  }

  function generateShapePoints() {
    // Use shared shadow renderer
    shapeGeneratedPoints = window.ShadowRenderer.generateShapePoints(
      shapeLeftCurvePoints,
      shapeRightCurvePoints,
      10
    );
  }

  // Color interpolation functions moved to shared shadow-renderer.js
  function interpolateColors(color1, color2, t) {
    return window.ShadowRenderer.interpolateColors(color1, color2, t);
  }

  function getInterpolatedColor(index) {
    return window.ShadowRenderer.getInterpolatedColor(index, shapePointColors);
  }

  function drawSVGShape() {
    const svg = document.getElementById('shape-svg');
    if (!svg) return;

    // Use shared shadow renderer
    window.ShadowRenderer.drawSVGShape(
      svg,
      shapeGeneratedPoints,
      shapePointColors,
      shadowBlurEnabled,
      shadowBlurAmount
    );

    // Add drag listener to polygon
    const polygon = svg.querySelector('.shape-slice');
    if (polygon) {
      polygon.style.cursor = 'move';
      polygon.addEventListener('mousedown', startShadowWholeDrag);
    }

    // Draw point markers AFTER shapes so they're on top
    drawShapePointMarkers();
  }

  function drawShapePointMarkers() {
    if (!shapeOverlay) return;

    // Remove existing markers (now HTML divs, not SVG)
    const existingMarkers = shapeOverlay.querySelectorAll('.shape-point-marker');
    existingMarkers.forEach(marker => marker.remove());

    const numPointsPerCurve = 10;

    // Get left and right points separately
    const leftPoints = shapeGeneratedPoints.slice(0, numPointsPerCurve);
    const rightPoints = shapeGeneratedPoints.slice(numPointsPerCurve, numPointsPerCurve * 2).reverse();

    // Create markers for each pair of points (representing slices)
    for (let i = 0; i < numPointsPerCurve; i++) {
      const leftPoint = leftPoints[i];
      const rightPoint = rightPoints[i];

      const sliceIndex = Math.min(i, 8); // Max slice index is 8 (9 slices total)
      const isSelected = selectedShapePoint === i;
      const fillColor = getInterpolatedColor(sliceIndex);

      // Check if markers should be visible based on player mode
      const markerDisplay = shadowPlayerMode ? 'none' : 'block';

      // Left marker (HTML div)
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

      // Right marker (HTML div)
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
    const colorInput = document.getElementById('shape-point-color-picker');
    const alphaInput = document.getElementById('shape-point-alpha-picker');
    const opacityValue = document.getElementById('opacity-value');

    if (colorInput && selectedShapePoint !== null) {
      // Map point index to slice index
      const sliceIndex = Math.min(selectedShapePoint, 8);
      // Get the actual color (either set or interpolated)
      const color = getInterpolatedColor(sliceIndex);
      const parsed = parseColor(color);

      // Set color picker (hex value)
      const hexColor = `#${parsed.r.toString(16).padStart(2, '0')}${parsed.g.toString(16).padStart(2, '0')}${parsed.b.toString(16).padStart(2, '0')}`;
      colorInput.value = hexColor;

      // Set alpha slider
      if (alphaInput) {
        alphaInput.value = parsed.a;
      }
      if (opacityValue) {
        opacityValue.textContent = `${Math.round(parsed.a * 100)}%`;
      }
    }
  }

  function setShapePointColor(hexColor, alpha = 1) {
    if (selectedShapePoint !== null) {
      // Map point index to slice index
      // Points 0-8 map to slices 0-8
      // Point 9 (last point) also maps to slice 8
      const sliceIndex = Math.min(selectedShapePoint, 8);

      // Convert hex to rgba
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      shapePointColors[sliceIndex] = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      drawSVGShape();
    }
  }

  function calculateSlicePoints() {
    slicePoints = [];

    // Apply scale to bezier control points before calculating slice points
    // Calculate the actual center of all control points
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
        scaledLeftPoints[0].x,
        scaledLeftPoints[1].x,
        scaledLeftPoints[2].x,
        scaledLeftPoints[3].x,
        t
      );
      const leftY = cubicBezier(
        scaledLeftPoints[0].y,
        scaledLeftPoints[1].y,
        scaledLeftPoints[2].y,
        scaledLeftPoints[3].y,
        t
      );

      const rightX = cubicBezier(
        scaledRightPoints[0].x,
        scaledRightPoints[1].x,
        scaledRightPoints[2].x,
        scaledRightPoints[3].x,
        t
      );
      const rightY = cubicBezier(
        scaledRightPoints[0].y,
        scaledRightPoints[1].y,
        scaledRightPoints[2].y,
        scaledRightPoints[3].y,
        t
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

  function startDrag(e) {
    // Don't allow dragging while playing
    if (isPlaying) return;

    // Don't allow dragging paper controls in paper player mode
    const side = e.target.dataset.side;
    if ((side === 'left' || side === 'right') && paperPlayerMode) return;

    // Don't allow dragging shadow controls in shadow player mode
    if ((side === 'shape-left' || side === 'shape-right') && shadowPlayerMode) return;

    e.preventDefault();

    dragging = {
      type: 'controlPoint',
      side: e.target.dataset.side,
      index: parseInt(e.target.dataset.index),
    };
  }

  function startWholeDrag(e) {
    if (isPlaying || paperPlayerMode) return; // Don't allow dragging while playing or in paper player mode
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
    if (isPlaying || shadowPlayerMode) return; // Don't allow dragging while playing or in shadow player mode
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling

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

    // Capture dragging state to avoid race conditions
    const currentDrag = {
      type: dragging.type,
      side: dragging.side,
      index: dragging.index,
      startX: dragging.startX,
      startY: dragging.startY,
      initialLeftPoints: dragging.initialLeftPoints,
      initialRightPoints: dragging.initialRightPoints
    };

    if (currentDrag.type === 'controlPoint') {
      // Get the correct overlay based on which control point is being dragged
      const currentOverlay = (currentDrag.side === 'shape-left' || currentDrag.side === 'shape-right')
        ? shapeOverlay
        : overlay;

      if (!currentOverlay) return;

      const rect = currentOverlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let points;
      if (currentDrag.side === 'left') points = leftCurvePoints;
      else if (currentDrag.side === 'right') points = rightCurvePoints;
      else if (currentDrag.side === 'shape-left') points = shapeLeftCurvePoints;
      else if (currentDrag.side === 'shape-right') points = shapeRightCurvePoints;

      if (!points) return;

      points[currentDrag.index].x = x;
      points[currentDrag.index].y = y;

      if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
          // Update paper control points
          if (currentDrag.side === 'left' || currentDrag.side === 'right') {
            updateControlPointPositions();
            calculateSlicePoints();
            drawCurves();
            updateAllTransforms();
          }

          // Update shape control points
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
      const deltaX = e.clientX - currentDrag.startX;
      const deltaY = e.clientY - currentDrag.startY;

      // Update all control points - overlay stays in same position
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

      // Update all shadow control points
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
    for (let i = 0; i < numSlices; i++) {
      updateSliceTransform(i);
    }
  }

  function updateSliceTransform(sliceIndex) {
    const sliceElement = document.querySelector(`.paper-slice-${sliceIndex}`);
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

    // Apply global offsets to destination corners
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
      0,    0,    1, 0,
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

  function togglePaperTransparency(isTransparent) {
    // Find all paper slice content divs (the inner div with background-color)
    const slices = document.querySelectorAll('.paper-slice > div');

    slices.forEach(slice => {
      if (isTransparent) {
        slice.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
      } else {
        slice.style.backgroundColor = 'white';
      }
    });
  }

  function exportAnimation() {
    const data = {
      version: 2, // Increment version for shadow timeline support
      timePerKeyframe: timePerKeyframe,
      playbackFPS: playbackFPS,
      keyframes: keyframes,
      scaleKeyframes: scaleKeyframes,
      shadowKeyframes: shadowKeyframes,
      offsetX: offsetX,
      offsetY: offsetY,
    };

    // Debug: Check which keyframes have isRectangle flag
    const rectangleKeyframes = keyframes
      .map((kf, i) => kf && kf.isRectangle ? i : null)
      .filter(i => i !== null);
    console.log('[Export] Keyframes with isRectangle flag:', rectangleKeyframes);
    console.log('[Export] Total keyframes:', keyframes.filter(kf => kf !== null).length);
    console.log('[Export] Total shadow keyframes:', shadowKeyframes.filter(kf => kf !== null).length);

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
      // try {
        const data = JSON.parse(event.target.result);

        // Restore settings
        if (data.timePerKeyframe !== undefined) {
          timePerKeyframe = data.timePerKeyframe;
          const input = document.getElementById('time-per-keyframe');
          if (input) input.value = timePerKeyframe;
        }

        if (data.playbackFPS !== undefined) {
          playbackFPS = data.playbackFPS;
          const input = document.getElementById('playback-fps');
          if (input) input.value = playbackFPS;
        }

        // Restore keyframes
        if (data.keyframes) {
          keyframes = data.keyframes;
        }

        // Restore scale keyframes
        if (data.scaleKeyframes) {
          scaleKeyframes = data.scaleKeyframes;
        } else {
          // For backward compatibility, initialize empty scale timeline
          scaleKeyframes = Array(totalKeyframes).fill(null);
        }

        // Restore shadow keyframes
        if (data.shadowKeyframes) {
          shadowKeyframes = data.shadowKeyframes;
        } else {
          // For backward compatibility, initialize empty shadow timeline
          shadowKeyframes = Array(totalKeyframes).fill(null);
        }

        // Restore offsets
        if (data.offsetX !== undefined) {
          offsetX = data.offsetX;
          const input = document.getElementById('offset-x-input');
          if (input) input.value = offsetX;
        }

        if (data.offsetY !== undefined) {
          offsetY = data.offsetY;
          const input = document.getElementById('offset-y-input');
          if (input) input.value = offsetY;
        }

        // Reset to first keyframe and update display
        currentKeyframe = 0;
        currentScaleKeyframe = 0;
        currentShadowKeyframe = 0;
        if (keyframes[0] && overlay) {
          loadKeyframe(0);
        }
        if (shadowKeyframes[0]) {
          loadShadowKeyframe(0);
        }
        if (timelineContainer) {
          updateTimelineUI();
        }

        // Clear file input so the same file can be imported again
        if (e.target) {
          e.target.value = '';
        }
      // } catch (error) {
      //   alert('Error importing animation: ' + error.message);
      // }
    };
    reader.readAsText(file);
  }

  function togglePaperPlayerMode() {
    if (paperPlayerMode) {
      // Hide paper overlay (control points and bezier curves)
      if (overlay) {
        overlay.style.display = 'none';
      }
      // Change cursor on slices
      for (let i = 0; i < numSlices; i++) {
        const slice = document.querySelector(`.paper-slice-${i}`);
        if (slice) {
          slice.style.cursor = 'default';
        }
      }
    } else {
      // Show paper overlay (control points and bezier curves)
      if (overlay) {
        overlay.style.display = 'block';
      }
      // Re-enable move cursor on slices
      for (let i = 0; i < numSlices; i++) {
        const slice = document.querySelector(`.paper-slice-${i}`);
        if (slice) {
          slice.style.cursor = 'move';
        }
      }
    }
  }

  function applyShadowBlur() {
    const svg = document.getElementById('shape-svg');
    if (!svg) return;

    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
    }

    // Remove existing blur filter
    const existingFilter = defs.querySelector('#shadow-blur-filter');
    if (existingFilter) {
      existingFilter.remove();
    }

    if (shadowBlurEnabled && shadowBlurAmount > 0) {
      // Create blur filter with extended region to allow blur beyond bounds
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'shadow-blur-filter');

      // Extend filter region beyond shape bounds (50% in each direction)
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');

      const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      blur.setAttribute('in', 'SourceGraphic');
      blur.setAttribute('stdDeviation', shadowBlurAmount);

      filter.appendChild(blur);
      defs.appendChild(filter);

      // Apply filter to all shape slices
      const slices = svg.querySelectorAll('.shape-slice');
      slices.forEach(slice => {
        slice.setAttribute('filter', 'url(#shadow-blur-filter)');
      });
    } else {
      // Remove filter from all shape slices
      const slices = svg.querySelectorAll('.shape-slice');
      slices.forEach(slice => {
        slice.removeAttribute('filter');
      });
    }
  }

  function toggleShadowPlayerMode() {
    if (shadowPlayerMode) {
      // Hide shape control points, curves, and point markers
      if (shapeOverlay) {
        const shapeControlPoints = shapeOverlay.querySelectorAll('[data-side^="shape-"]');
        shapeControlPoints.forEach(point => {
          point.style.display = 'none';
        });
        const shapePointMarkers = shapeOverlay.querySelectorAll('.shape-point-marker');
        shapePointMarkers.forEach(marker => {
          marker.style.display = 'none';
        });
        const shapeSvg = document.getElementById('shape-svg');
        if (shapeSvg) {
          const curves = shapeSvg.querySelectorAll('path, line');
          curves.forEach(curve => {
            curve.style.display = 'none';
          });
          // Disable dragging on shape slices
          const shapeSlices = shapeSvg.querySelectorAll('.shape-slice');
          shapeSlices.forEach(slice => {
            slice.style.cursor = 'default';
          });
        }
      }
    } else {
      // Show shape control points, curves, and point markers
      if (shapeOverlay) {
        const shapeControlPoints = shapeOverlay.querySelectorAll('[data-side^="shape-"]');
        shapeControlPoints.forEach(point => {
          point.style.display = 'block';
        });
        const shapePointMarkers = shapeOverlay.querySelectorAll('.shape-point-marker');
        shapePointMarkers.forEach(marker => {
          marker.style.display = 'block';
        });
        const shapeSvg = document.getElementById('shape-svg');
        if (shapeSvg) {
          const curves = shapeSvg.querySelectorAll('path, line');
          curves.forEach(curve => {
            curve.style.display = 'block';
          });
          // Enable dragging on shape slices
          const shapeSlices = shapeSvg.querySelectorAll('.shape-slice');
          shapeSlices.forEach(slice => {
            slice.style.cursor = 'move';
          });
        }
      }
    }
  }

  // Expose init function globally for manual initialization
  window.PaperPositionTool = {
    init: init
  };

  // Auto-initialize only if paper element exists
  function autoInit() {
    if (document.querySelector('.paper-element')) {
      init();
    }
  }

  // Add global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Spacebar - toggle play/pause
    if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      togglePlay();
    }

    // Ctrl+Shift+R (or Cmd+Shift+R on Mac) - start playing
    if (e.code === 'KeyR' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      if (!isPlaying) {
        startAnimation();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
