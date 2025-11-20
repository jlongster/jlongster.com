// Paper renderer - converts posts from DOM into Paper elements
(function () {
  let allPosts = [];
  let postsPerBlock = 3;
  let hasMore = true;
  let isLoading = false;
  let observer = null;

  console.log('[PaperRenderer] Script loaded');

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
        rotation: 0,
      });

      blockElement.appendChild(wrapper);
    });
  }

  function setupIntersectionObserver() {
    console.log('[PaperRenderer] Setting up IntersectionObserver');
    observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const blockId = parseInt(entry.target.getAttribute('data-block-id'));

          // Only trigger when element is fully in view
          if (entry.isIntersecting && entry.intersectionRatio >= 1.0) {
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
        threshold: 1.0,
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
        console.log('[PaperRenderer] Creating next sentinel block:', blockId + 1);
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
    console.log('[PaperRenderer] Creating sentinel block:', blockId);
    const container = document.getElementById('scroll-container');
    if (!container) {
      console.warn('[PaperRenderer] Container not found for sentinel block');
      return;
    }

    const block = document.createElement('div');
    block.className =
      'h-[800px] p-8 overflow-visible grid place-items-center sentinel-block';
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
