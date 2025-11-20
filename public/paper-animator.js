// Paper animator - loads animations and applies them to paper elements
(function () {
  const numSlices = 10;
  const numLines = numSlices + 1;
  let animations = [];
  let animatorRegistry = new Map(); // id -> animator
  let isPaused = false;
  let nextId = 0;

  // Expose API for paper-renderer
  window.PaperAnimator = {
    resetAll: function() {
      console.log('[PaperAnimator] Resetting all animators');
      // Stop all animations
      animatorRegistry.forEach(animator => animator.stop());
      // Clear registry
      animatorRegistry.clear();
      nextId = 0;
    },
    unregisterAnimator: function(id) {
      console.log('[PaperAnimator] Unregistering animator:', id);
      const animator = animatorRegistry.get(id);
      if (animator) {
        animator.stop();
        animatorRegistry.delete(id);
        // Notify DevTools
        if (window.PaperDevTools) {
          window.PaperDevTools.unregisterAnimator(id);
        }
      }
    }
  };

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

      // Register with DevTools if available
      if (window.PaperDevTools) {
        window.PaperDevTools.registerAnimators(paperAnimators);
      }
    } catch (error) {
      console.error('Failed to load animations:', error);
    }
  }

  function initializePaperElements() {
    // Find all paper elements and assign animations
    const paperElements = document.querySelectorAll('.paper-element');

    paperElements.forEach((paperElement, index) => {
      // Skip if already initialized
      if (paperElement.hasAttribute('data-animator-initialized')) {
        return;
      }

      // Generate or retrieve ID for this element
      let paperId = paperElement.getAttribute('data-paper-id');
      if (!paperId) {
        paperId = `paper-${nextId++}`;
        paperElement.setAttribute('data-paper-id', paperId);
      }

      const animationIndex = animatorRegistry.size % animations.length;
      let animationData = animations[animationIndex];

      if (animationData) {
        // Check if DevTools has saved configuration for this ID
        const savedConfig = window.PaperDevTools?.getSavedConfig?.(paperId);
        if (savedConfig) {
          // Merge saved config with animation data
          animationData = { ...animationData, ...savedConfig };
          console.log('[PaperAnimator] Using saved config for', paperId, savedConfig);
        }

        // Get delay from animation data or saved config
        const delay = animationData.startDelay || 0;

        // Hide the element initially
        paperElement.style.opacity = '0';
        paperElement.style.pointerEvents = 'none';

        // Schedule mounting and initialization
        setTimeout(() => {
          // Show the element
          paperElement.style.opacity = '';
          paperElement.style.pointerEvents = '';

          // Create animator and start
          const animator = new PaperAnimator(paperElement, animationData);
          animator.id = paperId;

          // Register in our local registry
          animatorRegistry.set(paperId, animator);

          paperElement.setAttribute('data-animator-initialized', 'true');
          animator.start();

          // Register with DevTools
          if (window.PaperDevTools) {
            window.PaperDevTools.registerAnimator(paperId, animator);
          }
        }, delay);
      }
    });
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

  class PaperAnimator {
    constructor(paperElement, animationData) {
      this.paperElement = paperElement;
      this.animationData = animationData;
      this.currentFrame = 60;
      this.currentKeyframePosition = 0;
      this.animationInterval = null;
      this.slicePoints = [];

      this.timePerKeyframe = animationData.timePerKeyframe || 0.1;
      this.playbackFPS = animationData.playbackFPS || 30;
      this.scaleKeyframes = animationData.scaleKeyframes || [];

      this.fadeInDuration = 100;

      // Transform state
      this.offsetX = animationData.offsetX || 0;
      this.offsetY = animationData.offsetY || 0;
      this.rotation = animationData.rotation || 0; // Rotation in degrees

      // Timing configuration - now in keyframe indices
      this.startDelay = animationData.startDelay || 0;

      // Initialize scale from first scale keyframe if available
      const firstScaleKeyframe = this.scaleKeyframes.find(s => s !== null && s !== undefined);
      this.scale = firstScaleKeyframe !== undefined ? firstScaleKeyframe : 1;

      // Apply rotation to keyframes
      this.keyframes = this.applyRotationToKeyframes(
        animationData.keyframes || [],
      );

      // Total keyframes count
      this.totalKeyframes = Math.max(
        this.keyframes.length,
        this.scaleKeyframes.length,
      );

      // Set start/end keyframes (defaults: 0 to last keyframe with data)
      this.startKeyframe = animationData.startKeyframe !== undefined ? animationData.startKeyframe : 0;

      // Find the last keyframe with data for default end
      let lastKeyframeIndex = -1;
      for (let i = this.keyframes.length - 1; i >= 0; i--) {
        if (this.keyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }
      this.endKeyframe = animationData.endKeyframe !== undefined ? animationData.endKeyframe : lastKeyframeIndex;

      // Render the initial frame immediately to prevent flash
      this.renderInitialFrame();
    }

    applyRotationToKeyframes(keyframes) {
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

      const rotationRad = (this.rotation * Math.PI) / 180;

      // Apply rotation to all keyframes
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

      // Translate back
      return {
        x: rotatedX + centerX,
        y: rotatedY + centerY,
      };
    }

    renderInitialFrame() {
      // Render the start keyframe immediately so there's no flash
      this.applyInterpolatedFrame(this.startKeyframe);
    }

    start() {
      // Start at the start keyframe
      this.currentKeyframePosition = this.startKeyframe;

      // Apply fade-in effect if configured
      if (this.fadeInDuration > 0) {
        this.applyFadeIn();
      }

      // Render the initial keyframe immediately
      this.applyInterpolatedFrame(this.currentKeyframePosition);

      // Calculate frame time and increment per frame
      const frameTime = 1000 / this.playbackFPS;
      const keyframeIncrement = 1 / (this.timePerKeyframe * this.playbackFPS);

      this.animationInterval = setInterval(() => {
        this.currentKeyframePosition += keyframeIncrement;

        // Stop animation when it reaches the end keyframe
        if (this.currentKeyframePosition >= this.endKeyframe) {
          // Render final keyframe
          this.applyInterpolatedFrame(this.endKeyframe);
          this.stop();
        } else {
          this.applyInterpolatedFrame(this.currentKeyframePosition);
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

    updateRotation(rotation) {
      this.rotation = rotation;
      // Recalculate keyframes with new rotation
      this.keyframes = this.applyRotationToKeyframes(
        this.animationData.keyframes || [],
      );
      // Re-render current keyframe position
      this.applyInterpolatedFrame(this.currentKeyframePosition);
    }

    applyFadeIn() {
      // Set transition first
      this.paperElement.style.transition = `opacity ${this.fadeInDuration}ms ease-out`;

      // Trigger fade-in after a small delay to ensure transition is applied
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.paperElement.style.opacity = '1';
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
