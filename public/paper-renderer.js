// Paper renderer - converts Paper components into animated Paper elements
(function () {
  console.log('[PaperRenderer] Script loaded');

  // Helper function to generate Paper HTML structure
  function createPaperHTML(htmlContent, paperStyle) {
    const width = 250;
    const height = 300;
    const numSlices = 10;
    const styles =
      paperStyle === 'image'
          ? `padding: 10px;
             padding-bottom: 50px;
             overflow: hidden;
             line-height: 0`
        : `padding: 20px`;

    // Check if content contains a video placeholder
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const videoPlaceholder = tempDiv.querySelector('[data-video-src]');
    const hasVideo = videoPlaceholder !== null;

    console.log('[PaperRenderer] Creating paper HTML, hasVideo:', hasVideo);

    // Paper content that will be repeated in each slice
    // Replace video placeholder with canvas for slices
    let sliceContent = htmlContent;
    if (hasVideo) {
      console.log('[PaperRenderer] Replacing video placeholder with canvas in slices');
      sliceContent = htmlContent.replace(
        /<div([^>]*data-video-src="[^"]*"[^>]*)><\/div>/g,
        (match, attrs) => {
          // Extract className from div attributes
          const classMatch = attrs.match(/class="([^"]*)"/);
          const className = classMatch ? classMatch[1] : '';
          console.log('[PaperRenderer] Replaced video placeholder with canvas, className:', className);
          return `<canvas class="${className} paper-video-canvas"></canvas>`;
        }
      );
    }

    const paperContent = `
      <div
        style="
          position: relative;
          width: 100%;
          height: 100%;
          margin: 0;
          border: 1px solid #f0f1ec;
          background-color: white;
          font-family: LoveLexie;
          color: #404031;
          box-sizing: border-box;
          ${styles}
        "
        class="bg-transparent"
      >
        ${sliceContent}
      </div>
    `;

    // Generate slices
    const slices = Array.from({ length: numSlices }, (_, i) => {
      const sliceHeight = height / numSlices;
      const startY = i * sliceHeight;
      const endY = (i + 1) * sliceHeight;

      return `
        <div
          class="paper-slice paper-slice-${i}"
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: ${width}px;
            height: ${height}px;
            clip-path: polygon(0 ${startY - 1}px, ${width}px ${
        startY - 1
      }px, ${width}px ${endY}px, 0 ${endY}px);
            transform-style: preserve-3d;
            backface-visibility: hidden;
            will-change: transform;
          "
        >
          ${paperContent}
        </div>
      `;
    }).join('');

    // If video exists, create actual hidden video element from placeholder
    const hiddenVideo = hasVideo && videoPlaceholder ? (() => {
      const videoSrc = videoPlaceholder.getAttribute('data-video-src');
      const className = videoPlaceholder.getAttribute('class') || '';

      console.log('[PaperRenderer] Creating hidden video element, src:', videoSrc);

      return `
        <div style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; overflow: hidden;">
          <video src="${videoSrc}" class="${className} paper-master-video" muted loop playsInline autoPlay></video>
        </div>
      `;
    })() : '';

    return `
      <div
        class="uncolored-links paper-element block relative text-black no-underline"
        style="visibility: hidden;"
      >
        ${hiddenVideo}
        ${slices}
      </div>
    `;
  }

  // Helper function to set data attributes on a paper element
  function setPaperAttributes(paperElement, config) {
    const {
      id,
      paperStyle,
      paperGroup,
      animationIndex,
      offsetX,
      offsetY,
      rotation,
      scale,
      startDelay,
      startKeyframe,
      endKeyframe,
    } = config;

    paperElement.setAttribute('data-paper-component', 'true');
    if (id) {
      paperElement.setAttribute('data-paper-id', id);
    }
    if (paperStyle) {
      paperElement.setAttribute('data-paper-style', paperStyle);
    }
    paperElement.setAttribute('data-animation-index', animationIndex);
    paperElement.setAttribute('data-offset-x', offsetX);
    paperElement.setAttribute('data-offset-y', offsetY);
    paperElement.setAttribute('data-rotation', rotation);
    paperElement.setAttribute('data-scale', scale);
    paperElement.setAttribute('data-start-delay', startDelay);
    paperElement.setAttribute('data-start-keyframe', startKeyframe);
    paperElement.setAttribute('data-end-keyframe', endKeyframe);
    if (paperGroup) {
      paperElement.setAttribute('data-paper-group', paperGroup);
    }
  }

  // Expose API for devtools
  window.PaperRenderer = {
    restartAll: function () {
      console.log('[PaperRenderer] Restarting all animations');

      // Find all existing paper elements and restart each one
      const paperElements = document.querySelectorAll('[data-paper-id]');
      console.log(
        '[PaperRenderer] Found',
        paperElements.length,
        'paper elements to restart',
      );

      paperElements.forEach(paperElement => {
        const id = paperElement.getAttribute('data-paper-id');
        if (id) {
          this.restartAnimator(id);
        }
      });
    },
    restartAnimator: function (id) {
      console.log('[PaperRenderer] Restarting animator:', id);

      // Unregister the animator instance first
      if (window.PaperAnimator) {
        window.PaperAnimator.unregisterAnimator(id);
      }

      // Find the specific paper element with this ID
      const paperElement = document.querySelector(`[data-paper-id="${id}"]`);
      if (!paperElement) {
        console.warn('[PaperRenderer] Paper element not found with id:', id);
        return;
      }

      // Get the wrapper and its HTML content
      const wrapper = paperElement.closest('.paper-component-wrapper');
      if (!wrapper) {
        console.warn('[PaperRenderer] Wrapper not found for paper:', id);
        return;
      }

      // Get the paper style and group from the paper element
      const paperStyle =
        paperElement.getAttribute('data-paper-style') || 'text';
      const paperGroup = paperElement.getAttribute('data-paper-group') || null;

      // Get the animation config from PaperAnimator (which has the latest saved config)
      let config;
      if (window.PaperAnimator && window.PaperAnimator.getConfig) {
        config = window.PaperAnimator.getConfig(id);
      }

      // Fall back to reading from data attributes if no saved config
      if (!config) {
        config = {
          animationIndex:
            parseInt(paperElement.getAttribute('data-animation-index')) || 0,
          offsetX: parseFloat(paperElement.getAttribute('data-offset-x')) || 0,
          offsetY: parseFloat(paperElement.getAttribute('data-offset-y')) || 0,
          rotation: parseFloat(paperElement.getAttribute('data-rotation')) || 0,
          scale: parseFloat(paperElement.getAttribute('data-scale')) || 1,
          startDelay:
            parseInt(paperElement.getAttribute('data-start-delay')) || 0,
          startKeyframe:
            parseInt(paperElement.getAttribute('data-start-keyframe')) || 0,
          endKeyframe:
            parseInt(paperElement.getAttribute('data-end-keyframe')) || 59,
        };
      }

      const {
        animationIndex,
        offsetX,
        offsetY,
        rotation,
        scale,
        startDelay,
        startKeyframe,
        endKeyframe,
      } = config;

      // Get the HTML content from the first slice's content div
      const contentDiv = paperElement.querySelector('.paper-slice > div');
      let htmlContent = contentDiv ? contentDiv.innerHTML : '';

      // If this paper has a video, we need to restore the original video placeholder
      // because the slices currently have canvas elements, not the original div[data-video-src]
      const masterVideo = paperElement.querySelector('.paper-master-video');
      if (masterVideo) {
        const videoSrc = masterVideo.getAttribute('src');
        const videoClass = masterVideo.getAttribute('class').replace('paper-master-video', '').trim();

        console.log('[PaperRenderer] Restoring video placeholder for restart, src:', videoSrc);

        // Replace canvas elements with the original video placeholder
        htmlContent = htmlContent.replace(
          /<canvas[^>]*class="[^"]*paper-video-canvas[^"]*"[^>]*><\/canvas>/g,
          `<div class="${videoClass}" data-video-src="${videoSrc}"></div>`
        );
      }

      // Clear the wrapper's content and regenerate
      wrapper.innerHTML = '';
      wrapper.className = 'paper-component-wrapper';
      wrapper.style.cssText = 'position: relative;';

      // Generate the Paper HTML structure using helper function
      wrapper.innerHTML = createPaperHTML(htmlContent, paperStyle);

      // Mark the paper element with animation config and ID
      const newPaperElement = wrapper.querySelector('.paper-element');
      if (newPaperElement) {
        setPaperAttributes(newPaperElement, {
          id,
          paperStyle,
          paperGroup,
          animationIndex,
          offsetX,
          offsetY,
          rotation,
          scale,
          startDelay,
          startKeyframe,
          endKeyframe,
        });
      }

      // Don't manually trigger initialization - let the MutationObserver handle it
      // This prevents duplicate initialization when restarting multiple papers
    },
  };

  function init() {
    console.log('[PaperRenderer] Initializing...');

    // Find all Paper component elements
    const paperComponents = document.querySelectorAll('.paper-component');
    console.log(
      '[PaperRenderer] Found',
      paperComponents.length,
      'paper components',
    );

    if (paperComponents.length === 0) {
      console.log('[PaperRenderer] No paper components found');
      return;
    }

    paperComponents.forEach((component, index) => {
      // Get the HTML content from inside the component
      const htmlContent = component.innerHTML;
      const paperStyle = component.getAttribute('data-paper-style') || 'text';
      const animationIndex =
        parseInt(component.getAttribute('data-animation-index')) || 0;
      const offsetX = parseFloat(component.getAttribute('data-offset-x')) || 0;
      const offsetY = parseFloat(component.getAttribute('data-offset-y')) || 0;
      const rotation = parseFloat(component.getAttribute('data-rotation')) || 0;
      const scale = parseFloat(component.getAttribute('data-scale')) || 1;
      const startDelay =
        parseInt(component.getAttribute('data-start-delay')) || 0;
      const startKeyframe =
        parseInt(component.getAttribute('data-start-keyframe')) || 0;
      const endKeyframe =
        parseInt(component.getAttribute('data-end-keyframe')) || 59;

      // Check if parent element has a group name
      const parentGroup =
        component.parentElement?.getAttribute('data-paper-group') || null;

      console.log('[PaperRenderer] Processing paper component:', {
        index,
        paperStyle,
        animationIndex,
        offsetX,
        offsetY,
        rotation,
        scale,
      });

      // Clear the component's content and set it up as the wrapper
      component.innerHTML = '';
      component.className = 'paper-component-wrapper';
      component.style.cssText = 'position: relative;';

      // Generate the Paper HTML structure using helper function and append as child
      component.innerHTML = createPaperHTML(htmlContent, paperStyle);

      // Mark the paper element with animation config
      const paperElement = component.querySelector('.paper-element');
      if (paperElement) {
        setPaperAttributes(paperElement, {
          paperStyle,
          paperGroup: parentGroup,
          animationIndex,
          offsetX,
          offsetY,
          rotation,
          scale,
          startDelay,
          startKeyframe,
          endKeyframe,
        });
      }
    });

    console.log('[PaperRenderer] Initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    console.log('[PaperRenderer] Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('[PaperRenderer] DOM already ready, initializing immediately');
    init();
  }
})();
