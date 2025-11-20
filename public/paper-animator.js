// Paper animator - loads animations and applies them to paper elements
(function () {
  const numSlices = 10;
  const numLines = numSlices + 1;
  let animations = [];
  let paperAnimators = [];
  let isPaused = false;

  async function init() {
    // Load the manifest of available animations
    try {
      const response = await fetch('/animation-data/manifest.json');
      const manifest = await response.json();

      // Load all animation files
      const animationPromises = manifest.files.map(filename =>
        fetch(`/animation-data/${filename}`).then(r => r.json()),
      );

      animations = await Promise.all(animationPromises);

      // Initialize existing paper elements
      initializePaperElements();

      // Watch for new paper elements being added to the DOM
      setupMutationObserver();

      // Add keyboard listener for pause/resume
      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
          e.preventDefault();
          togglePause();
        }
      });

      // Create offset control UI
      createOffsetControlUI();
    } catch (error) {
      console.error('Failed to load animations:', error);
    }
  }

  function initializePaperElements() {
    // Find all paper elements and assign animations
    const paperElements = document.querySelectorAll('.paper-element');
    const newElements = [];

    paperElements.forEach(paperElement => {
      // Skip if already initialized
      if (paperElement.hasAttribute('data-animator-initialized')) {
        return;
      }

      const animationIndex = paperAnimators.length % animations.length;
      const randomAnimation = animations[animationIndex];
      if (randomAnimation) {
        const animator = new PaperAnimator(paperElement, randomAnimation);
        paperAnimators.push(animator);
        paperElement.setAttribute('data-animator-initialized', 'true');
        newElements.push(animator);
      }
    });

    // Start animations with stagger
    newElements.forEach((animator, index) => {
      const delay = index * 0;
      setTimeout(() => {
        animator.start();
      }, delay);
    });

    // Update control UI if it exists
    const controlUI = document.querySelector('[data-animation-controls]');
    if (controlUI) {
      controlUI.remove();
      createOffsetControlUI();
    }
  }

  function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      let hasNewPaperElements = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a paper element or contains paper elements
            if (node.classList && node.classList.contains('paper-element')) {
              hasNewPaperElements = true;
            } else if (node.querySelectorAll) {
              const paperElements = node.querySelectorAll('.paper-element');
              if (paperElements.length > 0) {
                hasNewPaperElements = true;
              }
            }
          }
        });
      });

      if (hasNewPaperElements) {
        initializePaperElements();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function togglePause() {
    isPaused = !isPaused;
    paperAnimators.forEach(animator => {
      if (isPaused) {
        animator.pause();
      } else {
        animator.resume();
      }
    });
    console.log(isPaused ? 'Animations paused' : 'Animations resumed');
  }

  function createOffsetControlUI() {
    // Create container
    const container = document.createElement('div');
    container.setAttribute('data-animation-controls', 'true');
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      padding: 12px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      max-width: 300px;
      max-height: 90vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
    `;

    // Header with title and global restart button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Animation Offsets';
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    `;

    const globalRestartButton = document.createElement('button');
    globalRestartButton.textContent = '↻ Restart All';
    globalRestartButton.style.cssText = `
      padding: 4px 8px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
    `;
    globalRestartButton.onclick = () => {
      paperAnimators.forEach(animator => {
        animator.stop();
        animator.currentFrame = 0;
        animator.start();
      });
    };

    header.appendChild(title);
    header.appendChild(globalRestartButton);
    container.appendChild(header);

    // Create controls for each animator
    paperAnimators.forEach((animator, index) => {
      const animationControl = document.createElement('div');
      animationControl.style.cssText = `
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
      `;

      // Animation label
      const label = document.createElement('div');
      label.textContent = `Animation ${index + 1}`;
      label.style.cssText = `
        font-weight: 500;
        margin-bottom: 6px;
        color: #374151;
      `;
      animationControl.appendChild(label);

      // Offset controls container
      const offsetControls = document.createElement('div');
      offsetControls.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
      `;

      // X offset control
      const xLabel = document.createElement('label');
      xLabel.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        color: #6b7280;
      `;
      xLabel.innerHTML = `
        X: <input type="number" value="${animator.offsetX}" min="-500" max="500" step="1"
          data-animator-index="${index}" data-offset-type="x"
          style="width: 60px; padding: 3px 5px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
      `;

      // Y offset control
      const yLabel = document.createElement('label');
      yLabel.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        color: #6b7280;
      `;
      yLabel.innerHTML = `
        Y: <input type="number" value="${animator.offsetY}" min="-500" max="500" step="1"
          data-animator-index="${index}" data-offset-type="y"
          style="width: 60px; padding: 3px 5px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 11px;">
      `;

      offsetControls.appendChild(xLabel);
      offsetControls.appendChild(yLabel);
      animationControl.appendChild(offsetControls);

      // Restart button
      const restartButton = document.createElement('button');
      restartButton.textContent = '↻ Restart';
      restartButton.style.cssText = `
        margin-top: 6px;
        padding: 4px 8px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
      `;
      restartButton.dataset.animatorIndex = index;
      restartButton.onclick = () => {
        animator.stop();
        animator.currentFrame = 0;
        animator.start();
      };
      animationControl.appendChild(restartButton);

      container.appendChild(animationControl);
    });

    // Add event listeners to all inputs
    container.addEventListener('change', e => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' &&
        target.dataset.animatorIndex !== undefined
      ) {
        const index = parseInt(target.dataset.animatorIndex);
        const animator = paperAnimators[index];

        if (animator) {
          const xInput = container.querySelector(
            `input[data-animator-index="${index}"][data-offset-type="x"]`,
          );
          const yInput = container.querySelector(
            `input[data-animator-index="${index}"][data-offset-type="y"]`,
          );

          const newOffsetX = parseFloat(xInput.value) || 0;
          const newOffsetY = parseFloat(yInput.value) || 0;

          animator.updateOffsets(newOffsetX, newOffsetY);
        }
      }
    });

    document.body.appendChild(container);
  }

  class PaperAnimator {
    constructor(paperElement, animationData) {
      this.paperElement = paperElement;
      this.animationData = animationData;
      this.currentFrame = 60;
      this.animationInterval = null;
      this.slicePoints = [];

      this.timePerKeyframe = animationData.timePerKeyframe || 0.1;
      this.playbackFPS = animationData.playbackFPS || 30;
      this.scaleKeyframes = animationData.scaleKeyframes || [];

      this.fadeInDuration = 100;

      // Transform state
      this.offsetX = animationData.offsetX || 0;
      this.offsetY = animationData.offsetY || 0;

      // Initialize scale from first scale keyframe if available
      const firstScaleKeyframe = this.scaleKeyframes.find(s => s !== null && s !== undefined);
      this.scale = firstScaleKeyframe !== undefined ? firstScaleKeyframe : 1;

      // Generate random variations for this instance
      // Rotation between -20 and 20 degrees
      this.rotationVariation = (Math.random() - 0.5) * 40; // Range: -20 to 20
      // Small translation variations (up to ±10 pixels)
      this.translateX = (Math.random() - 0.5) * 20; // Range: -10 to 10
      this.translateY = (Math.random() - 0.5) * 20; // Range: -10 to 10

      // Apply variations to keyframes
      this.keyframes = this.applyVariationsToKeyframes(
        animationData.keyframes || [],
      );

      // Total keyframes count
      this.totalKeyframes = Math.max(
        this.keyframes.length,
        this.scaleKeyframes.length,
      );
    }

    applyVariationsToKeyframes(keyframes) {
      // Find the center point from the first keyframe
      const firstKeyframe = keyframes.find(kf => kf);
      if (!firstKeyframe) return keyframes;

      // Calculate center from first keyframe's curves
      const allPoints = [
        ...firstKeyframe.leftCurve,
        ...firstKeyframe.rightCurve,
      ];
      const centerX =
        allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
      const centerY =
        allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;

      const rotationRad = (this.rotationVariation * Math.PI) / 180;

      // Apply the same rotation and translation to all keyframes
      return keyframes.map(keyframe => {
        if (!keyframe) return keyframe;

        return {
          ...keyframe,
          leftCurve: keyframe.leftCurve.map(point =>
            this.transformPoint(point, centerX, centerY, rotationRad),
          ),
          rightCurve: keyframe.rightCurve.map(point =>
            this.transformPoint(point, centerX, centerY, rotationRad),
          ),
        };
      });
    }

    transformPoint(point, centerX, centerY, rotationRad) {
      // Translate to origin
      const translatedX = point.x - centerX;
      const translatedY = point.y - centerY;

      // Rotate
      const rotatedX =
        translatedX * Math.cos(rotationRad) -
        translatedY * Math.sin(rotationRad);
      const rotatedY =
        translatedX * Math.sin(rotationRad) +
        translatedY * Math.cos(rotationRad);

      // Translate back and apply small translation variation
      return {
        x: rotatedX + centerX + this.translateX,
        y: rotatedY + centerY + this.translateY,
      };
    }

    start() {
      // Apply fade-in effect if configured
      if (this.fadeInDuration > 0) {
        this.applyFadeIn();
      }

      // Render the initial frame immediately with correct scale
      const initialKeyframePosition = (this.currentFrame / this.playbackFPS) / this.timePerKeyframe;
      this.applyInterpolatedFrame(initialKeyframePosition);

      const frameTime = 1000 / this.playbackFPS;

      this.animationInterval = setInterval(() => {
        const currentTime = this.currentFrame / this.playbackFPS;
        const keyframePosition = currentTime / this.timePerKeyframe;

        // Find the last keyframe with data
        let lastKeyframeIndex = -1;
        for (let i = this.keyframes.length - 1; i >= 0; i--) {
          if (this.keyframes[i]) {
            lastKeyframeIndex = i;
            break;
          }
        }

        const totalAnimationTime =
          lastKeyframeIndex >= 0
            ? (lastKeyframeIndex + 1) * this.timePerKeyframe
            : 0;

        // Stop animation when it reaches the end
        if (totalAnimationTime > 0 && currentTime >= totalAnimationTime) {
          this.stop();
        } else {
          this.applyInterpolatedFrame(keyframePosition);
          this.currentFrame++;
        }
      }, frameTime);
    }

    stop() {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
      }
    }

    pause() {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
      }
    }

    resume() {
      if (!this.animationInterval) {
        this.start();
      }
    }

    updateOffsets(offsetX, offsetY) {
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      // Immediately update all transforms with new offsets
      this.updateAllTransforms();
    }

    applyFadeIn() {
      // Trigger fade-in after a small delay to ensure transition is applied
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.paperElement.style.transform = 'none';
        });
      });
    }

    applyInterpolatedFrame(keyframePosition) {
      const lowerIndex = Math.floor(keyframePosition);
      const upperIndex = Math.ceil(keyframePosition);

      let lowerKeyframeIndex = this.findPreviousKeyframe(lowerIndex);
      let upperKeyframeIndex = this.findNextKeyframe(upperIndex);

      if (lowerKeyframeIndex === null || upperKeyframeIndex === null) {
        return;
      }

      const lowerKf = this.keyframes[lowerKeyframeIndex];
      const upperKf = this.keyframes[upperKeyframeIndex];

      let t;
      if (lowerKeyframeIndex === upperKeyframeIndex) {
        t = 0;
      } else {
        t =
          (keyframePosition - lowerKeyframeIndex) /
          (upperKeyframeIndex - lowerKeyframeIndex);
        t = Math.max(0, Math.min(1, t));
      }

      // Interpolate control points
      const leftCurvePoints = [];
      const rightCurvePoints = [];

      for (let i = 0; i < 4; i++) {
        leftCurvePoints.push({
          x: this.lerp(lowerKf.leftCurve[i].x, upperKf.leftCurve[i].x, t),
          y: this.lerp(lowerKf.leftCurve[i].y, upperKf.leftCurve[i].y, t),
        });

        rightCurvePoints.push({
          x: this.lerp(lowerKf.rightCurve[i].x, upperKf.rightCurve[i].x, t),
          y: this.lerp(lowerKf.rightCurve[i].y, upperKf.rightCurve[i].y, t),
        });
      }

      // Calculate slice points from bezier curves
      this.calculateSlicePoints(leftCurvePoints, rightCurvePoints);

      // Interpolate scale from scale timeline
      this.scale = 1;
      let lowerScaleIndex = this.findPreviousScaleKeyframe(lowerIndex);
      let upperScaleIndex = this.findNextScaleKeyframe(upperIndex);

      if (lowerScaleIndex !== null && upperScaleIndex !== null) {
        const lowerScale = this.scaleKeyframes[lowerScaleIndex];
        const upperScale = this.scaleKeyframes[upperScaleIndex];

        let scaleT;
        if (lowerScaleIndex === upperScaleIndex) {
          scaleT = 0;
        } else {
          scaleT =
            (keyframePosition - lowerScaleIndex) /
            (upperScaleIndex - lowerScaleIndex);
          scaleT = Math.max(0, Math.min(1, scaleT));
        }

        this.scale = this.lerp(lowerScale, upperScale, scaleT);
      }

      // Apply transforms to all slices
      this.updateAllTransforms();
    }

    calculateSlicePoints(leftCurvePoints, rightCurvePoints) {
      this.slicePoints = [];

      // Apply scale to bezier control points before calculating slice points
      // Calculate the actual center of all control points
      const allPoints = [...leftCurvePoints, ...rightCurvePoints];
      const centerX =
        allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
      const centerY =
        allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;

      const scaledLeftPoints = leftCurvePoints.map(p => ({
        x: centerX + (p.x - centerX) * this.scale,
        y: centerY + (p.y - centerY) * this.scale,
      }));

      const scaledRightPoints = rightCurvePoints.map(p => ({
        x: centerX + (p.x - centerX) * this.scale,
        y: centerY + (p.y - centerY) * this.scale,
      }));

      for (let i = 0; i < numLines; i++) {
        const t = i / numSlices;

        const leftX = this.cubicBezier(
          scaledLeftPoints[0].x,
          scaledLeftPoints[1].x,
          scaledLeftPoints[2].x,
          scaledLeftPoints[3].x,
          t,
        );
        const leftY = this.cubicBezier(
          scaledLeftPoints[0].y,
          scaledLeftPoints[1].y,
          scaledLeftPoints[2].y,
          scaledLeftPoints[3].y,
          t,
        );

        const rightX = this.cubicBezier(
          scaledRightPoints[0].x,
          scaledRightPoints[1].x,
          scaledRightPoints[2].x,
          scaledRightPoints[3].x,
          t,
        );
        const rightY = this.cubicBezier(
          scaledRightPoints[0].y,
          scaledRightPoints[1].y,
          scaledRightPoints[2].y,
          scaledRightPoints[3].y,
          t,
        );

        this.slicePoints.push({
          left: { x: leftX, y: leftY },
          right: { x: rightX, y: rightY },
        });
      }
    }

    updateAllTransforms() {
      for (let i = 0; i < numSlices; i++) {
        this.updateSliceTransform(i);
      }
    }

    updateSliceTransform(sliceIndex) {
      const sliceElement = this.paperElement.querySelector(
        `.paper-slice-${sliceIndex}`,
      );
      if (!sliceElement) return;

      const corners = this.getSliceCorners(sliceIndex);

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
        { x: corners.tl.x + this.offsetX, y: corners.tl.y + this.offsetY },
        { x: corners.tr.x + this.offsetX, y: corners.tr.y + this.offsetY },
        { x: corners.bl.x + this.offsetX, y: corners.bl.y + this.offsetY },
        { x: corners.br.x + this.offsetX, y: corners.br.y + this.offsetY },
      ];

      const matrix = this.getPerspectiveTransform(src, dst);

      sliceElement.style.transform = `matrix3d(${matrix.join(',')})`;
      sliceElement.style.transformOrigin = '0 0';
    }

    getSliceCorners(sliceIndex) {
      const topLine = this.slicePoints[sliceIndex];
      const bottomLine = this.slicePoints[sliceIndex + 1];

      return {
        tl: topLine.left,
        tr: topLine.right,
        bl: bottomLine.left,
        br: bottomLine.right,
      };
    }

    lerp(a, b, t) {
      return a + (b - a) * t;
    }

    cubicBezier(p0, p1, p2, p3, t) {
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;

      return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
    }

    findNextKeyframe(startIndex) {
      for (let i = startIndex; i < this.keyframes.length; i++) {
        if (this.keyframes[i]) return i;
      }
      for (let i = 0; i < startIndex; i++) {
        if (this.keyframes[i]) return i;
      }
      return null;
    }

    findPreviousKeyframe(startIndex) {
      for (let i = startIndex; i >= 0; i--) {
        if (this.keyframes[i]) return i;
      }
      for (let i = this.keyframes.length - 1; i > startIndex; i--) {
        if (this.keyframes[i]) return i;
      }
      return null;
    }

    findNextScaleKeyframe(startIndex) {
      for (let i = startIndex; i < this.scaleKeyframes.length; i++) {
        if (
          this.scaleKeyframes[i] !== null &&
          this.scaleKeyframes[i] !== undefined
        )
          return i;
      }
      for (let i = 0; i < startIndex; i++) {
        if (
          this.scaleKeyframes[i] !== null &&
          this.scaleKeyframes[i] !== undefined
        )
          return i;
      }
      return null;
    }

    findPreviousScaleKeyframe(startIndex) {
      for (let i = startIndex; i >= 0; i--) {
        if (
          this.scaleKeyframes[i] !== null &&
          this.scaleKeyframes[i] !== undefined
        )
          return i;
      }
      for (let i = this.scaleKeyframes.length - 1; i > startIndex; i--) {
        if (
          this.scaleKeyframes[i] !== null &&
          this.scaleKeyframes[i] !== undefined
        )
          return i;
      }
      return null;
    }

    getPerspectiveTransform(src, dst) {
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

      const h = this.gaussianElimination(A, b);
      h.push(1);

      return [
        h[0],
        h[3],
        0,
        h[6],
        h[1],
        h[4],
        0,
        h[7],
        0,
        0,
        1,
        0,
        h[2],
        h[5],
        0,
        h[8],
      ];
    }

    gaussianElimination(A, b) {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
