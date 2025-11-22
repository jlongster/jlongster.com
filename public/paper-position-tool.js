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

  // Animation state
  let keyframes = Array(totalKeyframes).fill(null);
  let scaleKeyframes = Array(totalKeyframes).fill(null); // Separate timeline for scale
  let currentKeyframe = 0;
  let currentScaleKeyframe = 0; // Current position in scale timeline
  let currentPlaybackFrame = 0; // Current frame in playback (can be fractional for interpolation)
  let isPlaying = false;
  let animationInterval = null;
  let playerMode = false; // Toggle to hide controls and show only animation

  // UI elements
  let timelineContainer = null;
  let scaleTimelineContainer = null;
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

  function init() {
    paperElement = document.querySelector('.paper-element');
    if (!paperElement) {
      console.warn('No paper element found');
      return;
    }

    // Ensure all slices are visible (disable any fade-in effects)
    const slices = paperElement.querySelectorAll('.paper-slice');
    slices.forEach(slice => {
      slice.style.opacity = '1';
    });

    createOverlay();
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

    const rect = paperElement.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlayOffsetX = 0;
    overlayOffsetY = 0;

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

    // Create control points
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

    // Controls row
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

    // Player mode toggle button
    const playerModeBtn = document.createElement('button');
    playerModeBtn.textContent = 'Editor';
    playerModeBtn.style.cssText = `
      padding: 4px 10px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    `;
    playerModeBtn.onclick = () => {
      playerMode = !playerMode;
      togglePlayerMode();
      playerModeBtn.textContent = playerMode ? 'Player' : 'Editor';
      playerModeBtn.style.background = playerMode ? '#10b981' : '#8b5cf6';
    };

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

    // Collapsed controls: only play button and frame display
    collapsedControls.appendChild(collapseButton);
    collapsedControls.appendChild(playButton);
    collapsedControls.appendChild(frameDisplay);

    // Expanded controls: everything else
    controls.appendChild(saveButton);
    controls.appendChild(clearButton);
    controls.appendChild(straightenButton);
    controls.appendChild(exportButton);
    controls.appendChild(importButton);
    controls.appendChild(transparencyBtn);
    controls.appendChild(playerModeBtn);
    controls.appendChild(timePerKeyframeLabel);
    controls.appendChild(playbackFPSLabel);
    controls.appendChild(scaleLabel);
    controls.appendChild(offsetXLabel);
    controls.appendChild(offsetYLabel);
    controls.appendChild(timeDisplay);

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

    // Create keyframe slots
    for (let i = 0; i < totalKeyframes; i++) {
      const slot = document.createElement('div');
      slot.dataset.frame = i;
      slot.style.cssText = `
        width: 10px;
        height: 24px;
        background: #9ca3af;
        cursor: pointer;
        border-radius: 2px;
        transition: all 0.1s;
      `;
      slot.onclick = () => selectKeyframe(i);
      timeline.appendChild(slot);
    }

    expandedContainer.appendChild(timeline);

    timelineContainer.appendChild(collapsedControls);
    timelineContainer.appendChild(expandedContainer);

    // Scale Timeline (in expanded container)
    const scaleTimelineLabel = document.createElement('div');
    scaleTimelineLabel.style.cssText = `
      margin-top: 8px;
      margin-bottom: 3px;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    `;
    scaleTimelineLabel.textContent = 'Scale Timeline';
    expandedContainer.appendChild(scaleTimelineLabel);

    const scaleControls = document.createElement('div');
    scaleControls.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      align-items: center;
    `;

    const saveScaleButton = document.createElement('button');
    saveScaleButton.textContent = 'Save';
    saveScaleButton.style.cssText = `
      padding: 4px 10px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    saveScaleButton.onclick = saveCurrentScaleKeyframe;

    const clearScaleButton = document.createElement('button');
    clearScaleButton.textContent = 'Clear';
    clearScaleButton.style.cssText = `
      padding: 4px 10px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    clearScaleButton.onclick = clearCurrentScaleKeyframe;

    const scaleFrameDisplay = document.createElement('span');
    scaleFrameDisplay.id = 'scale-frame-display';
    scaleFrameDisplay.style.cssText = `
      font-weight: 500;
      color: #374151;
      font-size: 11px;
    `;
    scaleFrameDisplay.textContent = `Scale KF: ${currentScaleKeyframe + 1}/${totalKeyframes}`;

    scaleControls.appendChild(saveScaleButton);
    scaleControls.appendChild(clearScaleButton);
    scaleControls.appendChild(scaleFrameDisplay);
    expandedContainer.appendChild(scaleControls);

    const scaleTimeline = document.createElement('div');
    scaleTimeline.style.cssText = `
      display: flex;
      gap: 1px;
      background: #e5e7eb;
      padding: 3px;
      border-radius: 3px;
    `;

    // Create scale keyframe slots
    for (let i = 0; i < totalKeyframes; i++) {
      const slot = document.createElement('div');
      slot.dataset.scaleFrame = i;
      slot.style.cssText = `
        width: 10px;
        height: 24px;
        background: #9ca3af;
        cursor: pointer;
        border-radius: 2px;
        transition: all 0.1s;
      `;
      slot.onclick = () => selectScaleKeyframe(i);
      scaleTimeline.appendChild(slot);
    }

    expandedContainer.appendChild(scaleTimeline);
    scaleTimelineContainer = scaleTimeline;

    document.body.appendChild(timelineContainer);

    updateTimelineUI();
    updateScaleTimelineUI();
  }

  function updateTimelineUI() {
    const slots = timelineContainer.querySelectorAll('[data-frame]');
    slots.forEach((slot, i) => {
      const isActive = i === currentKeyframe;
      const hasKeyframe = keyframes[i] !== null;

      if (isActive) {
        slot.style.background = '#3b82f6';
        slot.style.transform = 'scaleY(1.2)';
      } else if (hasKeyframe) {
        slot.style.background = '#10b981';
        slot.style.transform = 'scaleY(1)';
      } else {
        slot.style.background = '#9ca3af';
        slot.style.transform = 'scaleY(1)';
      }
    });

    const frameDisplay = document.getElementById('frame-display');
    if (frameDisplay) {
      frameDisplay.textContent = `Keyframe: ${currentKeyframe + 1} of ${totalKeyframes}`;
    }

    // Update time display
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
      // Find last keyframe with data
      let lastKeyframeIndex = -1;
      for (let i = totalKeyframes - 1; i >= 0; i--) {
        if (keyframes[i]) {
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

  function updateScaleTimelineUI() {
    const slots = scaleTimelineContainer.querySelectorAll('[data-scale-frame]');
    slots.forEach((slot, i) => {
      const isActive = i === currentScaleKeyframe;
      const hasKeyframe = scaleKeyframes[i] !== null;

      if (isActive) {
        slot.style.background = '#3b82f6';
        slot.style.transform = 'scaleY(1.2)';
      } else if (hasKeyframe) {
        slot.style.background = '#10b981';
        slot.style.transform = 'scaleY(1)';
      } else {
        slot.style.background = '#9ca3af';
        slot.style.transform = 'scaleY(1)';
      }
    });

    const scaleFrameDisplay = document.getElementById('scale-frame-display');
    if (scaleFrameDisplay) {
      scaleFrameDisplay.textContent = `Scale Keyframe: ${currentScaleKeyframe + 1} of ${totalKeyframes}`;
    }
  }

  function selectKeyframe(index) {
    if (isPlaying) return;

    currentKeyframe = index;

    // Load keyframe if it exists
    if (keyframes[index]) {
      loadKeyframe(index);
    }

    updateTimelineUI();
  }

  function selectScaleKeyframe(index) {
    if (isPlaying) return;

    currentScaleKeyframe = index;

    // Load scale keyframe if it exists
    if (scaleKeyframes[index] !== null) {
      scale = scaleKeyframes[index];
      const scaleInput = document.getElementById('scale-input');
      if (scaleInput) scaleInput.value = scale;
      calculateSlicePoints();
      drawCurves();
      updateAllTransforms();
    }

    updateScaleTimelineUI();
  }

  function saveCurrentScaleKeyframe() {
    scaleKeyframes[currentScaleKeyframe] = scale;

    // Automatically advance to next keyframe slot
    currentScaleKeyframe = (currentScaleKeyframe + 1) % totalKeyframes;

    // Load the next scale keyframe if it exists
    if (scaleKeyframes[currentScaleKeyframe] !== null) {
      scale = scaleKeyframes[currentScaleKeyframe];
      const scaleInput = document.getElementById('scale-input');
      if (scaleInput) scaleInput.value = scale;
      calculateSlicePoints();
      drawCurves();
      updateAllTransforms();
    }

    updateScaleTimelineUI();
  }

  function clearCurrentScaleKeyframe() {
    // Simply set the current scale keyframe to null (allow blank/interpolated keyframes)
    scaleKeyframes[currentScaleKeyframe] = null;

    // Advance to next scale keyframe
    currentScaleKeyframe = (currentScaleKeyframe + 1) % totalKeyframes;

    updateScaleTimelineUI();
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

    // Automatically advance to next keyframe slot
    currentKeyframe = (currentKeyframe + 1) % totalKeyframes;

    // Load the next keyframe if it exists, otherwise keep current state
    if (keyframes[currentKeyframe]) {
      loadKeyframe(currentKeyframe);
    }

    updateTimelineUI();
  }

  function clearCurrentKeyframe() {
    // Simply set the current keyframe to null (allow blank/interpolated keyframes)
    keyframes[currentKeyframe] = null;

    // Advance to next keyframe
    currentKeyframe = (currentKeyframe + 1) % totalKeyframes;

    // Load the next keyframe if it exists
    if (keyframes[currentKeyframe]) {
      loadKeyframe(currentKeyframe);
    }

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

  // Interpolate and apply a frame at a given keyframe position (can be fractional)
  function applyInterpolatedFrame(keyframePosition) {
    // Find the keyframes to interpolate between
    const lowerIndex = Math.floor(keyframePosition);
    const upperIndex = Math.ceil(keyframePosition);

    // Find actual keyframes (skip nulls)
    let lowerKeyframeIndex = findPreviousKeyframe(lowerIndex);
    let upperKeyframeIndex = findNextKeyframe(upperIndex);

    if (lowerKeyframeIndex === null || upperKeyframeIndex === null) {
      return; // No keyframes to interpolate
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

      // If we've passed the end of the animation, loop back to start
      if (totalAnimationTime > 0 && currentTime >= totalAnimationTime) {
        currentPlaybackFrame = 0;
        applyInterpolatedFrame(0);
      } else {
        // Apply interpolated frame
        applyInterpolatedFrame(keyframePosition);
        currentPlaybackFrame++;
      }

      // Update current keyframe for UI display (rounded to nearest)
      currentKeyframe = Math.round(keyframePosition) % totalKeyframes;
      currentScaleKeyframe = Math.round(keyframePosition) % totalKeyframes;
      updateTimelineUI();
      updateScaleTimelineUI();
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
    dot.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      background: ${side === 'left' ? '#ef4444' : '#3b82f6'};
      border: 2px solid white;
      border-radius: 50%;
      cursor: move;
      pointer-events: all;
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

  function drawCurves() {
    const svg = document.getElementById('tool-svg');
    if (!svg) return;

    const existing = svg.querySelectorAll('path, polygon, line');
    existing.forEach(el => el.remove());

    drawControlHandles(svg, leftCurvePoints, '#ef4444');
    drawControlHandles(svg, rightCurvePoints, '#3b82f6');

    const leftPath = createBezierPath(leftCurvePoints, '#ef4444');
    svg.appendChild(leftPath);

    const rightPath = createBezierPath(rightCurvePoints, '#3b82f6');
    svg.appendChild(rightPath);

    drawSliceOutlines(svg);
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

    return path;
  }

  function drawSliceOutlines(svg) {
    for (let i = 0; i < numSlices; i++) {
      const corners = getSliceCorners(i);

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('fill', 'none');
      polygon.setAttribute('stroke', 'rgba(100, 100, 100, 0.2)');
      polygon.setAttribute('stroke-width', '1');

      const points = `${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`;
      polygon.setAttribute('points', points);

      svg.appendChild(polygon);
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
    if (isPlaying || playerMode) return; // Don't allow dragging while playing or in player mode
    e.preventDefault();

    dragging = {
      type: 'controlPoint',
      side: e.target.dataset.side,
      index: parseInt(e.target.dataset.index),
    };
  }

  function startWholeDrag(e) {
    if (isPlaying || playerMode) return; // Don't allow dragging while playing or in player mode
    e.preventDefault();

    dragging = {
      type: 'wholeElement',
      startX: e.clientX,
      startY: e.clientY,
      initialLeftPoints: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      initialRightPoints: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
    };
  }

  function onDrag(e) {
    if (!dragging) return;

    if (dragging.type === 'controlPoint') {
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const points = dragging.side === 'left' ? leftCurvePoints : rightCurvePoints;
      points[dragging.index].x = x;
      points[dragging.index].y = y;

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
    } else if (dragging.type === 'wholeElement') {
      const deltaX = e.clientX - dragging.startX;
      const deltaY = e.clientY - dragging.startY;

      // Update all control points - overlay stays in same position
      leftCurvePoints.forEach((p, i) => {
        p.x = dragging.initialLeftPoints[i].x + deltaX;
        p.y = dragging.initialLeftPoints[i].y + deltaY;
      });

      rightCurvePoints.forEach((p, i) => {
        p.x = dragging.initialRightPoints[i].x + deltaX;
        p.y = dragging.initialRightPoints[i].y + deltaY;
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
      version: 1,
      timePerKeyframe: timePerKeyframe,
      playbackFPS: playbackFPS,
      keyframes: keyframes,
      scaleKeyframes: scaleKeyframes,
      offsetX: offsetX,
      offsetY: offsetY,
    };

    // Debug: Check which keyframes have isRectangle flag
    const rectangleKeyframes = keyframes
      .map((kf, i) => kf && kf.isRectangle ? i : null)
      .filter(i => i !== null);
    console.log('[Export] Keyframes with isRectangle flag:', rectangleKeyframes);
    console.log('[Export] Total keyframes:', keyframes.filter(kf => kf !== null).length);

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
        if (keyframes[0] && overlay) {
          loadKeyframe(0);
        }
        if (timelineContainer) {
          updateTimelineUI();
          updateScaleTimelineUI();
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

  function togglePlayerMode() {
    if (playerMode) {
      // Hide overlay (control points and bezier curves)
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
      // Show overlay (control points and bezier curves)
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
