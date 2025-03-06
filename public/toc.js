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

if (toc) {
  // assumes the `toc` variable exists
  const pageContent = document.querySelector('.page-content');

  // Look 5 elements ahead
  let idx;
  for (let i = 0; i < 5; i++) {
    let child = pageContent.childNodes[i];
    if (
      !(
        child.nodeType === Node.TEXT_NODE ||
        child.classList.contains('title') ||
        child.classList.contains('properties')
      )
    ) {
      idx = i;
      break;
    }
  }

  if (idx) {
    const el = pageContent.childNodes[idx];
    const rect = el.getBoundingClientRect();

    toc.style.marginTop = rect.top - 5 + 'px';
    toc.style.opacity = '1';
  }
}
