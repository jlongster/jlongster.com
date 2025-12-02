// Arrow Animator - Loads and animates arrow SVGs from keyframe data
(function () {
  const arrowAnimations = new Map(); // name -> animation data
  const arrowInstances = new Map(); // element -> { animationName, currentFrame, lastFrameTime, isPlaying }

  console.log('[ArrowAnimator] Script loaded');

  async function loadArrowAnimation(name) {
    if (arrowAnimations.has(name)) {
      return arrowAnimations.get(name);
    }

    try {
      const response = await fetch(`/arrow-animations/${name}.json`);
      if (!response.ok) {
        console.error(`[ArrowAnimator] Failed to load animation: ${name}`);
        return null;
      }

      const animationData = await response.json();
      arrowAnimations.set(name, animationData);
      console.log(`[ArrowAnimator] Loaded animation: ${name}`, animationData);
      return animationData;
    } catch (error) {
      console.error(`[ArrowAnimator] Error loading animation ${name}:`, error);
      return null;
    }
  }

  function renderArrowFrame(element, animation, frameIndex) {
    if (!animation || !animation.keyframes || animation.keyframes.length === 0) {
      return;
    }

    // Clamp frame index to valid range
    const clampedIndex = Math.min(frameIndex, animation.keyframes.length - 1);

    // Render the SVG string directly
    element.innerHTML = animation.keyframes[clampedIndex];
  }

  function getTotalFrames(animation) {
    if (!animation || !animation.keyframes || animation.keyframes.length === 0) {
      return 1;
    }
    // Total frames is the number of keyframes
    return animation.keyframes.length;
  }

  function animateArrow(element, animation) {
    const instance = arrowInstances.get(element);
    if (!instance || !instance.isPlaying) {
      return;
    }

    const now = performance.now();
    const elapsed = now - instance.startTime;
    const timePerKeyframe = (animation.timePerKeyframe || 0.033) * 1000; // Convert seconds to milliseconds
    const totalFrames = getTotalFrames(animation);

    // Calculate which frame we should be on based on elapsed time
    const targetFrame = Math.floor(elapsed / timePerKeyframe);

    if (targetFrame !== instance.currentFrame) {
      if (targetFrame >= totalFrames) {
        // Animation complete - render last frame and stop
        instance.currentFrame = totalFrames - 1;
        renderArrowFrame(element, animation, instance.currentFrame);
        instance.isPlaying = false;
        return;
      }

      // Render the target frame
      instance.currentFrame = targetFrame;
      renderArrowFrame(element, animation, instance.currentFrame);
    }

    requestAnimationFrame(() => animateArrow(element, animation));
  }

  function startArrowAnimation(element, animationName) {
    if (arrowInstances.has(element)) {
      const instance = arrowInstances.get(element);
      instance.isPlaying = true;
      return;
    }

    const animation = arrowAnimations.get(animationName);
    if (!animation) {
      console.error(`[ArrowAnimator] Animation not loaded: ${animationName}`);
      return;
    }

    const instance = {
      animationName,
      currentFrame: 0,
      startTime: performance.now(),
      isPlaying: true,
    };

    arrowInstances.set(element, instance);
    renderArrowFrame(element, animation, 0);
    animateArrow(element, animation);
  }

  function stopArrowAnimation(element) {
    const instance = arrowInstances.get(element);
    if (instance) {
      instance.isPlaying = false;
    }
  }

  async function initializeArrows() {
    const arrowElements = document.querySelectorAll('[data-canvas-text-arrow="true"]');
    console.log(`[ArrowAnimator] Found ${arrowElements.length} arrow elements`);

    for (const element of arrowElements) {
      const arrowName = element.dataset.arrowName || element.getAttribute('data-arrow-name');
      if (!arrowName) {
        console.warn('[ArrowAnimator] Arrow element missing data-arrow-name:', element);
        continue;
      }

      // Load the animation data
      const animation = await loadArrowAnimation(arrowName);
      if (animation) {
        // Render the first frame immediately
        renderArrowFrame(element, animation, 0);
        // Start animation
        startArrowAnimation(element, arrowName);
      }
    }
  }

  // Observe for new arrow elements added to the DOM
  function setupMutationObserver() {
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            // Check if the node itself is an arrow
            if (node.dataset?.canvasTextArrow === 'true') {
              const arrowName = node.dataset.arrowName || node.getAttribute('data-arrow-name');
              if (arrowName) {
                const animation = await loadArrowAnimation(arrowName);
                if (animation) {
                  renderArrowFrame(node, animation, 0);
                  startArrowAnimation(node, arrowName);
                }
              }
            }
            // Check children
            const arrowElements = node.querySelectorAll?.('[data-canvas-text-arrow="true"]');
            if (arrowElements) {
              for (const element of arrowElements) {
                const arrowName = element.dataset.arrowName || element.getAttribute('data-arrow-name');
                if (arrowName) {
                  const animation = await loadArrowAnimation(arrowName);
                  if (animation) {
                    renderArrowFrame(element, animation, 0);
                    startArrowAnimation(element, arrowName);
                  }
                }
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Initialize when DOM is ready
  function init() {
    console.log('[ArrowAnimator] Initializing...');
    initializeArrows();
    setupMutationObserver();
    console.log('[ArrowAnimator] Initialization complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for external use
  window.ArrowAnimator = {
    loadAnimation: loadArrowAnimation,
    startAnimation: startArrowAnimation,
    stopAnimation: stopArrowAnimation,
  };
})();
