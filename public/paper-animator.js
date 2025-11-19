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
      console.log(`Loaded ${animations.length} animations`);

      // Find all paper elements and assign random animations
      const paperElements = document.querySelectorAll('.paper-element');
      console.log(`Found ${paperElements.length} paper elements`);
      paperElements.forEach((paperElement, index) => {
        const randomIndex = Math.floor(Math.random() * animations.length);
        const randomAnimation = animations[randomIndex];
        console.log(`Paper ${index}: assigned animation ${randomIndex}`);
        if (randomAnimation) {
          const animator = new PaperAnimator(paperElement, randomAnimation);
          paperAnimators.push(animator);
          animator.start();
        }
      });

      // Add keyboard listener for pause/resume
      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
          e.preventDefault();
          togglePause();
        }
      });
    } catch (error) {
      console.error('Failed to load animations:', error);
    }
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
      this.currentFrame = 0;
      this.animationInterval = null;
      this.slicePoints = [];

      this.timePerKeyframe = animationData.timePerKeyframe || 0.1;
      this.playbackFPS = animationData.playbackFPS || 30;
      this.keyframes = animationData.keyframes || [];

      // Fade-in configuration (in milliseconds, default to 500ms)
      this.fadeInDuration = animationData.fadeInDuration !== undefined ? animationData.fadeInDuration : 500;
    }

    start() {
      // Apply fade-in effect if configured
      if (this.fadeInDuration > 0) {
        this.applyFadeIn();
      }

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

    applyFadeIn() {
      const slices = this.paperElement.querySelectorAll('.paper-slice');

      // Set initial opacity and transition
      slices.forEach((slice, i) => {
        slice.style.transition = `opacity ${this.fadeInDuration}ms ease-out`;
      });

      // Trigger fade-in after a small delay to ensure transition is applied
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          slices.forEach((slice, i) => {
            slice.style.opacity = '1';
          });
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

      // Interpolate scale and apply flip
      let scale = 1;
      let flip = false;
      if (lowerKf.scale !== undefined && upperKf.scale !== undefined) {
        scale = this.lerp(lowerKf.scale, upperKf.scale, t);
      }
      if (lowerKf.flip !== undefined) {
        flip = lowerKf.flip;
      }

      // Apply flip and scale transform to paper element
      const rotation = flip ? 180 : 0;
      this.paperElement.style.transformOrigin = 'center center';
      this.paperElement.style.transform = `rotate(${rotation}deg) scale(${scale})`;

      // Apply transforms to all slices
      this.updateAllTransforms();
    }

    calculateSlicePoints(leftCurvePoints, rightCurvePoints) {
      this.slicePoints = [];

      for (let i = 0; i < numLines; i++) {
        const t = i / numSlices;

        const leftX = this.cubicBezier(
          leftCurvePoints[0].x,
          leftCurvePoints[1].x,
          leftCurvePoints[2].x,
          leftCurvePoints[3].x,
          t,
        );
        const leftY = this.cubicBezier(
          leftCurvePoints[0].y,
          leftCurvePoints[1].y,
          leftCurvePoints[2].y,
          leftCurvePoints[3].y,
          t,
        );

        const rightX = this.cubicBezier(
          rightCurvePoints[0].x,
          rightCurvePoints[1].x,
          rightCurvePoints[2].x,
          rightCurvePoints[3].x,
          t,
        );
        const rightY = this.cubicBezier(
          rightCurvePoints[0].y,
          rightCurvePoints[1].y,
          rightCurvePoints[2].y,
          rightCurvePoints[3].y,
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

      const dst = [corners.tl, corners.tr, corners.bl, corners.br];

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
