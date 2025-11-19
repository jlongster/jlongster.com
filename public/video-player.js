// Video player with drag, resize, and frame-stepping controls
(function () {
  const frameStep = 1 / 20; // 0.05 seconds

  let container = null;
  let video = null;
  let isLocked = false;
  let isDragging = false;
  let isResizing = false;
  let dragStart = { x: 0, y: 0 };
  let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  function init() {
    createVideoPlayer();
  }

  function createVideoPlayer() {
    // Main container
    container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 640px;
      height: 360px;
      background: #000;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      overflow: hidden;
      z-index: 1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Video element
    video = document.createElement('video');
    video.style.cssText = `
      width: 100%;
      height: calc(100% - 60px);
      background: #000;
      display: block;
    `;
    video.controls = false;

    // Prompt user to select a video
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        video.src = URL.createObjectURL(file);
        video.load();
      }
    };
    document.body.appendChild(input);

    // Auto-trigger file selection
    setTimeout(() => input.click(), 100);

    // Controls container
    const controls = document.createElement('div');
    controls.style.cssText = `
      height: 60px;
      background: #1f2937;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      border-top: 1px solid #374151;
    `;

    // Play/Pause button
    const playBtn = createButton('▶', () => {
      if (video.paused) {
        video.play();
        playBtn.textContent = '⏸';
      } else {
        video.pause();
        playBtn.textContent = '▶';
      }
    });

    // Step backward button
    const stepBackBtn = createButton('◀◀', () => {
      video.currentTime = Math.max(0, video.currentTime - frameStep);
    });

    // Step forward button
    const stepFwdBtn = createButton('▶▶', () => {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + frameStep);
    });

    // Time display
    const timeDisplay = document.createElement('span');
    timeDisplay.style.cssText = `
      color: white;
      font-size: 12px;
      font-family: monospace;
      margin-left: 8px;
    `;
    timeDisplay.textContent = '0.00 / 0.00';

    video.addEventListener('timeupdate', () => {
      const current = video.currentTime.toFixed(2);
      const duration = (video.duration || 0).toFixed(2);
      timeDisplay.textContent = `${current} / ${duration}`;
    });

    // Lock/Unlock button
    const lockBtn = createButton('🔓 Unlock', () => {
      isLocked = !isLocked;
      lockBtn.textContent = isLocked ? '🔒 Lock' : '🔓 Unlock';
      lockBtn.style.background = isLocked ? '#ef4444' : '#10b981';
      container.style.cursor = isLocked ? 'default' : 'move';
    });
    lockBtn.style.marginLeft = 'auto';
    lockBtn.style.background = '#10b981';

    // Choose video button
    const chooseBtn = createButton('Choose Video', () => input.click());

    controls.appendChild(playBtn);
    controls.appendChild(stepBackBtn);
    controls.appendChild(stepFwdBtn);
    controls.appendChild(timeDisplay);
    controls.appendChild(chooseBtn);
    controls.appendChild(lockBtn);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 20px;
      height: 20px;
      background: #3b82f6;
      cursor: nwse-resize;
      border-radius: 0 0 6px 0;
    `;
    resizeHandle.addEventListener('mousedown', startResize);

    // Header for dragging
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 30px;
      cursor: move;
      background: rgba(59, 130, 246, 0.5);
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 12px;
      color: white;
      font-weight: 500;
      z-index: 10;
      pointer-events: all;
    `;
    header.textContent = 'Video Player - Drag to move';
    header.addEventListener('mousedown', startDrag);

    container.appendChild(header);
    container.appendChild(video);
    container.appendChild(controls);
    container.appendChild(resizeHandle);
    document.body.appendChild(container);

    // Global mouse handlers
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function createButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 6px 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function startDrag(e) {
    if (isLocked) return;
    e.preventDefault();
    isDragging = true;

    const rect = container.getBoundingClientRect();
    dragStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startResize(e) {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;

    const rect = container.getBoundingClientRect();
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    };
  }

  function onMouseMove(e) {
    if (isDragging) {
      container.style.left = (e.clientX - dragStart.x) + 'px';
      container.style.top = (e.clientY - dragStart.y) + 'px';
      container.style.transform = 'none';
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(320, resizeStart.width + deltaX);
      const newHeight = Math.max(240, resizeStart.height + deltaY);

      container.style.width = newWidth + 'px';
      container.style.height = newHeight + 'px';
    }
  }

  function onMouseUp() {
    isDragging = false;
    isResizing = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
