// Paper animator - loads animations and applies them to paper elements
(function () {
  const numSlices = 10;
  const numLines = numSlices + 1;
  let animations = [];
  let animatorRegistry = new Map(); // id -> animator
  let isPaused = false;
  let nextId = 0;

  // Flag to disable interactions when animation editor is open
  let interactionsDisabled = false;

  // Z-index tracking for paper elements
  let highestZIndex = 1;

  // Global animation loop
  let globalAnimationLoopRunning = false;
  let lastFrameTime = 0;

  // Map to store per-paper-id config overrides (paperId -> config)
  const configOverrides = new Map();

  // Map to store animation configs per list ID (listId -> configs array)
  const listAnimationConfigs = new Map();

  // Active list ID for infinite scroll (set by paper-renderer)
  let activeListId = null;

  // Global animation loop using requestAnimationFrame
  function globalAnimationLoop(currentTime) {
    if (!globalAnimationLoopRunning) return;

    // Calculate delta time in seconds
    const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0;
    lastFrameTime = currentTime;

    // Update all active animators
    if (!isPaused) {
      animatorRegistry.forEach(animator => {
        if (animator.isAnimating) {
          animator.update(deltaTime);
        }
      });
    }

    // Continue the loop
    requestAnimationFrame(globalAnimationLoop);
  }

  function startGlobalAnimationLoop() {
    if (!globalAnimationLoopRunning) {
      globalAnimationLoopRunning = true;
      lastFrameTime = 0;
      requestAnimationFrame(globalAnimationLoop);
      console.log('[PaperAnimator] Global animation loop started');
    }
  }

  function stopGlobalAnimationLoop() {
    globalAnimationLoopRunning = false;
    console.log('[PaperAnimator] Global animation loop stopped');
  }

  // Default fallback config if none provided
  const defaultConfig = {
    animationName: null, // Will be set to first available animation
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
    startKeyframe: 0,
    endKeyframe: 59,
  };

  // Expose API for paper-renderer and devtools
  window.PaperAnimator = {
    setAnimationConfigs: function (listId, configs) {
      listAnimationConfigs.set(listId, configs);
      activeListId = listId; // Set as active list
    },
    resetAll: function () {
      // Stop all animations
      animatorRegistry.forEach(animator => animator.stop());
      // Clear registry
      animatorRegistry.clear();
      nextId = 0;
    },
    unregisterAnimator: function (id) {
      const animator = animatorRegistry.get(id);
      if (animator) {
        animator.stop();
        animatorRegistry.delete(id);
        // Notify DevTools
        if (window.PaperDevTools) {
          window.PaperDevTools.unregisterAnimator(id);
        }
      }
    },
    getAnimations: function () {
      // Return available animations for DevTools
      return animations;
    },
    getAnimationConfigs: function () {
      // Return configs for the active list (for devtools display/export)
      if (activeListId && listAnimationConfigs.has(activeListId)) {
        return listAnimationConfigs.get(activeListId);
      }
      return [];
    },
    getConfig: function (paperId, sourceListId) {
      // Check if there's an override first
      if (configOverrides.has(paperId)) {
        return configOverrides.get(paperId);
      }

      // Use list-specific configs
      const paperNumber = parseInt(paperId.split('-')[1]) || 0;

      // Determine which list to get configs from
      const listId = sourceListId || activeListId;

      if (listId && listAnimationConfigs.has(listId)) {
        const configs = listAnimationConfigs.get(listId);
        if (configs && configs.length > 0) {
          const configIndex = paperNumber % configs.length;
          return configs[configIndex];
        }
      }

      // Fall back to default config
      console.log('[PaperAnimator] Using default config for', paperId);
      return defaultConfig;
    },
    setConfig: function (paperId, config) {
      // Merge with existing override (if any) to preserve other properties
      const existingOverride = configOverrides.get(paperId);
      const mergedConfig = existingOverride
        ? { ...existingOverride, ...config }
        : config;
      configOverrides.set(paperId, mergedConfig);

      // Apply to animator if it exists
      const animator = animatorRegistry.get(paperId);
      if (animator) {
        // Update animator properties
        if (config.offsetX !== undefined || config.offsetY !== undefined) {
          animator.updateOffsets(
            config.offsetX !== undefined ? config.offsetX : animator.offsetX,
            config.offsetY !== undefined ? config.offsetY : animator.offsetY,
          );
        }
        if (config.rotation !== undefined) {
          animator.updateRotation(config.rotation);
        }
        if (config.scale !== undefined) {
          animator.updateScale(config.scale);
        }
        if (config.startKeyframe !== undefined) {
          animator.startKeyframe = config.startKeyframe;
        }
        if (config.endKeyframe !== undefined) {
          animator.endKeyframe = config.endKeyframe;
        }
      }
    },
    clearConfig: function (paperId) {
      // Remove any config override for this paper
      configOverrides.delete(paperId);
    },
    getConfigOverrides: function () {
      // Return overrides for export
      const result = {};
      configOverrides.forEach((config, id) => {
        result[id] = config;
      });
      return result;
    },
    initializePaperElements: function () {
      // Expose initializePaperElements for external use (e.g., PaperRenderer restart)
      initializePaperElements();
    },
    updateAnimation: function (animationName, animationData) {
      // Update animation data in memory
      if (animations[animationName]) {
        animations[animationName] = animationData;
        console.log('[PaperAnimator] Animation updated:', animationName);

        // Notify all animators using this animation to refresh
        animatorRegistry.forEach((animator, id) => {
          if (animator.animationName === animationName) {
            console.log('[PaperAnimator] Refreshing animator:', id);
            animator.refreshAnimationData(animationData);
          }
        });
      }
    },
    addAnimation: function (animationName, animationData) {
      // Add a new animation to the list
      animations[animationName] = animationData;
      console.log('[PaperAnimator] New animation added:', animationName);
      return animationName;
    },
    animateElement: function (element) {
      // Start animation for a specific element (used by AnimationCoordinator)
      const paperId = element.getAttribute('data-paper-id');
      if (!paperId) {
        console.warn('[PaperAnimator] Element has no data-paper-id:', element);
        return;
      }
      const animator = animatorRegistry.get(paperId);
      if (animator) {
        console.log(
          '[PaperAnimator] Starting coordinated animation for:',
          paperId,
        );
        animator.start();
      } else {
        console.warn('[PaperAnimator] No animator found for:', paperId);
      }
    },
    getAnimator: function (paperId) {
      return animatorRegistry.get(paperId);
    },

    // Utility functions for transforming keyframe data
    // These are used by both the animator and the animation editor
    utils: {
      // Transform a single point by rotation around a center
      transformPoint: function (point, centerX, centerY, rotationRad) {
        const translatedX = point.x - centerX;
        const translatedY = point.y - centerY;
        const rotatedX =
          translatedX * Math.cos(rotationRad) -
          translatedY * Math.sin(rotationRad);
        const rotatedY =
          translatedX * Math.sin(rotationRad) +
          translatedY * Math.cos(rotationRad);
        return {
          x: rotatedX + centerX,
          y: rotatedY + centerY,
        };
      },

      // Apply rotation to keyframe bezier curves
      applyRotationToKeyframe: function (keyframe, rotation) {
        if (!keyframe || rotation === 0) return keyframe;

        const allPoints = [...keyframe.leftCurve, ...keyframe.rightCurve];
        const centerX =
          allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length;
        const centerY =
          allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;
        const rotationRad = (rotation * Math.PI) / 180;

        return {
          ...keyframe,
          leftCurve: keyframe.leftCurve.map(point =>
            this.transformPoint(point, centerX, centerY, rotationRad),
          ),
          rightCurve: keyframe.rightCurve.map(point =>
            this.transformPoint(point, centerX, centerY, rotationRad),
          ),
        };
      },

      // Scale keyframe coordinates for paper dimensions and global scale
      scaleKeyframeForDimensions: function (
        keyframe,
        paperWidth,
        paperHeight,
        globalScale,
      ) {
        if (!keyframe) return keyframe;

        const widthScale = paperWidth / 250;
        const heightScale = paperHeight / 300;

        return {
          ...keyframe,
          leftCurve: keyframe.leftCurve.map(point => ({
            x: point.x * widthScale * globalScale,
            y: point.y * heightScale * globalScale,
          })),
          rightCurve: keyframe.rightCurve.map(point => ({
            x: point.x * widthScale * globalScale,
            y: point.y * heightScale * globalScale,
          })),
        };
      },

      // Get the transform style for a paper element
      getPaperTransform: function (offsetX, offsetY) {
        return `translate(${offsetX}px, ${offsetY}px)`;
      },
    },

    // Disable interactions (hover, etc.) - used by animation editor
    disableInteractions: function () {
      interactionsDisabled = true;
    },

    // Re-enable interactions
    enableInteractions: function () {
      interactionsDisabled = false;
    },

    // Check if interactions are disabled
    areInteractionsDisabled: function () {
      return interactionsDisabled;
    },
  };

  async function init() {
    // Load the manifest of available animations
    try {
      const response = await fetch('/old-paper-refresh/animation-data/manifest.json');
      const manifest = await response.json();

      // Load all animation files by name
      const animationEntries = Object.entries(manifest.animations);
      const animationPromises = animationEntries.map(
        async ([name, filename]) => {
          const data = await fetch(`/old-paper-refresh/animation-data/${filename}`).then(r =>
            r.json(),
          );
          return [name, data];
        },
      );

      const loadedAnimations = await Promise.all(animationPromises);
      animations = Object.fromEntries(loadedAnimations);

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

      console.log('[PaperAnimator] Initializing paper:', paperId);

      // Get group name if this paper belongs to a group
      const paperGroup = paperElement.getAttribute('data-paper-group') || null;

      // First, try to read config from data attributes (set by Paper component)
      const hasDataAttributes = paperElement.hasAttribute(
        'data-animation-name',
      );
      let config;

      if (hasDataAttributes) {
        // Use data attributes directly
        config = {
          animationName:
            paperElement.getAttribute('data-animation-name') || null,
          offsetX: parseFloat(paperElement.getAttribute('data-offset-x')) || 0,
          offsetY: parseFloat(paperElement.getAttribute('data-offset-y')) || 0,
          rotation: parseFloat(paperElement.getAttribute('data-rotation')) || 0,
          scale: parseFloat(paperElement.getAttribute('data-scale')) || 1,
          startKeyframe:
            parseInt(paperElement.getAttribute('data-start-keyframe')) || 0,
          endKeyframe:
            parseInt(paperElement.getAttribute('data-end-keyframe')) || 59,
        };

        // Save this config so it persists across restarts
        window.PaperAnimator.setConfig(paperId, config);
      } else {
        // Fall back to centralized config source
        const sourceListId = paperElement.getAttribute('data-source-list');
        config = window.PaperAnimator.getConfig(paperId, sourceListId);
      }

      // Use animationName from config, or fall back to cycling through available animations
      const animationNames = Object.keys(animations);
      const animationName =
        config?.animationName ??
        animationNames[animatorRegistry.size % animationNames.length];
      let animationData = animations[animationName];

      if (animationData) {
        // Deep copy animation data to avoid mutating the original
        // This is crucial for arrays like keyframes and scaleKeyframes
        animationData = JSON.parse(JSON.stringify(animationData));

        // Apply instance config overrides (positioning, timing, etc.)
        // Only override specific properties, don't spread entire config
        if (config) {
          if (config.offsetX !== undefined)
            animationData.offsetX = config.offsetX;
          if (config.offsetY !== undefined)
            animationData.offsetY = config.offsetY;
          if (config.rotation !== undefined)
            animationData.rotation = config.rotation;
          if (config.scale !== undefined) animationData.scale = config.scale;
          if (config.startKeyframe !== undefined)
            animationData.startKeyframe = config.startKeyframe;
          if (config.endKeyframe !== undefined)
            animationData.endKeyframe = config.endKeyframe;
        }

        // Check if this is an image paper
        const paperStyle = paperElement.getAttribute('data-paper-style');
        const isImagePaper = paperStyle === 'image';

        // Disable pointer events initially
        paperElement.style.pointerEvents = 'none';

        // Check if this element is managed by the AnimationCoordinator
        // Check the wrapper element since that's where data-anim-group is set
        const wrapper = paperElement.closest('.paper-component-wrapper');
        const isCoordinated = wrapper ? wrapper.hasAttribute('data-anim-group') : false;

        if (isCoordinated) {
          console.log('[PaperAnimator]', paperId, 'is coordinated, will defer start');
        } else {
          console.log('[PaperAnimator]', paperId, 'is NOT coordinated, will auto-start');
        }

        // Re-enable pointer events (visibility will be set when first frame renders)
        paperElement.style.pointerEvents = '';

        // Create animator and start
        const animator = new PaperAnimator(paperElement, animationData);
        animator.id = paperId;

        // Ensure animationName is set on the animator for DevTools
        animator.animationName = animationName;

        // Store group name if present
        animator.groupName = paperGroup;

        // Store coordinated flag on animator
        animator.isCoordinated = isCoordinated;

        // Register in our local registry
        animatorRegistry.set(paperId, animator);

        paperElement.setAttribute('data-animator-initialized', 'true');

        // Check if this is an image paper - if so, wait for images/videos to load
        if (isImagePaper) {
          // Find the first slice (all slices have identical content)
          const firstSlice = paperElement.querySelector('.paper-slice-0');
          // Check for video or image
          // Video is in hidden div with paper-master-video class
          console.log(
            '[PaperAnimator]',
            paperId,
            'Looking for video in paperElement',
          );
          const firstVideo = paperElement.querySelector('.paper-master-video');
          console.log(
            '[PaperAnimator]',
            paperId,
            'Found video:',
            firstVideo ? firstVideo.src : 'none',
          );

          const firstImage = firstSlice
            ? firstSlice.querySelector('img')
            : null;

          if (firstVideo) {
            console.log(
              '[PaperAnimator]',
              paperId,
              'Using first video, src:',
              firstVideo.src,
            );
            // Video codepath - render video to all slice canvases
            const handleVideoReady = () => {
              console.log(
                '[PaperAnimator]',
                paperId,
                'Video ready, starting animation',
              );
              console.log(
                '[PaperAnimator]',
                paperId,
                'First video:',
                firstVideo,
              );
              console.log(
                '[PaperAnimator]',
                paperId,
                'First video src:',
                firstVideo.src,
              );

              // Get all canvas elements in all slices
              const canvases = paperElement.querySelectorAll(
                '.paper-video-canvas',
              );
              console.log(
                '[PaperAnimator]',
                paperId,
                'Found',
                canvases.length,
                'canvases for video rendering',
              );
              console.log('[PaperAnimator]', paperId, 'Canvases:', canvases);

              if (canvases.length === 0) {
                console.error(
                  '[PaperAnimator]',
                  paperId,
                  'No canvases found! Cannot render video.',
                );
                return;
              }

              // Cache the 2D contexts to avoid repeated getContext() calls
              const contexts = Array.from(canvases).map(canvas => {
                const ctx = canvas.getContext('2d', {
                  alpha: false,
                  desynchronized: true, // Safari optimization: allow desynchronized rendering
                });
                // Disable image smoothing for better performance
                ctx.imageSmoothingEnabled = false;
                return ctx;
              });

              const startDrawing = () => {
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Starting video render to canvases',
                );
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Video dimensions:',
                  firstVideo.videoWidth,
                  'x',
                  firstVideo.videoHeight,
                );
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Video paused:',
                  firstVideo.paused,
                  'ended:',
                  firstVideo.ended,
                );
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Video readyState:',
                  firstVideo.readyState,
                );

                let canvasesInitialized = false;

                // Safari optimization: Use requestVideoFrameCallback if available, otherwise fallback to rAF
                const supportsVideoFrameCallback =
                  'requestVideoFrameCallback' in HTMLVideoElement.prototype;
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Supports requestVideoFrameCallback:',
                  supportsVideoFrameCallback,
                );

                // Safari optimization: Create a master offscreen canvas to draw video to once,
                // then copy from that canvas to all slice canvases. This avoids multiple
                // video decode/upload operations per frame.
                const isSafari = /^((?!chrome|android).)*safari/i.test(
                  navigator.userAgent,
                );
                let masterCanvas = null;
                let masterCtx = null;

                if (isSafari) {
                  masterCanvas = document.createElement('canvas');
                  masterCtx = masterCanvas.getContext('2d', { alpha: false });
                  console.log(
                    '[PaperAnimator]',
                    paperId,
                    'Safari detected: using master canvas optimization',
                  );
                }

                let animatorStarted = false;

                const drawFrame = () => {
                  if (firstVideo.videoWidth > 0 && firstVideo.videoHeight > 0) {
                    const numContexts = contexts.length;

                    // Only set canvas dimensions once, not every frame
                    // Do this right before drawing to avoid flash of black
                    if (!canvasesInitialized) {
                      if (masterCanvas) {
                        masterCanvas.width = firstVideo.videoWidth;
                        masterCanvas.height = firstVideo.videoHeight;
                      }
                      canvases.forEach(canvas => {
                        canvas.width = firstVideo.videoWidth;
                        canvas.height = firstVideo.videoHeight;
                      });
                      canvasesInitialized = true;
                    }

                    if (isSafari && masterCanvas && masterCtx) {
                      // Safari path: Draw video to master canvas once, then copy to all slices
                      masterCtx.drawImage(firstVideo, 0, 0);

                      // Now copy from master canvas to all slice canvases
                      for (let i = 0; i < numContexts; i++) {
                        contexts[i].drawImage(masterCanvas, 0, 0);
                      }
                    } else {
                      // Chrome path: Draw video directly to all canvases
                      for (let i = 0; i < numContexts; i++) {
                        contexts[i].drawImage(firstVideo, 0, 0);
                      }
                    }

                    // Start animator after first frame is drawn to prevent flash of black
                    if (!animatorStarted) {
                      animatorStarted = true;
                      console.log(
                        '[PaperAnimator]',
                        paperId,
                        'First video frame rendered',
                      );

                      // Mark that video is ready
                      animator.videoFirstFrameReady = true;

                      // Only auto-start if not coordinated
                      if (!isCoordinated) {
                        console.log('[PaperAnimator]', paperId, 'Auto-starting animator');
                        animator.start();
                      } else {
                        console.log('[PaperAnimator]', paperId, 'Video ready, waiting for coordinator to trigger');
                        // If start was called before video was ready, start now
                        if (animator.pendingStart) {
                          console.log('[PaperAnimator]', paperId, 'Starting pending animation');
                          animator.pendingStart = false;
                          animator.start();
                        }
                      }
                    }
                  }
                };

                // Start video rendering loop
                if (supportsVideoFrameCallback) {
                  // Use requestVideoFrameCallback for optimal Safari performance
                  // This only draws when there's actually a new video frame
                  function draw() {
                    drawFrame();
                    firstVideo.requestVideoFrameCallback(draw);
                  }
                  firstVideo.requestVideoFrameCallback(draw);
                } else {
                  // Fallback to requestAnimationFrame
                  function draw() {
                    drawFrame();
                    requestAnimationFrame(draw);
                  }
                  requestAnimationFrame(draw);
                }

                // Always explicitly call play() to ensure video plays
                // Don't rely on autoPlay attribute due to browser autoplay policies
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Calling play() on video',
                );
                firstVideo.play().catch(err => {
                  console.error(
                    '[PaperAnimator]',
                    paperId,
                    'Video play failed:',
                    err,
                  );
                });
              };

              // Wait for metadata if needed (Safari)
              if (firstVideo.videoWidth > 0 && firstVideo.videoHeight > 0) {
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Video metadata already loaded, starting drawing',
                );
                startDrawing();
              } else {
                console.log(
                  '[PaperAnimator]',
                  paperId,
                  'Waiting for video metadata to load',
                );
                firstVideo.addEventListener(
                  'loadedmetadata',
                  () => {
                    console.log(
                      '[PaperAnimator]',
                      paperId,
                      'Video metadata loaded',
                    );
                    startDrawing();
                  },
                  { once: true },
                );
              }

              // Don't start animator here - wait until first video frame is drawn
              // animator.start();
            };

            // Check if video can play through without buffering
            if (firstVideo.readyState >= 3) {
              // HAVE_FUTURE_DATA or better
              handleVideoReady();
            } else {
              console.log(
                '[PaperAnimator]',
                paperId,
                'Waiting for video to be ready',
              );
              firstVideo.addEventListener('canplay', handleVideoReady, {
                once: true,
              });
            }
          } else if (firstImage) {
            // Image codepath
            if (!isCoordinated) {
              animator.start();
            }
          } else {
            // No image or video found, start immediately if not coordinated
            if (!isCoordinated) {
              animator.start();
            }
          }
        } else {
          // Not an image paper, start immediately if not coordinated
          if (!isCoordinated) {
            animator.start();
          }
        }

        // Register with DevTools
        if (window.PaperDevTools) {
          window.PaperDevTools.registerAnimator(paperId, animator);
        }

        // Setup drag interaction
        setupDragInteraction(paperId, paperElement, animator);

        // Create shape overlay for hit detection
        createPaperShapeOverlay(paperId, paperElement, animator);
      }
    });
  }

  function setupDragInteraction(paperId, paperElement, animator) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;
    let hasDragged = false;

    const onMouseDown = e => {
      // Don't start dragging if animation editor has disabled interactions
      if (interactionsDisabled) {
        return;
      }

      // Check if we clicked directly on the paper element or its children
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      if (
        !elementAtPoint ||
        (!paperElement.contains(elementAtPoint) &&
          paperElement !== elementAtPoint)
      ) {
        return;
      }

      // Bring this paper to the front
      highestZIndex++;
      paperElement.style.zIndex = highestZIndex;

      // Start dragging
      isDragging = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartOffsetX = animator.offsetX;
      dragStartOffsetY = animator.offsetY;

      paperElement.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = e => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      // Mark that we've actually dragged
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasDragged = true;
      }

      const newOffsetX = dragStartOffsetX + deltaX;
      const newOffsetY = dragStartOffsetY + deltaY;

      animator.updateOffsets(newOffsetX, newOffsetY);

      // Update config override so DevTools can access it
      const currentConfig = configOverrides.get(paperId) || {};
      configOverrides.set(paperId, {
        ...currentConfig,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });

      // Notify DevTools if available
      if (window.PaperDevTools && window.PaperDevTools.onConfigUpdate) {
        window.PaperDevTools.onConfigUpdate(paperId);
      }
    };

    const onMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;
      paperElement.style.cursor = 'grab';

      // If we actually dragged, prevent click events briefly
      if (hasDragged) {
        const preventClick = e => {
          e.preventDefault();
          e.stopPropagation();
          document.removeEventListener('click', preventClick, true);
        };
        document.addEventListener('click', preventClick, true);
      }
    };

    const onClick = e => {
      // Select this paper in devtools if available
      if (window.PaperDevTools && window.PaperDevTools.selectAnimator) {
        window.PaperDevTools.selectAnimator(paperId);
      }
    };

    // Add event listeners
    paperElement.addEventListener('mousedown', onMouseDown);
    paperElement.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Set initial cursor
    paperElement.style.cursor = 'grab';

    // Store cleanup function on animator for potential removal
    animator._cleanupDrag = () => {
      paperElement.removeEventListener('mousedown', onMouseDown);
      paperElement.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      paperElement.style.cursor = '';
    };
  }

  function createPaperShapeOverlay(paperId, paperElement, animator) {
    // Wait for slice points to be available
    const checkSlicePoints = () => {
      const slicePoints = animator.slicePoints || [];

      if (slicePoints.length === 0) {
        // Retry after a short delay
        setTimeout(checkSlicePoints, 50);
        return;
      }

      // Create SVG element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('paper-shape-overlay');
      svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: all;
        z-index: 1000;
        overflow: visible;
        border: 1px solid transparent;
      `;

      // Create path element with red fill
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'none');

      svg.appendChild(path);
      paperElement.appendChild(svg);

      // Store references on animator
      animator._overlayPath = path;
      animator._overlaySvg = svg;

      // Setup hover interaction on the SVG overlay
      setupOverlayHoverInteraction(svg, animator);

      // Initial update
      updateOverlayPath(animator);

      console.log('[PaperAnimator] Created shape overlay for:', paperId);
    };

    checkSlicePoints();
  }

  function setupOverlayHoverInteraction(svg, animator) {
    // Get hover animation name from the animator's animation data
    const animationData = animations[animator.animationName];
    const hoverAnimationName =
      animationData && animationData.hoverAnimationName
        ? animationData.hoverAnimationName
        : null;

    if (!hoverAnimationName) {
      // No hover animation configured for this animation
      return;
    }

    const hoverAnimation = animations[hoverAnimationName];
    if (!hoverAnimation) {
      console.warn(
        '[PaperAnimator] Hover animation not found:',
        hoverAnimationName,
      );
      return;
    }

    svg.addEventListener('mouseenter', () => {
      console.log('[Hover] mouseenter');
      if (interactionsDisabled) return;
      animator.playHoverAnimation(hoverAnimation);
    });

    svg.addEventListener('mouseleave', () => {
      console.log('[Hover] mouseleave');
      if (interactionsDisabled) return;
      animator.reverseHoverAnimation();
    });
  }

  function updateOverlayPath(animator) {
    if (!animator._overlayPath) return;

    // Don't update overlay during hover animation - keep it at the original shape
    if (animator.hoverState) return;

    const slicePoints = animator.slicePoints || [];
    if (slicePoints.length === 0) return;

    // Build SVG path from current slice points
    const leftPoints = slicePoints.map(s => s.left);
    const rightPoints = slicePoints.map(s => s.right);

    let pathData = `M ${leftPoints[0].x} ${leftPoints[0].y}`;

    for (let i = 1; i < leftPoints.length; i++) {
      pathData += ` L ${leftPoints[i].x} ${leftPoints[i].y}`;
    }

    pathData += ` L ${rightPoints[rightPoints.length - 1].x} ${
      rightPoints[rightPoints.length - 1].y
    }`;

    for (let i = rightPoints.length - 2; i >= 0; i--) {
      pathData += ` L ${rightPoints[i].x} ${rightPoints[i].y}`;
    }

    pathData += ' Z';

    animator._overlayPath.setAttribute('d', pathData);
  }

  function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      let hasNewPaperElements = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a paper element or contains paper elements
            // Skip editor-controlled elements (they're managed by the animation editor)
            if (node.classList && node.classList.contains('paper-element')) {
              if (!node.hasAttribute('data-editor-controlled')) {
                hasNewPaperElements = true;
                console.log(
                  '[PaperAnimator] MutationObserver detected paper element added',
                );
              }
            } else if (node.querySelectorAll) {
              const paperElements = node.querySelectorAll(
                '.paper-element:not([data-editor-controlled])',
              );
              if (paperElements.length > 0) {
                hasNewPaperElements = true;
                console.log(
                  '[PaperAnimator] MutationObserver detected',
                  paperElements.length,
                  'paper elements added',
                );
              }
            }
          }
        });
      });

      if (hasNewPaperElements) {
        console.log(
          '[PaperAnimator] Calling initializePaperElements from MutationObserver',
        );
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
    animatorRegistry.forEach(animator => {
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
      this.shadowKeyframes = animationData.shadowKeyframes || [];

      this.fadeInDuration = 100;

      // Get paper dimensions from data attributes
      this.paperWidth =
        parseInt(paperElement.getAttribute('data-paper-width')) || 250;
      this.paperHeight =
        parseInt(paperElement.getAttribute('data-paper-height')) || 300;

      // Calculate scale factors for animation data (assumes 250x300 baseline)
      this.widthScale = this.paperWidth / 250;
      this.heightScale = this.paperHeight / 300;

      // Transform state
      this.offsetX = animationData.offsetX || 0;
      this.offsetY = animationData.offsetY || 0;
      this.rotation = animationData.rotation || 0; // Rotation in degrees
      this.globalScale =
        animationData.scale !== undefined ? animationData.scale : 1; // Global scale multiplier

      // Hover animation state - allows different scales for top and bottom
      this.topScale = 1;
      this.bottomScale = 1;

      // Rectangle mode (single DOM node rendering)
      this.isRectangleMode = false;
      this.rectangleElement = null;

      // Animation state
      this.isAnimating = false;

      // Initialize scale from first scale keyframe if available
      const firstScaleKeyframe = this.scaleKeyframes.find(
        s => s !== null && s !== undefined,
      );
      this.scale = firstScaleKeyframe !== undefined ? firstScaleKeyframe : 1;

      // Apply rotation first, then scale for dimensions
      this.keyframes = this.scaleKeyframes_forDimensions(
        this.applyRotationToKeyframes(animationData.keyframes || []),
      );

      // Store shadow keyframes without pre-scaling - they will be scaled during rendering
      // using the same center point as the paper
      if (
        window.ShadowRenderer &&
        window.ShadowRenderer.applyRotationToKeyframes
      ) {
        // Only apply rotation to shadow keyframes (rotation happens in baseline coords)
        this.shadowKeyframes = window.ShadowRenderer.applyRotationToKeyframes(
          this.shadowKeyframes,
          this.rotation,
        );
      }

      // Total keyframes count
      this.totalKeyframes = Math.max(
        this.keyframes.length,
        this.scaleKeyframes.length,
      );

      // Set start/end keyframes (defaults: 0 to last keyframe with data)
      this.startKeyframe =
        animationData.startKeyframe !== undefined
          ? animationData.startKeyframe
          : 0;

      // Find the last keyframe with data for default end
      let lastKeyframeIndex = -1;
      for (let i = this.keyframes.length - 1; i >= 0; i--) {
        if (this.keyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }

      // Use configured endKeyframe only if it's explicitly set and different from default
      // Otherwise, auto-detect the last keyframe with actual position data
      if (
        animationData.endKeyframe !== undefined &&
        animationData.endKeyframe !== 59
      ) {
        this.endKeyframe = animationData.endKeyframe;
      } else {
        this.endKeyframe = lastKeyframeIndex >= 0 ? lastKeyframeIndex : 59;
      }

      // Create shadow SVG element
      this.createShadowElement();

      // Render the initial frame immediately to prevent flash
      this.renderInitialFrame();
    }

    createShadowElement() {
      // Use shared shadow renderer to create shadow SVG
      if (window.ShadowRenderer && window.ShadowRenderer.createShadowSVG) {
        this.shadowSVG = window.ShadowRenderer.createShadowSVG(
          this.paperElement,
          this.paperWidth,
          this.paperHeight,
        );
      }
    }

    scaleKeyframes_forDimensions(keyframes) {
      // Scale all keyframe coordinates based on paper dimensions
      return keyframes.map(keyframe => {
        if (!keyframe) return keyframe;

        return {
          ...keyframe,
          leftCurve: keyframe.leftCurve.map(point => ({
            x: (point.x / 250) * this.paperWidth,
            y: (point.y / 300) * this.paperHeight,
          })),
          rightCurve: keyframe.rightCurve.map(point => ({
            x: (point.x / 250) * this.paperWidth,
            y: (point.y / 300) * this.paperHeight,
          })),
        };
      });
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
      // For video papers, wait until first frame is rendered
      const paperStyle = this.paperElement.getAttribute('data-paper-style');
      const hasVideo = this.paperElement.querySelector('.paper-master-video');

      if (paperStyle === 'image' && hasVideo && !this.videoFirstFrameReady) {
        console.log('[PaperAnimator]', this.id, 'Video not ready yet, deferring start');
        this.pendingStart = true;
        return;
      }

      // Start at the start keyframe
      this.currentKeyframePosition = this.startKeyframe;
      this.isAnimating = true;

      // Apply fade-in effect if configured
      if (this.fadeInDuration > 0) {
        this.applyFadeIn();
      }

      // Render the initial keyframe immediately
      this.applyInterpolatedFrame(this.currentKeyframePosition);

      // Make the paper element visible now that first frame is rendered
      this.paperElement.style.visibility = 'visible';

      // Ensure global animation loop is running
      startGlobalAnimationLoop();
    }

    update(deltaTime) {
      if (!this.isAnimating) return;

      // Calculate keyframe increment based on delta time
      // keyframeIncrement = 1 / (this.timePerKeyframe * this.playbackFPS)
      // But we want to advance based on actual time passed:
      // keyframes per second = 1 / this.timePerKeyframe
      const keyframesPerSecond = 1 / this.timePerKeyframe;
      const keyframeIncrement = keyframesPerSecond * deltaTime;

      this.currentKeyframePosition += keyframeIncrement;

      // Stop animation when it reaches the end keyframe
      if (this.currentKeyframePosition >= this.endKeyframe) {
        // Clamp to exact end keyframe
        this.currentKeyframePosition = this.endKeyframe;

        // Render final keyframe
        this.applyInterpolatedFrame(this.endKeyframe);

        // Stop the animation but don't clean up (keep shadow, etc.)
        this.isAnimating = false;
      } else {
        this.applyInterpolatedFrame(this.currentKeyframePosition);
      }
    }

    stop() {
      this.isAnimating = false;

      // Clean up shadow SVG element
      if (this.shadowSVG && this.shadowSVG.parentNode) {
        this.shadowSVG.parentNode.removeChild(this.shadowSVG);
        this.shadowSVG = null;
      }

      // Check if we should stop the global loop (no more active animators)
      const hasActiveAnimators = Array.from(animatorRegistry.values()).some(
        animator => animator.isAnimating,
      );
      if (!hasActiveAnimators) {
        stopGlobalAnimationLoop();
      }
    }

    pause() {
      this.isAnimating = false;
    }

    resume() {
      if (!this.isAnimating) {
        this.isAnimating = true;
        startGlobalAnimationLoop();
      }
    }

    playHoverAnimation(hoverAnimationData) {
      // Cancel any pending reverse animation check
      if (this.reverseAnimationCheckId) {
        cancelAnimationFrame(this.reverseAnimationCheckId);
        this.reverseAnimationCheckId = null;
      }

      // Save the current state before starting hover animation
      const wasAnimating = this.isAnimating;

      if (!this.hoverState) {
        this.hoverState = {
          originalKeyframes: this.keyframes,
          originalShadowKeyframes: this.shadowKeyframes,
          originalScaleKeyframes: this.scaleKeyframes,
          originalStartKeyframe: this.startKeyframe,
          originalEndKeyframe: this.endKeyframe,
          currentPosition: this.currentKeyframePosition,
          wasAnimating: wasAnimating,
          originalTimePerKeyframe: this.timePerKeyframe,
          originalPlaybackFPS: this.playbackFPS,
          isReversing: false,
        };
      }

      // Mark that we're not reversing
      this.hoverState.isReversing = false;

      // Deep copy hover animation data
      const hoverData = JSON.parse(JSON.stringify(hoverAnimationData));

      // Update timing settings from hover animation
      this.timePerKeyframe = hoverData.timePerKeyframe || 0.1;
      this.playbackFPS = hoverData.playbackFPS || 30;

      // Apply rotation and scaling to hover animation
      let hoverKeyframes = this.scaleKeyframes_forDimensions(
        this.applyRotationToKeyframes(hoverData.keyframes || []),
      );

      // Find the last keyframe with data in the hover animation
      let lastHoverKeyframeIndex = -1;
      for (let i = hoverKeyframes.length - 1; i >= 0; i--) {
        if (hoverKeyframes[i]) {
          lastHoverKeyframeIndex = i;
          break;
        }
      }

      if (lastHoverKeyframeIndex === -1) {
        console.warn('[PaperAnimator] No valid hover keyframes found');
        return;
      }

      // Check if the element was animating when hover started
      if (wasAnimating) {
        // CASE 1: Element was animating
        // Stop the animation and interpolate from current frame to hover's last keyframe over 100ms
        this.isAnimating = false;

        // Update the overlay to show the last keyframe of the original animation
        if (this._overlayPath) {
          const endFramePosition = this.hoverState.originalEndKeyframe;
          const originalKeyframes = this.hoverState.originalKeyframes;
          const originalShadowKeyframes =
            this.hoverState.originalShadowKeyframes;

          // Temporarily restore original state to render the end frame
          const savedKeyframes = this.keyframes;
          const savedShadowKeyframes = this.shadowKeyframes;
          const savedHoverState = this.hoverState;

          this.keyframes = originalKeyframes;
          this.shadowKeyframes = originalShadowKeyframes;
          this.hoverState = null; // Temporarily clear so updateOverlayPath works

          // Apply the end frame to update slice points
          this.applyInterpolatedFrame(endFramePosition);

          // Update the overlay path
          updateOverlayPath(this);

          // Restore the state
          this.keyframes = savedKeyframes;
          this.shadowKeyframes = savedShadowKeyframes;
          this.hoverState = savedHoverState;
        }

        // Get current interpolated frame
        const currentFrame = this.getCurrentInterpolatedFrame();
        const targetFrame = hoverKeyframes[lastHoverKeyframeIndex];

        // Create transition keyframes (100ms transition)
        const transitionKeyframes = 3; // Number of keyframes for the transition
        const transitionFrames = [];

        for (let i = 0; i <= transitionKeyframes; i++) {
          const t = i / transitionKeyframes;
          transitionFrames.push({
            leftCurve: currentFrame.leftCurve.map((point, idx) => ({
              x: point.x + (targetFrame.leftCurve[idx].x - point.x) * t,
              y: point.y + (targetFrame.leftCurve[idx].y - point.y) * t,
            })),
            rightCurve: currentFrame.rightCurve.map((point, idx) => ({
              x: point.x + (targetFrame.rightCurve[idx].x - point.x) * t,
              y: point.y + (targetFrame.rightCurve[idx].y - point.y) * t,
            })),
            overlayOffsetX: 0,
            overlayOffsetY: 0,
          });
        }

        // Replace keyframes with transition + hover keyframes
        this.keyframes = [
          ...transitionFrames,
          ...hoverKeyframes.slice(0, lastHoverKeyframeIndex + 1),
        ];
        this.scaleKeyframes = hoverData.scaleKeyframes || [];

        // Process shadow keyframes
        if (hoverData.shadowKeyframes && window.ShadowRenderer) {
          this.shadowKeyframes = window.ShadowRenderer.applyRotationToKeyframes(
            hoverData.shadowKeyframes,
            this.rotation,
          );
        }

        // Set new start/end keyframes
        this.startKeyframe = 0;
        this.endKeyframe = this.keyframes.length - 1;
        this.currentKeyframePosition = 0;
        this.isAnimating = true;
      } else {
        // CASE 2: Element was NOT animating
        // Play the hover animation immediately without any interpolation
        this.keyframes = hoverKeyframes;
        this.scaleKeyframes = hoverData.scaleKeyframes || [];

        // Process shadow keyframes
        if (hoverData.shadowKeyframes && window.ShadowRenderer) {
          this.shadowKeyframes = window.ShadowRenderer.applyRotationToKeyframes(
            hoverData.shadowKeyframes,
            this.rotation,
          );
        }

        // Find the last keyframe with data
        this.startKeyframe = 0;
        this.endKeyframe = lastHoverKeyframeIndex;
        this.currentKeyframePosition = 0;
        this.isAnimating = true;
      }

      // Ensure global animation loop is running
      startGlobalAnimationLoop();
    }

    reverseHoverAnimation() {
      console.log(
        '[Hover] reverseHoverAnimation called, hoverState:',
        this.hoverState,
      );
      if (!this.hoverState) return;

      // If already reversing, don't start another reverse
      if (this.hoverState.isReversing) return;

      // Mark as reversing
      this.hoverState.isReversing = true;

      // Stop current animation
      this.isAnimating = false;

      // Get the current frame from the hover animation
      const currentFrame = this.getCurrentInterpolatedFrame();

      // Check if the original animation was playing or static
      if (this.hoverState.wasAnimating) {
        // CASE 1: Original was animating
        // Restore original keyframes and interpolate back to the END of the original animation
        this.keyframes = this.hoverState.originalKeyframes;
        this.shadowKeyframes = this.hoverState.originalShadowKeyframes;
        this.scaleKeyframes = this.hoverState.originalScaleKeyframes;

        // Always go back to the end of the original animation, not where it was interrupted
        const targetPosition = this.hoverState.originalEndKeyframe;
        const targetFrame = this.getInterpolatedFrameAt(targetPosition);

        // Create reverse transition keyframes (100ms)
        const transitionKeyframes = 3;
        const transitionFrames = [];

        for (let i = 0; i <= transitionKeyframes; i++) {
          const t = i / transitionKeyframes;
          transitionFrames.push({
            leftCurve: currentFrame.leftCurve.map((point, idx) => ({
              x: point.x + (targetFrame.leftCurve[idx].x - point.x) * t,
              y: point.y + (targetFrame.leftCurve[idx].y - point.y) * t,
            })),
            rightCurve: currentFrame.rightCurve.map((point, idx) => ({
              x: point.x + (targetFrame.rightCurve[idx].x - point.x) * t,
              y: point.y + (targetFrame.rightCurve[idx].y - point.y) * t,
            })),
            overlayOffsetX: 0,
            overlayOffsetY: 0,
          });
        }

        // Create a temporary keyframe array with just the transition
        const tempKeyframes = Array(this.totalKeyframes).fill(null);
        transitionFrames.forEach((frame, i) => {
          tempKeyframes[i] = frame;
        });
        this.keyframes = tempKeyframes;

        // Play the transition
        this.currentKeyframePosition = 0;
        this.startKeyframe = 0;
        this.endKeyframe = transitionKeyframes;
        this.isAnimating = true;

        // After transition completes, restore original state
        const checkTransitionComplete = () => {
          if (this.currentKeyframePosition >= this.endKeyframe) {
            // Restore original state
            this.keyframes = this.hoverState.originalKeyframes;
            this.shadowKeyframes = this.hoverState.originalShadowKeyframes;
            this.scaleKeyframes = this.hoverState.originalScaleKeyframes;
            this.startKeyframe = this.hoverState.originalStartKeyframe;
            this.endKeyframe = this.hoverState.originalEndKeyframe;
            this.currentKeyframePosition = targetPosition;
            this.isAnimating = this.hoverState.wasAnimating;
            this.timePerKeyframe = this.hoverState.originalTimePerKeyframe;
            this.playbackFPS = this.hoverState.originalPlaybackFPS;

            // Render the target frame
            this.applyInterpolatedFrame(targetPosition);

            // Clear hover state
            console.log('[Hover] Clearing hoverState (case 1: was animating)');
            this.hoverState = null;
            this.reverseAnimationCheckId = null;
          } else {
            this.reverseAnimationCheckId = requestAnimationFrame(
              checkTransitionComplete,
            );
          }
        };
        this.reverseAnimationCheckId = requestAnimationFrame(
          checkTransitionComplete,
        );
      } else {
        // CASE 2: Original was NOT animating
        // Just play the hover animation in reverse (reverse the keyframes)
        // Collect all non-null hover keyframes
        const hoverFrames = [];
        for (let i = 0; i < this.keyframes.length; i++) {
          if (this.keyframes[i]) {
            hoverFrames.push(this.keyframes[i]);
          }
        }

        // Reverse the frames
        const reversedFrames = [...hoverFrames].reverse();

        // Create keyframe array with reversed frames
        const reversedKeyframes = Array(this.totalKeyframes).fill(null);
        reversedFrames.forEach((frame, i) => {
          reversedKeyframes[i] = frame;
        });

        this.keyframes = reversedKeyframes;

        // Play from start to end of reversed animation
        this.currentKeyframePosition = 0;
        this.startKeyframe = 0;
        this.endKeyframe = reversedFrames.length - 1;
        this.isAnimating = true;

        // After reverse animation completes, restore original static state
        const checkReverseComplete = () => {
          if (this.currentKeyframePosition >= this.endKeyframe) {
            // Restore original state
            this.keyframes = this.hoverState.originalKeyframes;
            this.shadowKeyframes = this.hoverState.originalShadowKeyframes;
            this.scaleKeyframes = this.hoverState.originalScaleKeyframes;
            this.startKeyframe = this.hoverState.originalStartKeyframe;
            this.endKeyframe = this.hoverState.originalEndKeyframe;
            this.currentKeyframePosition = this.hoverState.currentPosition;
            this.isAnimating = false;
            this.timePerKeyframe = this.hoverState.originalTimePerKeyframe;
            this.playbackFPS = this.hoverState.originalPlaybackFPS;

            // Render the final frame
            this.applyInterpolatedFrame(this.currentKeyframePosition);

            // Clear hover state
            console.log(
              '[Hover] Clearing hoverState (case 2: was NOT animating)',
            );
            this.hoverState = null;
            this.reverseAnimationCheckId = null;
          } else {
            this.reverseAnimationCheckId =
              requestAnimationFrame(checkReverseComplete);
          }
        };
        this.reverseAnimationCheckId =
          requestAnimationFrame(checkReverseComplete);
      }

      // Ensure global animation loop is running
      startGlobalAnimationLoop();
    }

    getCurrentInterpolatedFrame() {
      return this.getInterpolatedFrameAt(this.currentKeyframePosition);
    }

    getInterpolatedFrameAt(position) {
      // Get the interpolated frame at a specific position
      const floor = Math.floor(position);
      const ceil = Math.ceil(position);
      const t = position - floor;

      // Find the nearest non-null keyframes
      let beforeKeyframe = null;
      for (let i = floor; i >= 0; i--) {
        if (this.keyframes[i]) {
          beforeKeyframe = this.keyframes[i];
          break;
        }
      }

      let afterKeyframe = null;
      for (let i = ceil; i < this.keyframes.length; i++) {
        if (this.keyframes[i]) {
          afterKeyframe = this.keyframes[i];
          break;
        }
      }

      // If we only have one keyframe, use it
      if (!beforeKeyframe && afterKeyframe) beforeKeyframe = afterKeyframe;
      if (!afterKeyframe && beforeKeyframe) afterKeyframe = beforeKeyframe;

      if (!beforeKeyframe || !afterKeyframe) {
        // Return a default frame
        return {
          leftCurve: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
            { x: 0, y: 200 },
            { x: 0, y: 300 },
          ],
          rightCurve: [
            { x: 250, y: 0 },
            { x: 250, y: 100 },
            { x: 250, y: 200 },
            { x: 250, y: 300 },
          ],
        };
      }

      // Interpolate between keyframes
      return {
        leftCurve: beforeKeyframe.leftCurve.map((point, idx) => ({
          x: point.x + (afterKeyframe.leftCurve[idx].x - point.x) * t,
          y: point.y + (afterKeyframe.leftCurve[idx].y - point.y) * t,
        })),
        rightCurve: beforeKeyframe.rightCurve.map((point, idx) => ({
          x: point.x + (afterKeyframe.rightCurve[idx].x - point.x) * t,
          y: point.y + (afterKeyframe.rightCurve[idx].y - point.y) * t,
        })),
      };
    }

    refreshAnimationData(newAnimationData) {
      // Update the animation data and re-process keyframes
      this.animationData = newAnimationData;

      // Update timing settings
      this.timePerKeyframe = newAnimationData.timePerKeyframe || 0.1;
      this.playbackFPS = newAnimationData.playbackFPS || 30;
      this.scaleKeyframes = newAnimationData.scaleKeyframes || [];

      // Re-process keyframes with rotation and dimension scaling
      this.keyframes = this.scaleKeyframes_forDimensions(
        this.applyRotationToKeyframes(newAnimationData.keyframes || []),
      );

      // Re-process shadow keyframes - only apply rotation, not scaling
      if (
        window.ShadowRenderer &&
        window.ShadowRenderer.applyRotationToKeyframes
      ) {
        this.shadowKeyframes = window.ShadowRenderer.applyRotationToKeyframes(
          newAnimationData.shadowKeyframes || [],
          this.rotation,
        );
      }

      // Update total keyframes count
      this.totalKeyframes = Math.max(
        this.keyframes.length,
        this.scaleKeyframes.length,
      );

      // Find the last keyframe with data for end keyframe
      let lastKeyframeIndex = -1;
      for (let i = this.keyframes.length - 1; i >= 0; i--) {
        if (this.keyframes[i]) {
          lastKeyframeIndex = i;
          break;
        }
      }
      this.endKeyframe = lastKeyframeIndex >= 0 ? lastKeyframeIndex : 59;

      // Re-render the current frame with updated animation data
      this.applyInterpolatedFrame(this.currentKeyframePosition);

      // Re-initialize hover interactions with new animation data
      if (this._overlaySvg) {
        // Remove old event listeners by cloning the SVG
        const oldSvg = this._overlaySvg;
        const newSvg = oldSvg.cloneNode(true);
        oldSvg.parentNode.replaceChild(newSvg, oldSvg);
        this._overlaySvg = newSvg;
        this._overlayPath = newSvg.querySelector('path');

        // Re-setup hover interaction with new animation data
        setupOverlayHoverInteraction(newSvg, this);
      }

      console.log('[PaperAnimator] Refreshed animation data for', this.id);
    }

    updateOffsets(offsetX, offsetY) {
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      // Immediately update all transforms with new offsets
      this.updateAllTransforms();
    }

    updateRotation(rotation) {
      this.rotation = rotation;
      // Recalculate keyframes: rotation first, then dimension scaling
      this.keyframes = this.scaleKeyframes_forDimensions(
        this.applyRotationToKeyframes(this.animationData.keyframes || []),
      );
      // Re-render current keyframe position
      this.applyInterpolatedFrame(this.currentKeyframePosition);
    }

    updateScale(scale) {
      this.globalScale = scale;
      // Re-render current keyframe position with new scale
      this.applyInterpolatedFrame(this.currentKeyframePosition);
    }

    renderAsRectangle(leftCurvePoints, rightCurvePoints) {
      // Hide all slices
      for (let i = 0; i < 10; i++) {
        const slice = this.paperElement.querySelector(`.paper-slice-${i}`);
        if (slice) {
          slice.style.display = 'none';
        }
      }

      // Create or get the rectangle element
      if (!this.rectangleElement) {
        this.rectangleElement = document.createElement('div');
        this.rectangleElement.className = 'paper-rectangle';
        this.rectangleElement.style.cssText = `
          position: absolute;
          width: ${this.paperWidth}px;
          height: ${this.paperHeight}px;
          top: 0;
          left: 0;
          transform-origin: 0 0;
          pointer-events: auto;
          overflow: hidden;
        `;

        // Clone the content from the first slice
        const firstSlice = this.paperElement.querySelector('.paper-slice-0');
        if (firstSlice) {
          // Clone the inner content (includes images, text, etc.)
          const content = firstSlice.querySelector('div');
          if (content) {
            this.rectangleElement.appendChild(content.cloneNode(true));
          }

          // Also copy any background image if it exists
          const bgImage = window.getComputedStyle(firstSlice).backgroundImage;
          if (bgImage && bgImage !== 'none') {
            this.rectangleElement.style.backgroundImage = bgImage;
            this.rectangleElement.style.backgroundSize = 'cover';
            this.rectangleElement.style.backgroundPosition = 'center';
          }
        }

        this.paperElement.appendChild(this.rectangleElement);
      }

      this.rectangleElement.style.display = 'block';
      this.isRectangleMode = true;

      // Update the rectangle's transform
      this.updateRectangleTransform();
    }

    switchToSliceMode() {
      // Hide the rectangle element
      if (this.rectangleElement) {
        this.rectangleElement.style.display = 'none';
      }

      // Show all slices
      for (let i = 0; i < 10; i++) {
        const slice = this.paperElement.querySelector(`.paper-slice-${i}`);
        if (slice) {
          slice.style.display = 'block';
        }
      }

      this.isRectangleMode = false;
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

      // Check if either keyframe is a rectangle keyframe
      const isRectangle = lowerKf.isRectangle || upperKf.isRectangle;

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

      // Apply global scale multiplier
      this.scale *= this.globalScale;

      // Interpolate and render shadow if shadow keyframes exist
      // Pass paper curves so shadow can be scaled around the same center point
      this.renderShadow(
        keyframePosition,
        lowerIndex,
        upperIndex,
        leftCurvePoints,
        rightCurvePoints,
      );

      // If this is a rectangle keyframe, render as single DOM node
      if (isRectangle && false) {
        this.renderAsRectangle(leftCurvePoints, rightCurvePoints);
      } else {
        // Switch back to slice mode if we were in rectangle mode
        if (this.isRectangleMode) {
          this.switchToSliceMode();
        }
        // Apply transforms to all slices
        this.updateAllTransforms();
      }
    }

    renderShadow(
      keyframePosition,
      lowerIndex,
      upperIndex,
      paperLeftCurve,
      paperRightCurve,
    ) {
      if (!this.shadowSVG || this.shadowKeyframes.length === 0) return;

      const lowerShadowIndex = this.findPreviousShadowKeyframe(lowerIndex);
      const upperShadowIndex = this.findNextShadowKeyframe(upperIndex);

      if (lowerShadowIndex === null || upperShadowIndex === null) {
        // No shadow keyframes - clear shadow
        this.shadowSVG.innerHTML = '';
        return;
      }

      const lowerShadow = this.shadowKeyframes[lowerShadowIndex];
      const upperShadow = this.shadowKeyframes[upperShadowIndex];

      let shadowT;
      if (lowerShadowIndex === upperShadowIndex) {
        shadowT = 0;
      } else {
        shadowT =
          (keyframePosition - lowerShadowIndex) /
          (upperShadowIndex - lowerShadowIndex);
        shadowT = Math.max(0, Math.min(1, shadowT));
      }

      // Interpolate shadow bezier curves (still in baseline coordinates)
      const leftCurve = lowerShadow.leftCurve.map((p, i) => ({
        x: this.lerp(p.x, upperShadow.leftCurve[i].x, shadowT),
        y: this.lerp(p.y, upperShadow.leftCurve[i].y, shadowT),
      }));

      const rightCurve = lowerShadow.rightCurve.map((p, i) => ({
        x: this.lerp(p.x, upperShadow.rightCurve[i].x, shadowT),
        y: this.lerp(p.y, upperShadow.rightCurve[i].y, shadowT),
      }));

      // Calculate center from paper curves (which are already scaled)
      const allPaperPoints = [...paperLeftCurve, ...paperRightCurve];
      const centerX =
        allPaperPoints.reduce((sum, p) => sum + p.x, 0) / allPaperPoints.length;
      const centerY =
        allPaperPoints.reduce((sum, p) => sum + p.y, 0) / allPaperPoints.length;

      // Scale shadow curves from baseline to paper dimensions
      // First scale to paper dimensions, then scale around center point (same as paper)
      const scaledLeftCurve = leftCurve.map(point => {
        const scaledX = (point.x / 250) * this.paperWidth;
        const scaledY = (point.y / 300) * this.paperHeight;
        return {
          x: centerX + (scaledX - centerX) * this.globalScale,
          y: centerY + (scaledY - centerY) * this.globalScale,
        };
      });

      const scaledRightCurve = rightCurve.map(point => {
        const scaledX = (point.x / 250) * this.paperWidth;
        const scaledY = (point.y / 300) * this.paperHeight;
        return {
          x: centerX + (scaledX - centerX) * this.globalScale,
          y: centerY + (scaledY - centerY) * this.globalScale,
        };
      });

      // Generate points along the scaled curves using shared shadow renderer
      const generatedPoints = window.ShadowRenderer.generateShapePoints(
        scaledLeftCurve,
        scaledRightCurve,
        10,
      );

      // Interpolate colors
      const lowerColors = lowerShadow.colors || [];
      const upperColors = upperShadow.colors || [];
      const colors = lowerColors.map((lowerColor, i) => {
        const upperColor = upperColors[i];
        if (lowerColor === null || upperColor === null) {
          return lowerColor || upperColor;
        }
        return this.interpolateColors(lowerColor, upperColor, shadowT);
      });

      // Interpolate blur
      const blurAmount =
        lowerShadow.blurAmount !== undefined &&
        upperShadow.blurAmount !== undefined
          ? this.lerp(lowerShadow.blurAmount, upperShadow.blurAmount, shadowT)
          : lowerShadow.blurAmount || upperShadow.blurAmount || 0;

      const blurEnabled =
        shadowT < 0.5 ? lowerShadow.blurEnabled : upperShadow.blurEnabled;

      // Render the shadow shape
      this.drawShadowShape(generatedPoints, colors, blurAmount, blurEnabled);
    }

    interpolateColors(color1, color2, t) {
      // Use shared shadow renderer
      return window.ShadowRenderer.interpolateColors(color1, color2, t);
    }

    drawShadowShape(generatedPoints, colors, blurAmount, blurEnabled) {
      // Use shared shadow renderer with unique ID prefix
      window.ShadowRenderer.drawSVGShape(
        this.shadowSVG,
        generatedPoints,
        colors,
        blurEnabled,
        blurAmount,
        `shadow-${this.id}`,
      );
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

      // Find min and max Y for interpolating top/bottom scales
      const minY = Math.min(...allPoints.map(p => p.y));
      const maxY = Math.max(...allPoints.map(p => p.y));
      const yRange = maxY - minY;

      // Ease-in-ease-out function for smooth interpolation
      const easeInOutCubic = t => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const scaledLeftPoints = leftCurvePoints.map(p => {
        // Interpolate scale based on Y position (0 = top, 1 = bottom)
        const yProgress = yRange > 0 ? (p.y - minY) / yRange : 0;
        const easedProgress = easeInOutCubic(yProgress);
        const pointScale =
          this.scale *
          (this.topScale + (this.bottomScale - this.topScale) * easedProgress);

        return {
          x: centerX + (p.x - centerX) * pointScale,
          y: centerY + (p.y - centerY) * pointScale,
        };
      });

      const scaledRightPoints = rightCurvePoints.map(p => {
        // Interpolate scale based on Y position (0 = top, 1 = bottom)
        const yProgress = yRange > 0 ? (p.y - minY) / yRange : 0;
        const easedProgress = easeInOutCubic(yProgress);
        const pointScale =
          this.scale *
          (this.topScale + (this.bottomScale - this.topScale) * easedProgress);

        return {
          x: centerX + (p.x - centerX) * pointScale,
          y: centerY + (p.y - centerY) * pointScale,
        };
      });

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
      // Apply offset transform to parent paper-element
      this.paperElement.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px)`;

      if (this.isRectangleMode) {
        this.updateRectangleTransform();
      } else {
        for (let i = 0; i < numSlices; i++) {
          this.updateSliceTransform(i);
        }
      }

      // Update the shape overlay to match current animation
      updateOverlayPath(this);
    }

    updateRectangleTransform() {
      if (
        !this.rectangleElement ||
        !this.slicePoints ||
        this.slicePoints.length < 11
      ) {
        return;
      }

      // Use the same evaluated bezier points that the slices use
      const topLine = this.slicePoints[0];
      const bottomLine = this.slicePoints[10];

      // Define source rectangle (the rectangle element's natural dimensions)
      const src = [
        { x: 0, y: 0 },
        { x: this.paperWidth, y: 0 },
        { x: 0, y: this.paperHeight },
        { x: this.paperWidth, y: this.paperHeight },
      ];

      // Define destination corners using evaluated bezier points (offset handled by parent)
      const dst = [
        { x: topLine.left.x, y: topLine.left.y },
        {
          x: topLine.right.x,
          y: topLine.right.y,
        },
        {
          x: bottomLine.left.x,
          y: bottomLine.left.y,
        },
        {
          x: bottomLine.right.x,
          y: bottomLine.right.y,
        },
      ];

      // Calculate perspective transform matrix (same as slices)
      const matrix = this.getPerspectiveTransform(src, dst);
      const transform = `matrix3d(${matrix.join(',')})`;

      this.rectangleElement.style.transform = transform;
      this.rectangleElement.style.transformOrigin = '0 0';
    }

    updateSliceTransform(sliceIndex) {
      const sliceElement = this.paperElement.querySelector(
        `.paper-slice-${sliceIndex}`,
      );
      if (!sliceElement) return;

      const corners = this.getSliceCorners(sliceIndex);

      const sliceHeight = this.paperHeight / numSlices;
      const startY = sliceIndex * sliceHeight;
      const src = [
        { x: 0, y: startY },
        { x: this.paperWidth, y: startY },
        { x: 0, y: startY + sliceHeight },
        { x: this.paperWidth, y: startY + sliceHeight },
      ];

      // Use corners directly (offset handled by parent element)
      const dst = [
        { x: corners.tl.x, y: corners.tl.y },
        { x: corners.tr.x, y: corners.tr.y },
        { x: corners.bl.x, y: corners.bl.y },
        { x: corners.br.x, y: corners.br.y },
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

    findNextShadowKeyframe(startIndex) {
      for (let i = startIndex; i < this.shadowKeyframes.length; i++) {
        if (
          this.shadowKeyframes[i] !== null &&
          this.shadowKeyframes[i] !== undefined
        )
          return i;
      }
      for (let i = 0; i < startIndex; i++) {
        if (
          this.shadowKeyframes[i] !== null &&
          this.shadowKeyframes[i] !== undefined
        )
          return i;
      }
      return null;
    }

    findPreviousShadowKeyframe(startIndex) {
      for (let i = startIndex; i >= 0; i--) {
        if (
          this.shadowKeyframes[i] !== null &&
          this.shadowKeyframes[i] !== undefined
        )
          return i;
      }
      for (let i = this.shadowKeyframes.length - 1; i > startIndex; i--) {
        if (
          this.shadowKeyframes[i] !== null &&
          this.shadowKeyframes[i] !== undefined
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
