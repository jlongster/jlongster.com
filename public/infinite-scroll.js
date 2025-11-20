// Infinite scroll handler for paper elements
(function () {
  let nextOffset = 3; // Start after the initial 3 posts
  let hasMore = true;
  let isLoading = false;
  let observer = null;

  console.log('[InfiniteScroll] Script loaded');

  function init() {
    console.log('[InfiniteScroll] Initializing...');
    const container = document.getElementById('scroll-container');
    if (!container) {
      console.warn('[InfiniteScroll] Scroll container not found');
      return;
    }

    console.log('[InfiniteScroll] Container found:', container);

    hasMore = container.getAttribute('data-has-more') === 'true';
    console.log('[InfiniteScroll] hasMore:', hasMore);

    // Setup observer first
    setupIntersectionObserver();

    // If we have more posts, create the first sentinel block
    if (hasMore) {
      console.log('[InfiniteScroll] Creating first sentinel block');
      createSentinelBlock(1);
    }

    console.log('[InfiniteScroll] Initialization complete');
  }

  function setupIntersectionObserver() {
    console.log('[InfiniteScroll] Setting up IntersectionObserver');
    observer = new IntersectionObserver(
      entries => {
        console.log(
          '[InfiniteScroll] Observer triggered, entries:',
          entries.length,
        );
        entries.forEach(entry => {
          const blockId = parseInt(entry.target.getAttribute('data-block-id'));
          console.log(
            '[InfiniteScroll] Entry - blockId:',
            blockId,
            'isIntersecting:',
            entry.isIntersecting,
            'intersectionRatio:',
            entry.intersectionRatio,
          );

          // Only trigger when element is fully in view (100% visible)
          if (entry.isIntersecting && entry.intersectionRatio >= 1.0) {
            const block = entry.target;
            const isSentinel = block.classList.contains('sentinel-block');

            console.log(
              '[InfiniteScroll] Block fully visible - isSentinel:',
              isSentinel,
              'isLoading:',
              isLoading,
              'hasMore:',
              hasMore,
            );

            if (isSentinel && !isLoading && hasMore) {
              console.log('[InfiniteScroll] Loading posts for block:', blockId);
              loadPostsForBlock(blockId, block);
            }
          }
        });
      },
      {
        rootMargin: '0px', // No margin - must be actually in viewport
        threshold: 1.0, // 100% of element must be visible
      },
    );
    console.log('[InfiniteScroll] Observer created:', observer);
  }

  async function loadPostsForBlock(blockId, blockElement) {
    if (isLoading) {
      console.log('[InfiniteScroll] Already loading, skipping');
      return;
    }

    console.log(
      '[InfiniteScroll] Starting load for block:',
      blockId,
      'offset:',
      nextOffset,
    );
    isLoading = true;

    // Show loading state
    blockElement.innerHTML =
      '<div class="text-gray-500 text-lg">Loading...</div>';

    try {
      const url = `/api/posts?offset=${nextOffset}&limit=3`;
      console.log('[InfiniteScroll] Fetching:', url);
      const response = await fetch(url);
      console.log('[InfiniteScroll] Response status:', response.status);

      const data = await response.json();
      console.log('[InfiniteScroll] Data received:', data);

      if (data.posts && data.posts.length > 0) {
        console.log(
          '[InfiniteScroll] Adding',
          data.posts.length,
          'posts to block',
        );

        // Remove sentinel class
        blockElement.classList.remove('sentinel-block');

        // Clear loading message
        blockElement.innerHTML = '';

        // Add posts to the block
        data.posts.forEach((post, index) => {
          console.log(
            '[InfiniteScroll] Creating post element:',
            index,
            post.title,
          );
          const postDiv = document.createElement('div');
          postDiv.className = 'col-start-1 row-start-1';
          postDiv.innerHTML = window.generatePaperHTML({
            title: post.title,
            url: post.url,
            content: post.abstract || '',
            rotation: 0,
          });
          blockElement.appendChild(postDiv);
        });

        nextOffset += 3;
        hasMore = data.hasMore;
        console.log(
          '[InfiniteScroll] Updated state - nextOffset:',
          nextOffset,
          'hasMore:',
          hasMore,
        );

        // If there are more posts, create another sentinel block
        if (data.hasMore) {
          console.log(
            '[InfiniteScroll] Creating next sentinel block:',
            blockId + 1,
          );
          createSentinelBlock(blockId + 1);
        } else {
          console.log('[InfiniteScroll] No more posts to load');
        }
      } else {
        console.log('[InfiniteScroll] No posts returned, removing block');
        hasMore = false;
        blockElement.remove();
      }
    } catch (error) {
      console.error('[InfiniteScroll] Failed to load posts:', error);
      blockElement.innerHTML =
        '<div class="text-red-500 text-lg">Failed to load posts</div>';
    } finally {
      isLoading = false;
      console.log('[InfiniteScroll] Load complete, isLoading:', isLoading);
    }
  }

  function createSentinelBlock(blockId) {
    console.log('[InfiniteScroll] Creating sentinel block:', blockId);
    const container = document.getElementById('scroll-container');
    if (!container) {
      console.warn('[InfiniteScroll] Container not found for sentinel block');
      return;
    }

    const block = document.createElement('div');
    block.className =
      'h-[800px] p-8 overflow-visible grid place-items-center sentinel-block';
    block.setAttribute('data-block-id', blockId);
    block.innerHTML = ''; // Empty sentinel

    container.appendChild(block);
    console.log('[InfiniteScroll] Sentinel block appended to container');

    // Observe this block
    if (observer) {
      observer.observe(block);
      console.log('[InfiniteScroll] Observing sentinel block:', blockId);
    } else {
      console.warn(
        '[InfiniteScroll] Observer not available for block:',
        blockId,
      );
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    console.log('[InfiniteScroll] Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('[InfiniteScroll] DOM already ready, initializing immediately');
    init();
  }
})();
