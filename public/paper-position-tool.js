// Paper positioning tool - bezier curve-based positioning with keyframe animation
(function () {
  const numSlices = 10;
  const numLines = numSlices + 1; // 11 horizontal lines
  const totalKeyframes = 60;
  const fps = 10; // 10 frames per second

  let paperElement = null;
  let overlay = null;
  let leftCurvePoints = [];  // 4 control points for left bezier
  let rightCurvePoints = []; // 4 control points for right bezier
  let slicePoints = [];       // Calculated points for each slice edge
  let dragging = null;
  let updateScheduled = false;

  // Animation state
  let keyframes = Array(totalKeyframes).fill(null);
  let currentKeyframe = 0;
  let isPlaying = false;
  let animationInterval = null;

  // UI elements
  let timelineContainer = null;
  let playButton = null;

  // Initialize bezier control points
  leftCurvePoints = [
    { x: 0, y: 0, element: null },
    { x: 0, y: 66.67, element: null },
    { x: 0, y: 133.33, element: null },
    { x: 0, y: 200, element: null },
  ];

  rightCurvePoints = [
    { x: 200, y: 0, element: null },
    { x: 200, y: 66.67, element: null },
    { x: 200, y: 133.33, element: null },
    { x: 200, y: 200, element: null },
  ];

  function init() {
    paperElement = document.querySelector('.paper-element');
    if (!paperElement) {
      console.warn('No paper element found');
      return;
    }

    createOverlay();
    createTimelineUI();
    calculateSlicePoints();
    updateAllTransforms();
  }

  function createOverlay() {
    // Create overlay container
    overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      width: 200px;
      height: 200px;
      pointer-events: none;
      z-index: 1000;
      overflow: visible;
    `;

    const rect = paperElement.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';

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

    // Current frame display
    const frameDisplay = document.createElement('span');
    frameDisplay.id = 'frame-display';
    frameDisplay.style.cssText = `
      margin-left: auto;
      font-weight: 500;
      color: #374151;
    `;
    frameDisplay.textContent = `Frame: ${currentKeyframe + 1}/${totalKeyframes}`;

    controls.appendChild(playButton);
    controls.appendChild(saveButton);
    controls.appendChild(clearButton);
    controls.appendChild(transparencyBtn);
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
      frameDisplay.textContent = `Frame: ${currentKeyframe + 1}/${totalKeyframes}`;
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
    };
    updateTimelineUI();
  }

  function clearCurrentKeyframe() {
    keyframes[currentKeyframe] = null;
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

    updateControlPointPositions();
    calculateSlicePoints();
    drawCurves();
    updateAllTransforms();
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

    const frameTime = 1000 / fps; // 100ms per frame at 10fps

    animationInterval = setInterval(() => {
      currentKeyframe = (currentKeyframe + 1) % totalKeyframes;

      // Load keyframe if it exists
      if (keyframes[currentKeyframe]) {
        loadKeyframe(currentKeyframe);
      }

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
    e.preventDefault();
    if (isPlaying) return; // Don't allow dragging while playing

    dragging = {
      side: e.target.dataset.side,
      index: parseInt(e.target.dataset.index),
    };
  }

  function onDrag(e) {
    if (!dragging) return;

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

    const sliceHeight = 200 / numSlices;
    const startY = sliceIndex * sliceHeight;
    const src = [
      { x: 0, y: startY },
      { x: 200, y: startY },
      { x: 0, y: startY + sliceHeight },
      { x: 200, y: startY + sliceHeight },
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
