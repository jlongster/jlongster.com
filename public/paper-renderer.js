// Paper renderer - converts posts from DOM into Paper elements
(function () {
  let allPosts = [];
  let postsPerBlock = 5;
  let hasMore = true;
  let isLoading = false;
  let observer = null;

  console.log('[PaperRenderer] Script loaded');

  // Expose API for devtools
  window.PaperRenderer = {
    restartAll: function () {
      console.log('[PaperRenderer] Restarting all animations');
      unmountAllPapers();
      init();
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

      // Get the wrapper div
      const wrapper = paperElement.closest('.col-start-1.row-start-1');
      if (!wrapper) {
        console.warn(
          '[PaperRenderer] Wrapper not found for paper element:',
          id,
        );
        return;
      }

      // Get the parent block
      const block = wrapper.parentElement;
      const blockId = parseInt(block.getAttribute('data-block-id'));

      // Calculate which post within the block this is
      const wrappers = Array.from(
        block.querySelectorAll('.col-start-1.row-start-1'),
      );
      const wrapperIndex = wrappers.indexOf(wrapper);
      const postIndex = blockId * postsPerBlock + wrapperIndex;

      console.log(
        '[PaperRenderer] Found post at index',
        postIndex,
        'in block',
        blockId,
      );

      // Get the post data
      const post = allPosts[postIndex];
      if (!post) {
        console.warn('[PaperRenderer] Post not found at index', postIndex);
        return;
      }

      // Remove the old wrapper
      wrapper.remove();

      // Create new wrapper
      const newWrapper = document.createElement('div');
      newWrapper.className = 'col-start-1 row-start-1';

      // Generate the Paper HTML directly with the same ID
      newWrapper.innerHTML = window.generatePaperHTML({
        title: post.title,
        url: post.url,
        content: post.abstract,
        image: post.image,
        rotation: 0,
      });

      // Set the ID on the new paper element
      const newPaperElement = newWrapper.querySelector('.paper-element');
      if (newPaperElement) {
        newPaperElement.setAttribute('data-paper-id', id);
      }

      // Insert at the same position
      if (wrapperIndex === 0) {
        block.insertBefore(newWrapper, block.firstChild);
      } else if (wrapperIndex < wrappers.length - 1) {
        block.insertBefore(newWrapper, wrappers[wrapperIndex + 1]);
      } else {
        block.appendChild(newWrapper);
      }
    },
  };

  function unmountAllPapers() {
    console.log('[PaperRenderer] Unmounting all paper elements');

    // Reset animators first
    if (window.PaperAnimator) {
      window.PaperAnimator.resetAll();
    }

    // Remove all rendered blocks except the initial one
    const container = document.getElementById('scroll-container');
    if (container) {
      const blocks = container.querySelectorAll('[data-block-id]');
      blocks.forEach(block => {
        if (block.getAttribute('data-block-id') === '0') {
          // Clear block 0
          block.innerHTML = '';
          block.classList.remove('sentinel-block');
        } else {
          // Remove other blocks
          block.remove();
        }
      });
    }

    // Reset state
    hasMore = true;
    isLoading = false;
  }

  function init() {
    console.log('[PaperRenderer] Initializing...');

    // Scrape all posts from the DOM
    const postsList = document.getElementById('all-posts');
    if (postsList) {
      const postItems = postsList.querySelectorAll('.post-item');
      allPosts = Array.from(postItems).map(item => ({
        title: item.getAttribute('data-title') || '',
        url: item.getAttribute('data-url') || '',
        abstract: item.getAttribute('data-abstract') || '',
        image: item.getAttribute('data-image') || '',
      }));
      console.log('[PaperRenderer] Scraped', allPosts.length, 'posts from DOM');
    }

    // Render initial block (block 0)
    const initialBlock = document.querySelector('[data-block-id="0"]');
    if (initialBlock) {
      renderPostsIntoBlock(0, initialBlock);
    }

    // Setup intersection observer for infinite scroll
    setupIntersectionObserver();

    // Create first sentinel if we have more posts
    if (allPosts.length > postsPerBlock) {
      hasMore = true;
      createSentinelBlock(1);
    } else {
      hasMore = false;
    }

    console.log('[PaperRenderer] Initialization complete');
  }

  function renderPostsIntoBlock(blockId, blockElement) {
    const offset = blockId * postsPerBlock;
    const posts = allPosts.slice(offset, offset + postsPerBlock);

    console.log(
      '[PaperRenderer] Rendering',
      posts.length,
      'posts into block',
      blockId,
    );

    posts.forEach((post, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'col-start-1 row-start-1';

      // Generate the Paper HTML directly
      wrapper.innerHTML = window.generatePaperHTML({
        title: post.title,
        url: post.url,
        content: post.abstract,
        image: post.image,
        rotation: 0,
      });

      blockElement.appendChild(wrapper);
    });
  }

  function setupIntersectionObserver() {
    observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const blockId = parseInt(entry.target.getAttribute('data-block-id'));

          if (entry.isIntersecting) {
            const block = entry.target;
            const isSentinel = block.classList.contains('sentinel-block');

            if (isSentinel && !isLoading && hasMore) {
              console.log('[PaperRenderer] Loading posts for block:', blockId);
              loadPostsForBlock(blockId, block);
            }
          }
        });
      },
      {
        rootMargin: '0px',
        threshold: 0.5,
      },
    );
  }

  function loadPostsForBlock(blockId, blockElement) {
    if (isLoading) {
      console.log('[PaperRenderer] Already loading, skipping');
      return;
    }

    console.log('[PaperRenderer] Loading block:', blockId);
    isLoading = true;

    // Show loading state
    blockElement.innerHTML =
      '<div class="text-gray-500 text-lg">Loading...</div>';

    // Get posts for this block
    const offset = blockId * postsPerBlock;
    const posts = allPosts.slice(offset, offset + postsPerBlock);
    hasMore = offset + postsPerBlock < allPosts.length;

    console.log(
      '[PaperRenderer] Rendering',
      posts.length,
      'posts, hasMore:',
      hasMore,
    );

    if (posts.length > 0) {
      // Remove sentinel class
      blockElement.classList.remove('sentinel-block');

      // Clear loading message
      blockElement.innerHTML = '';

      // Render posts into this block
      renderPostsIntoBlock(blockId, blockElement);

      // If there are more posts, create another sentinel block
      if (hasMore) {
        console.log(
          '[PaperRenderer] Creating next sentinel block:',
          blockId + 1,
        );
        createSentinelBlock(blockId + 1);
      } else {
        console.log('[PaperRenderer] No more posts to load');
      }
    } else {
      console.log('[PaperRenderer] No posts returned, removing block');
      hasMore = false;
      blockElement.remove();
    }

    isLoading = false;
  }

  function createSentinelBlock(blockId) {
    const container = document.getElementById('scroll-container');
    if (!container) {
      console.warn('[PaperRenderer] Container not found for sentinel block');
      return;
    }

    const block = document.createElement('div');
    block.className = 'p-8 overflow-visible grid sentinel-block';
    block.style.height = 'min(100vh, 800px)';
    block.setAttribute('data-block-id', blockId);
    block.innerHTML = ''; // Empty sentinel

    container.appendChild(block);

    // Observe this block
    if (observer) {
      observer.observe(block);
      console.log('[PaperRenderer] Observing sentinel block:', blockId);
    }
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
