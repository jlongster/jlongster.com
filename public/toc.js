function run() {
  /* coloring table of contents for the active URL */

  function showActiveLinkInTOC() {
    for (let link of document.querySelectorAll('.toc a')) {
      if (
        link.href === window.location.href ||
        link.href.replace('#', '/') === window.location.href
      ) {
        link.classList.add('current');
      } else {
        link.classList.remove('current');
      }
    }
  }

  showActiveLinkInTOC();

  window.addEventListener('hashchange', () => {
    showActiveLinkInTOC();
  });

  /* make it scrollable when it transitions to stick */

  const toc = document.querySelector('.toc');
  console.log(toc);

  if (toc) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 1) {
          toc.style.overflow = 'hidden';
          toc.scrollTop = 0;
        } else {
          // It's fully in view, make it scrollable
          toc.style.overflow = 'auto';
        }
      },
      { threshold: [1] },
    );

    observer.observe(toc);
  }

  /* move the TOC down to align with the page content */
  // if (toc) {
  //   // assumes the `toc` variable exists
  //   const alignEl = document.querySelector('.page-content h1');

  //   if (alignEl != null) {
  //     const rect = alignEl.getBoundingClientRect();

  //     toc.style.marginTop = rect.top + 'px';
  //     toc.style.opacity = '1';
  //   }
  // }
}

document.addEventListener('DOMContentLoaded', () => {
  run();
});
