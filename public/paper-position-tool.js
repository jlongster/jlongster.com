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
  let flip = false;           // Flip (rotate 180deg)
  let scale = 1;              // Scale factor

  // Animation state
  let keyframes = Array(totalKeyframes).fill(null);
  let currentKeyframe = 0;
  let currentPlaybackFrame = 0; // Current frame in playback (can be fractional for interpolation)
  let isPlaying = false;
  let animationInterval = null;
  let playerMode = false; // Toggle to hide controls and show only animation

  // UI elements
  let timelineContainer = null;
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
    // Main timeline container
    timelineContainer = document.createElement('div');
    timelineContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      min-width: 800px;
    `;

    // Controls row
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    `;

    // Play button
    playButton = document.createElement('button');
    playButton.textContent = '▶ Play';
    playButton.style.cssText = `
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    playButton.onclick = togglePlay;

    // Save keyframe button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Keyframe';
    saveButton.style.cssText = `
      padding: 8px 16px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    saveButton.onclick = saveCurrentKeyframe;

    // Clear keyframe button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Keyframe';
    clearButton.style.cssText = `
      padding: 8px 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    clearButton.onclick = clearCurrentKeyframe;

    // Export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export';
    exportButton.style.cssText = `
      padding: 8px 16px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    exportButton.onclick = exportAnimation;

    // Import button
    const importButton = document.createElement('button');
    importButton.textContent = 'Import';
    importButton.style.cssText = `
      padding: 8px 16px;
      background: #06b6d4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
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
    transparencyBtn.textContent = 'Paper: Opaque';
    transparencyBtn.style.cssText = `
      padding: 8px 16px;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    transparencyBtn.onclick = () => {
      isTransparent = !isTransparent;
      togglePaperTransparency(isTransparent);
      transparencyBtn.textContent = isTransparent ? 'Paper: Transparent' : 'Paper: Opaque';
      transparencyBtn.style.background = isTransparent ? '#ef4444' : '#6b7280';
    };

    // Player mode toggle button
    const playerModeBtn = document.createElement('button');
    playerModeBtn.textContent = 'Editor Mode';
    playerModeBtn.style.cssText = `
      padding: 8px 16px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    `;
    playerModeBtn.onclick = () => {
      playerMode = !playerMode;
      togglePlayerMode();
      playerModeBtn.textContent = playerMode ? 'Player Mode' : 'Editor Mode';
      playerModeBtn.style.background = playerMode ? '#10b981' : '#8b5cf6';
    };

    // Time per keyframe input
    const timePerKeyframeLabel = document.createElement('label');
    timePerKeyframeLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #374151;
    `;
    timePerKeyframeLabel.innerHTML = `
      Time/Keyframe (s):
      <input type="number" id="time-per-keyframe" value="${timePerKeyframe}" min="0.01" max="10" step="0.1"
        style="width: 60px; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px;">
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
      gap: 4px;
      font-size: 14px;
      color: #374151;
    `;
    playbackFPSLabel.innerHTML = `
      Playback FPS:
      <input type="number" id="playback-fps" value="${playbackFPS}" min="0.01" max="120" step="0.1"
        style="width: 60px; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px;">
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

    // Flip checkbox
    const flipLabel = document.createElement('label');
    flipLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #374151;
    `;
    flipLabel.innerHTML = `
      <input type="checkbox" id="flip-checkbox" ${flip ? 'checked' : ''}
        style="cursor: pointer;">
      Flip
    `;
    const flipCheckbox = flipLabel.querySelector('#flip-checkbox');
    flipCheckbox.addEventListener('change', (e) => {
      flip = e.target.checked;
      applyTransform();
    });

    // Scale input
    const scaleLabel = document.createElement('label');
    scaleLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #374151;
    `;
    scaleLabel.innerHTML = `
      Scale:
      <input type="number" id="scale-input" value="${scale}" min="0.1" max="5" step="0.1"
        style="width: 60px; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px;">
    `;
    const scaleInput = scaleLabel.querySelector('#scale-input');
    scaleInput.addEventListener('change', (e) => {
      scale = parseFloat(e.target.value);
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
    `;
    timeDisplay.textContent = `Time: 0.00s / 0.00s`;

    // Current frame display
    const frameDisplay = document.createElement('span');
    frameDisplay.id = 'frame-display';
    frameDisplay.style.cssText = `
      font-weight: 500;
      color: #374151;
    `;
    frameDisplay.textContent = `Keyframe: ${currentKeyframe + 1} of ${totalKeyframes}`;

    controls.appendChild(playButton);
    controls.appendChild(saveButton);
    controls.appendChild(clearButton);
    controls.appendChild(exportButton);
    controls.appendChild(importButton);
    controls.appendChild(transparencyBtn);
    controls.appendChild(playerModeBtn);
    controls.appendChild(timePerKeyframeLabel);
    controls.appendChild(playbackFPSLabel);
    controls.appendChild(flipLabel);
    controls.appendChild(scaleLabel);
    controls.appendChild(timeDisplay);
    controls.appendChild(frameDisplay);

    // Timeline track
    const timeline = document.createElement('div');
    timeline.style.cssText = `
      display: flex;
      gap: 2px;
      background: #e5e7eb;
      padding: 4px;
      border-radius: 4px;
    `;

    // Create keyframe slots
    for (let i = 0; i < totalKeyframes; i++) {
      const slot = document.createElement('div');
      slot.dataset.frame = i;
      slot.style.cssText = `
        width: 12px;
        height: 40px;
        background: #9ca3af;
        cursor: pointer;
        border-radius: 2px;
        transition: all 0.1s;
      `;
      slot.onclick = () => selectKeyframe(i);
      timeline.appendChild(slot);
    }

    timelineContainer.appendChild(controls);
    timelineContainer.appendChild(timeline);
    document.body.appendChild(timelineContainer);

    updateTimelineUI();
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

  function selectKeyframe(index) {
    if (isPlaying) return;

    currentKeyframe = index;

    // Load keyframe if it exists
    if (keyframes[index]) {
      loadKeyframe(index);
    }

    updateTimelineUI();
  }

  function saveCurrentKeyframe() {
    keyframes[currentKeyframe] = {
      leftCurve: leftCurvePoints.map(p => ({ x: p.x, y: p.y })),
      rightCurve: rightCurvePoints.map(p => ({ x: p.x, y: p.y })),
      overlayOffsetX: overlayOffsetX,
      overlayOffsetY: overlayOffsetY,
      flip: flip,
      scale: scale,
    };

    // Automatically advance to next keyframe slot
    currentKeyframe = (currentKeyframe + 1) % totalKeyframes;

    // Load the next keyframe if it exists, otherwise keep current state
    if (keyframes[currentKeyframe]) {
      loadKeyframe(currentKeyframe);
    }

    updateTimelineUI();
  }

  function clearCurrentKeyframe() {
    // Shift all keyframes after the current one down by one slot
    for (let i = currentKeyframe; i < totalKeyframes - 1; i++) {
      keyframes[i] = keyframes[i + 1];
    }
    // Clear the last slot
    keyframes[totalKeyframes - 1] = null;

    // Load the keyframe at the current position (which is now the one that was after it)
    if (keyframes[currentKeyframe]) {
      loadKeyframe(currentKeyframe);
    }

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

    // Restore overlay offset
    if (kf.overlayOffsetX !== undefined && kf.overlayOffsetY !== undefined) {
      overlayOffsetX = kf.overlayOffsetX;
      overlayOffsetY = kf.overlayOffsetY;
      const rect = paperElement.getBoundingClientRect();
      overlay.style.left = (rect.left + overlayOffsetX) + 'px';
      overlay.style.top = (rect.top + overlayOffsetY) + 'px';
    }

    // Restore flip and scale
    if (kf.flip !== undefined) {
      flip = kf.flip;
      const flipCheckbox = document.getElementById('flip-checkbox');
      if (flipCheckbox) flipCheckbox.checked = flip;
    }
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

  // Apply flip and scale transform to paper element
  function applyTransform() {
    if (!paperElement) return;

    const rotation = flip ? 180 : 0;
    paperElement.style.transformOrigin = 'center center';
    paperElement.style.transform = `rotate(${rotation}deg) scale(${scale})`;
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

    // Interpolate scale and apply flip
    if (lowerKf.scale !== undefined && upperKf.scale !== undefined) {
      scale = lerp(lowerKf.scale, upperKf.scale, t);
    }
    if (lowerKf.flip !== undefined) {
      flip = lowerKf.flip; // Use lower keyframe's flip value (no interpolation for boolean)
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

    for (let i = 0; i < numLines; i++) {
      const t = i / numSlices;

      const leftX = cubicBezier(
        leftCurvePoints[0].x,
        leftCurvePoints[1].x,
        leftCurvePoints[2].x,
        leftCurvePoints[3].x,
        t
      );
      const leftY = cubicBezier(
        leftCurvePoints[0].y,
        leftCurvePoints[1].y,
        leftCurvePoints[2].y,
        leftCurvePoints[3].y,
        t
      );

      const rightX = cubicBezier(
        rightCurvePoints[0].x,
        rightCurvePoints[1].x,
        rightCurvePoints[2].x,
        rightCurvePoints[3].x,
        t
      );
      const rightY = cubicBezier(
        rightCurvePoints[0].y,
        rightCurvePoints[1].y,
        rightCurvePoints[2].y,
        rightCurvePoints[3].y,
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

    const dst = [corners.tl, corners.tr, corners.bl, corners.br];

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
    // Find all SVG path elements in the paper slices
    const paths = document.querySelectorAll('.paper-slice path');

    paths.forEach(path => {
      if (isTransparent) {
        path.setAttribute('fill', 'red');
        path.setAttribute('opacity', '0.5');
      } else {
        path.setAttribute('fill', 'white');
        path.setAttribute('opacity', '1');
      }
    });
  }

  function exportAnimation() {
    const data = {
      version: 1,
      timePerKeyframe: timePerKeyframe,
      playbackFPS: playbackFPS,
      keyframes: keyframes,
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

        // Reset to first keyframe and update display
        currentKeyframe = 0;
        if (keyframes[0] && overlay) {
          loadKeyframe(0);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
