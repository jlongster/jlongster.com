// Paper renderer - converts posts from DOM into Paper elements
(function () {
  let allPosts = [];
  let postsPerBlock = 5;
  let hasMore = true;
  let isLoading = false;
  let observer = null;
  let scrollListId = null; // The list ID for infinite scroll

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

      // Save the source list attribute before removing the element
      const sourceListId = paperElement.getAttribute('data-source-list');

      // Check if this is an inline paper or a block paper
      const inlineWrapper = paperElement.closest('.inline-paper-wrapper');
      const blockWrapper = paperElement.closest('.col-start-1.row-start-1');

      if (inlineWrapper) {
        // Handle inline paper restart
        console.log('[PaperRenderer] Restarting inline paper:', id);

        // Get the post data from the paper element's content
        const titleLink = paperElement.querySelector('a');
        const title = titleLink ? titleLink.textContent : '';
        const url = titleLink ? titleLink.getAttribute('href') : '';
        const img = paperElement.querySelector('img');
        const image = img ? img.getAttribute('src') : '';
        const contentDiv = paperElement.querySelector(
          'div[style*="font-size: 13px"]',
        );
        const content = contentDiv ? contentDiv.textContent : '';
        const paperStyle =
          paperElement.getAttribute('data-paper-style') || 'text';
        const paperWidth =
          parseInt(paperElement.getAttribute('data-paper-width')) || 250;
        const paperHeight =
          parseInt(paperElement.getAttribute('data-paper-height')) || 300;

        // Get the parent container and next sibling for reinsertion
        const parentContainer = inlineWrapper.parentElement;
        const nextSibling = inlineWrapper.nextSibling;

        // Remove the old wrapper
        inlineWrapper.remove();

        // Create new wrapper
        const newWrapper = document.createElement('div');
        newWrapper.className = 'inline-paper-wrapper';
        newWrapper.style.cssText = 'position: relative; margin-bottom: 20px;';

        // Generate the Paper HTML
        newWrapper.innerHTML = window.generatePaperHTML({
          title: title,
          url: url,
          content: content,
          image: image,
          paperStyle: paperStyle,
          width: paperWidth,
          height: paperHeight,
        });

        // Set the ID, source list, and paper style on the new paper element
        const newPaperElement = newWrapper.querySelector('.paper-element');
        if (newPaperElement) {
          newPaperElement.setAttribute('data-paper-id', id);
          newPaperElement.setAttribute('data-paper-style', paperStyle);
          newPaperElement.setAttribute('data-paper-width', paperWidth);
          newPaperElement.setAttribute('data-paper-height', paperHeight);
          if (sourceListId) {
            newPaperElement.setAttribute('data-source-list', sourceListId);
          }
        }

        // Insert at the same position
        if (nextSibling) {
          parentContainer.insertBefore(newWrapper, nextSibling);
        } else {
          parentContainer.appendChild(newWrapper);
        }
      } else if (blockWrapper) {
        // Handle block paper restart (infinite scroll)
        console.log('[PaperRenderer] Restarting block paper:', id);

        // Get the parent block
        const block = blockWrapper.parentElement;
        const blockId = parseInt(block.getAttribute('data-block-id'));

        // Calculate which post within the block this is
        const wrappers = Array.from(
          block.querySelectorAll('.col-start-1.row-start-1'),
        );
        const wrapperIndex = wrappers.indexOf(blockWrapper);
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
        blockWrapper.remove();

        // Create new wrapper
        const newWrapper = document.createElement('div');
        newWrapper.className = 'col-start-1 row-start-1';

        // Generate the Paper HTML directly with the same ID
        newWrapper.innerHTML = window.generatePaperHTML({
          title: post.title,
          url: post.url,
          content: post.abstract,
          image: post.image,
          paperStyle: post.paperStyle,
          width: post.width,
          height: post.height,
        });

        // Set the ID, source list, and paper style on the new paper element
        const newPaperElement = newWrapper.querySelector('.paper-element');
        if (newPaperElement) {
          newPaperElement.setAttribute('data-paper-id', id);
          newPaperElement.setAttribute(
            'data-paper-style',
            post.paperStyle || 'text',
          );
          newPaperElement.setAttribute('data-paper-width', post.width || 250);
          newPaperElement.setAttribute('data-paper-height', post.height || 300);
          if (sourceListId) {
            newPaperElement.setAttribute('data-source-list', sourceListId);
          }
        }

        // Insert at the same position
        if (wrapperIndex === 0) {
          block.insertBefore(newWrapper, block.firstChild);
        } else if (wrapperIndex < wrappers.length - 1) {
          block.insertBefore(newWrapper, wrappers[wrapperIndex + 1]);
        } else {
          block.appendChild(newWrapper);
        }
      } else {
        console.warn('[PaperRenderer] Could not find wrapper for paper:', id);
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

    // Remove all inline paper containers
    const inlineContainers = document.querySelectorAll(
      '.inline-papers-container',
    );
    inlineContainers.forEach(container => {
      container.remove();
    });

    // Show all PostsList elements again (they were hidden during init)
    const postsLists = document.querySelectorAll('ul.list-none');
    postsLists.forEach(list => {
      list.style.display = '';
    });

    // Reset state
    hasMore = true;
    isLoading = false;
  }

  function init() {
    console.log('[PaperRenderer] Initializing...');

    // Get the PostsList ID from the initial block's data attribute
    const initialBlock = document.querySelector('[data-block-id="0"]');
    scrollListId = initialBlock?.getAttribute('data-posts-list') || 'all-posts';

    // Scrape posts ONLY from the specific list for infinite scroll
    // This allows other PostsList components to remain as regular HTML
    const scrollList = document.getElementById(scrollListId);

    if (!scrollList) {
      console.warn('[PaperRenderer] Scroll list not found:', scrollListId);
      return;
    }

    const paperStyle = scrollList.getAttribute('data-paper-style') || 'text';
    const paperWidth =
      parseInt(scrollList.getAttribute('data-paper-width')) || 250;
    const paperHeight =
      parseInt(scrollList.getAttribute('data-paper-height')) || 300;

    const postItems = scrollList.querySelectorAll('.post-item');
    allPosts = Array.from(postItems).map(item => ({
      title: item.getAttribute('data-title') || '',
      url: item.getAttribute('data-url') || '',
      abstract: item.getAttribute('data-abstract') || '',
      image: item.getAttribute('data-image') || '',
      paperStyle: paperStyle,
      width: paperWidth,
      height: paperHeight,
    }));

    // Read animation configs from the list's data attribute
    const animationConfigsAttr = scrollList.getAttribute(
      'data-animation-configs',
    );
    let animationConfigs = null;
    if (animationConfigsAttr) {
      try {
        animationConfigs = JSON.parse(animationConfigsAttr);
        console.log(
          '[PaperRenderer] Loaded',
          animationConfigs.length,
          'animation configs from',
          scrollListId,
        );
      } catch (error) {
        console.error(
          '[PaperRenderer] Failed to parse animation configs:',
          error,
        );
      }
    }

    // Expose animation configs to PaperAnimator (or notify it even if none provided)
    if (window.PaperAnimator) {
      if (animationConfigs && animationConfigs.length > 0) {
        window.PaperAnimator.setAnimationConfigs(
          scrollListId,
          animationConfigs,
        );
      } else {
        console.log(
          '[PaperRenderer] No animation configs provided, will use defaults',
        );
      }
    }

    // Hide the scroll list after scraping so only paper elements show
    scrollList.style.display = 'none';

    console.log(
      '[PaperRenderer] Scraped',
      allPosts.length,
      'posts from',
      scrollListId,
    );

    // Render initial block (block 0) - already declared at top
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

    // Handle all OTHER PostsList components - render them as inline paper elements
    const allPostsLists = document.querySelectorAll('ul.list-none');
    allPostsLists.forEach(postsList => {
      const listId = postsList.getAttribute('id');

      // Skip the list that's being used for infinite scroll
      if (listId === scrollListId) {
        return;
      }

      // Scrape posts from this list
      const listPaperStyle =
        postsList.getAttribute('data-paper-style') || 'text';
      const listPaperWidth =
        parseInt(postsList.getAttribute('data-paper-width')) || 250;
      const listPaperHeight =
        parseInt(postsList.getAttribute('data-paper-height')) || 300;
      const postItems = postsList.querySelectorAll('.post-item');
      const posts = Array.from(postItems).map(item => ({
        title: item.getAttribute('data-title') || '',
        url: item.getAttribute('data-url') || '',
        abstract: item.getAttribute('data-abstract') || '',
        image: item.getAttribute('data-image') || '',
        paperStyle: listPaperStyle,
        width: listPaperWidth,
        height: listPaperHeight,
      }));

      if (posts.length === 0) {
        return;
      }

      console.log(
        '[PaperRenderer] Rendering',
        posts.length,
        'inline papers for list:',
        listId,
      );

      // Read animation configs from this list (if any)
      const configsAttr = postsList.getAttribute('data-animation-configs');
      let configs = null;
      if (configsAttr) {
        try {
          configs = JSON.parse(configsAttr);
        } catch (error) {
          console.error(
            '[PaperRenderer] Failed to parse configs for inline list:',
            listId,
            error,
          );
        }
      }

      // Create a container for paper elements beside the original list
      const paperContainer = document.createElement('div');
      paperContainer.className = 'inline-papers-container';
      paperContainer.style.cssText = 'position: relative;';
      // Store list ID on container so animator can identify which list these papers belong to
      paperContainer.setAttribute('data-source-list', listId);

      // Insert the container after the original list
      postsList.parentNode.insertBefore(paperContainer, postsList.nextSibling);

      // Set configs for this list in the animator (if provided)
      if (configs && configs.length > 0 && window.PaperAnimator) {
        window.PaperAnimator.setAnimationConfigs(listId, configs);
      }

      // Render each post as a paper element
      posts.forEach((post, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-paper-wrapper';
        wrapper.style.cssText = 'position: relative; margin-bottom: 20px;';

        // Generate the Paper HTML
        wrapper.innerHTML = window.generatePaperHTML({
          title: post.title,
          url: post.url,
          content: post.abstract,
          image: post.image,
          rotation: 0,
          paperStyle: post.paperStyle,
          width: post.width,
          height: post.height,
        });

        // Mark the paper element with its source list and paper style
        const paperElement = wrapper.querySelector('.paper-element');
        if (paperElement) {
          paperElement.setAttribute('data-source-list', listId);
          paperElement.setAttribute(
            'data-paper-style',
            post.paperStyle || 'text',
          );
          paperElement.setAttribute('data-paper-width', post.width || 250);
          paperElement.setAttribute('data-paper-height', post.height || 300);
        }

        paperContainer.appendChild(wrapper);
      });

      // Hide the original list
      postsList.style.display = 'none';
    });

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
        paperStyle: post.paperStyle,
        width: post.width,
        height: post.height,
      });

      // Mark the paper element with its source list and paper style
      const paperElement = wrapper.querySelector('.paper-element');
      if (paperElement && scrollListId) {
        paperElement.setAttribute('data-source-list', scrollListId);
        paperElement.setAttribute(
          'data-paper-style',
          post.paperStyle || 'text',
        );
        paperElement.setAttribute('data-paper-width', post.width || 250);
        paperElement.setAttribute('data-paper-height', post.height || 300);
      }

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
