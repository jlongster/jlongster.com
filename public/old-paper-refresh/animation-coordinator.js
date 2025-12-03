// Animation Coordinator - Coordinates staggered animations between paper, text, and arrows
(function () {
  const groups = new Map(); // groupName -> { elements: [], triggered: false }
  const elementConfigs = new Map(); // element -> { group, delay, type }

  console.log('[AnimationCoordinator] Script loaded');

  function register(element, config) {
    const { group, delay = 0, type } = config;

    // Don't register the same element twice
    if (elementConfigs.has(element)) {
      return;
    }

    if (!groups.has(group)) {
      groups.set(group, { elements: [], triggered: false, observer: null });
    }

    const groupData = groups.get(group);
    groupData.elements.push({ element, delay, type });

    elementConfigs.set(element, { group, delay, type });

    // Initially hide the element until animation triggers
    hideElement(element, type);

    console.log(`[AnimationCoordinator] Registered element in group "${group}" with delay ${delay}ms, type: ${type}`);
  }

  function hideElement(element, type) {
    if (type === 'paper') {
      // Paper elements are already hidden by default
    } else if (type === 'text') {
      element.style.opacity = '0';
    } else if (type === 'arrow') {
      element.style.opacity = '0';
    }
  }

  function showElement(element, type) {
    if (type === 'text') {
      element.style.opacity = '1';
    } else if (type === 'arrow') {
      element.style.opacity = '1';
    }
  }

  function triggerGroup(groupName) {
    const groupData = groups.get(groupName);
    if (!groupData) {
      console.warn(`[AnimationCoordinator] Group "${groupName}" not found`);
      return;
    }

    if (groupData.triggered) {
      console.log(`[AnimationCoordinator] Group "${groupName}" already triggered, skipping`);
      return;
    }

    groupData.triggered = true;
    console.log(`[AnimationCoordinator] Triggering group "${groupName}" with ${groupData.elements.length} elements`);

    const startTime = performance.now();

    groupData.elements.forEach(({ element, delay, type }) => {
      setTimeout(() => {
        animateElement(element, type);
      }, delay);
    });
  }

  function resetGroup(groupName) {
    const groupData = groups.get(groupName);
    if (!groupData) {
      console.warn(`[AnimationCoordinator] Group "${groupName}" not found for reset`);
      return;
    }

    console.log(`[AnimationCoordinator] Resetting group "${groupName}"`);

    // Reset triggered state
    groupData.triggered = false;

    // Hide all elements again
    groupData.elements.forEach(({ element, type }) => {
      hideElement(element, type);

      // For paper elements, we need to reset the animator
      if (type === 'paper') {
        let paperElement = element;
        if (element.classList.contains('paper-component-wrapper')) {
          paperElement = element.querySelector('.paper-element');
        }
        if (paperElement && window.PaperRenderer && window.PaperRenderer.restartAnimator) {
          const paperId = paperElement.getAttribute('data-paper-id');
          if (paperId) {
            window.PaperRenderer.restartAnimator(paperId);
          }
        }
      } else if (type === 'arrow') {
        // Reset arrow animation
        if (window.ArrowAnimator && window.ArrowAnimator.stopAnimation) {
          window.ArrowAnimator.stopAnimation(element);
        }
        // Clear the arrow content so it can be redrawn
        element.innerHTML = '';
      }
    });

    // Re-setup scroll observation if needed
    if (groupData.observer) {
      groupData.observer.disconnect();
      groupData.observer = null;
    }
  }

  function setElementDelay(groupName, elementIndex, newDelay) {
    const groupData = groups.get(groupName);
    if (!groupData) {
      console.warn(`[AnimationCoordinator] Group "${groupName}" not found`);
      return;
    }

    if (elementIndex < 0 || elementIndex >= groupData.elements.length) {
      console.warn(`[AnimationCoordinator] Invalid element index ${elementIndex}`);
      return;
    }

    const oldDelay = groupData.elements[elementIndex].delay;
    groupData.elements[elementIndex].delay = newDelay;

    // Also update the elementConfigs map
    const element = groupData.elements[elementIndex].element;
    const config = elementConfigs.get(element);
    if (config) {
      config.delay = newDelay;
    }

    console.log(`[AnimationCoordinator] Updated delay for element ${elementIndex} in group "${groupName}": ${oldDelay}ms -> ${newDelay}ms`);
  }

  function getGroups() {
    return groups;
  }

  function animateElement(element, type, retryCount = 0) {
    console.log(`[AnimationCoordinator] Animating element of type "${type}"`);

    if (type === 'paper') {
      // The paper-component gets transformed by paper-renderer into a wrapper with paper-element inside
      // Find the actual paper-element to animate
      let paperElement = element;
      if (element.classList.contains('paper-component-wrapper')) {
        paperElement = element.querySelector('.paper-element');
      } else if (element.classList.contains('paper-component')) {
        // Element hasn't been transformed yet - find the wrapper that replaced it
        const wrapper = element.closest('.paper-component-wrapper');
        if (wrapper) {
          paperElement = wrapper.querySelector('.paper-element');
        }
      }

      if (paperElement && window.PaperAnimator && window.PaperAnimator.animateElement) {
        // Check if the animator is actually registered
        const paperId = paperElement.getAttribute('data-paper-id');
        const animator = window.PaperAnimator.getAnimator ? window.PaperAnimator.getAnimator(paperId) : null;

        if (animator) {
          window.PaperAnimator.animateElement(paperElement);
        } else if (retryCount < 10) {
          // Animator not ready yet, retry after a short delay
          console.log('[AnimationCoordinator] Animator not ready, retrying...', paperId);
          setTimeout(() => {
            animateElement(element, type, retryCount + 1);
          }, 10);
        } else {
          console.warn('[AnimationCoordinator] Animator not found after retries:', paperId);
        }
      } else {
        console.warn('[AnimationCoordinator] PaperAnimator not available or paper element not found');
      }
    } else if (type === 'text') {
      // Just show the text immediately
      showElement(element, type);
    } else if (type === 'arrow') {
      // Show the arrow and trigger its animation
      showElement(element, type);
      if (window.ArrowAnimator) {
        const arrowName = element.dataset.arrowName;
        if (arrowName) {
          window.ArrowAnimator.loadAnimation(arrowName).then(animation => {
            if (animation) {
              window.ArrowAnimator.startAnimation(element, arrowName);
            }
          });
        }
      } else {
        console.warn('[AnimationCoordinator] ArrowAnimator not available');
      }
    }
  }

  function observeScroll(groupName, options = {}) {
    const groupData = groups.get(groupName);
    if (!groupData) {
      console.warn(`[AnimationCoordinator] Group "${groupName}" not found for scroll observation`);
      return;
    }

    if (groupData.observer) {
      // Already observing
      return;
    }

    const { threshold = 0.2, rootMargin = '0px', target } = options;

    // Find element to observe
    let elementToObserve;
    if (target) {
      // Use custom target selector
      elementToObserve = document.querySelector(target);
      if (!elementToObserve) {
        console.warn(`[AnimationCoordinator] Target element not found for selector "${target}"`);
        return;
      }
    } else {
      // Use the first element in the group
      elementToObserve = groupData.elements[0]?.element;
      if (!elementToObserve) {
        console.warn(`[AnimationCoordinator] No elements in group "${groupName}" to observe`);
        return;
      }
    }

    console.log(`[AnimationCoordinator] Setting up scroll observer for group "${groupName}", observing:`, elementToObserve, `threshold: ${threshold}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log(`[AnimationCoordinator] Intersection change for group "${groupName}":`, {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            triggered: groupData.triggered
          });
          if (entry.isIntersecting && !groupData.triggered) {
            console.log(`[AnimationCoordinator] Group "${groupName}" scrolled into view, triggering!`);
            triggerGroup(groupName);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(elementToObserve);
    groupData.observer = observer;
  }

  function init() {
    console.log('[AnimationCoordinator] Initializing...');
    scanForAnimatedElements();
    console.log('[AnimationCoordinator] Initialization complete');
  }

  function scanForAnimatedElements() {
    // Scan for elements with data-anim-group attribute
    const elements = document.querySelectorAll('[data-anim-group]');
    console.log(`[AnimationCoordinator] Found ${elements.length} animated elements`);

    const triggersPerGroup = new Map(); // group -> { trigger, scrollTarget, scrollThreshold }

    elements.forEach((element) => {
      const group = element.dataset.animGroup;
      const delay = parseInt(element.dataset.animDelay || '0', 10);
      const type = element.dataset.animType || detectType(element);
      const trigger = element.dataset.animTrigger || 'scroll';
      const scrollTarget = element.dataset.animScrollTarget;
      const scrollThreshold = element.dataset.animScrollThreshold
        ? parseFloat(element.dataset.animScrollThreshold)
        : undefined;

      register(element, { group, delay, type });

      // Track trigger config for this group (use first element's config)
      if (!triggersPerGroup.has(group)) {
        triggersPerGroup.set(group, { trigger, scrollTarget, scrollThreshold });
      }
    });

    // Set up triggers once per group
    triggersPerGroup.forEach((config, group) => {
      if (config.trigger === 'scroll') {
        // Defer to allow all elements in group to register first
        setTimeout(() => {
          const options = {};
          if (config.scrollTarget) {
            options.target = config.scrollTarget;
          }
          if (config.scrollThreshold !== undefined) {
            options.threshold = config.scrollThreshold;
          }
          observeScroll(group, options);
        }, 0);
      } else if (config.trigger === 'load') {
        // Trigger immediately on load
        setTimeout(() => {
          triggerGroup(group);
        }, 0);
      }
    });
  }

  function detectType(element) {
    if (element.classList.contains('paper-component')) {
      return 'paper';
    } else if (element.dataset.canvasText === 'true') {
      return 'text';
    } else if (element.dataset.canvasTextArrow === 'true') {
      return 'arrow';
    }
    return 'unknown';
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.AnimationCoordinator = {
    register,
    triggerGroup,
    observeScroll,
    resetGroup,
    setElementDelay,
    getGroups,
  };
})();
