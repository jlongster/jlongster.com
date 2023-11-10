const codeBlockCache = new Map();

const mq = window.matchMedia('(max-width: 800px)');
let isSmallScreen = mq.matches;
mq.addEventListener('change', e => {
  isSmallScreen = e.matches;

  const wrappers = [
    ...document.querySelectorAll('.code-look-wrapper[data-opened=true]'),
  ];

  for (let wrapper of wrappers) {
    closeWrapper(wrapper, false);
    openWrapper(wrapper, false);
  }

  __relayout(wrappers);
});

function __relayout(elements) {
  for (let wrapper of elements) {
    if (isSmallScreen) {
      wrapper.style.height = 'auto';
    } else {
      const uuid = wrapper.dataset['blockId'];
      const code = document.getElementById(`code-${uuid}`);

      if (code) {
        let { top, right, height } = wrapper.getBoundingClientRect();
        top += document.documentElement.scrollTop;
        code.style.top = top + 'px';
        code.style.left = right + 'px';

        const { height: codeHeight } = code.getBoundingClientRect();
        if (codeHeight > height) {
          wrapper.style.height = codeHeight + 'px';
        }
      } else {
        wrapper.style.height = 'auto';
      }
    }
  }
}

function adjustPage(hasOpenCode) {
  let transitionEnd = null;
  const pageContent = document.querySelector('.page-content');

  if (isSmallScreen) {
    pageContent.style.transform = '';
    return null;
  } else {
    if (hasOpenCode) {
      pageContent.style.transition = 'transform .25s';
      pageContent.style.transform = 'translateX(0px)';

      return new Promise(resolve => {
        pageContent.addEventListener('transitionend', resolve);
      });
    } else {
      pageContent.style.transform = '';
      return new Promise(resolve => {
        pageContent.addEventListener('transitionend', resolve);
      });
    }
  }
}

async function openWrapper(wrapper, shouldAnimate) {
  const btn = wrapper.querySelector('.code-look-button');
  const uuid = wrapper.dataset['blockId'];

  const wrappers = [
    ...document.querySelectorAll('.code-look-wrapper[data-opened=true]'),
  ];
  const changedIdx = wrappers.findIndex(el => el === wrapper);
  const needsLayout = wrappers.slice(changedIdx);

  // Opening
  wrapper.dataset.opened = 'true';
  btn.innerHTML = 'close source';

  let transitionEnd;
  if (shouldAnimate && wrappers.length === 0) {
    transitionEnd = adjustPage(true);
  }

  let codeBlocks = codeBlockCache.get(uuid);
  if (!codeBlocks) {
    const res = await fetch(`/code-look/${uuid}`);
    const json = await res.json();
    codeBlockCache.set(uuid, json);
    codeBlocks = json;
  }

  const div = document.createElement('div');
  div.id = `code-${uuid}`;
  div.className = 'code-look-code';
  div.style.whiteSpace = 'pre';
  div.style.transition = 'opacity .25s';
  div.style.opacity = shouldAnimate ? 0 : 1;

  for (let codeBlock of codeBlocks) {
    const cb = document.createElement('div');
    cb.textContent = codeBlock;
    cb.style.overflow = 'auto';
    div.appendChild(cb);
  }

  if (isSmallScreen) {
    wrapper.appendChild(div);
  } else {
    div.style.position = 'absolute';
    div.style.width = 'calc(100vw - (var(--outer-spacing) + 800px))';
    document.body.appendChild(div);
  }

  if (shouldAnimate) {
    await transitionEnd;

    setTimeout(() => {
      div.style.opacity = 1;
    }, 0);
  }

  needsLayout.push(wrapper);

  return needsLayout;
}

function closeWrapper(wrapper, shouldAnimate) {
  const uuid = wrapper.dataset['blockId'];
  const wrappers = [
    ...document.querySelectorAll('.code-look-wrapper[data-opened=true]'),
  ];
  const changedIdx = wrappers.findIndex(el => el === wrapper);
  const needsLayout = wrappers.slice(changedIdx);
  __relayout(needsLayout);

  const btn = wrapper.querySelector('.code-look-button');
  wrapper.dataset.opened = '';
  btn.innerHTML = 'view source';

  // This is guaranteed to always exist (right?)
  document.getElementById(`code-${uuid}`).remove();

  // If this was the only wrapper open, now everything is closed
  if (shouldAnimate && wrappers.length === 1) {
    adjustPage(false);
  }

  return needsLayout;
}

function __injectCodeLook(el) {
  const btn = document.createElement('button');
  btn.className = 'code-look-button';
  btn.innerHTML = 'view source';

  const wrapper = el.parentNode;
  if (!wrapper.classList.contains('code-look-wrapper')) {
    throw new Error(
      'Element must be wrapped with <div class="code-look-wrapper" /> for CodeLook to work',
    );
  }

  btn.addEventListener('click', async e => {
    const wrapper = e.target.closest('.code-look-wrapper');
    const uuid = wrapper.dataset['blockId'];
    let needsLayout;

    // If the wrapper is open, close it
    if (wrapper.dataset.opened === 'true') {
      const { top } = wrapper.getBoundingClientRect();
      if (top < 0 || top > window.innerHeight) {
        window.scrollTo({
          top: window.scrollY + top,
          left: 0,
          behavior: 'smooth',
        });
      }

      setTimeout(() => {
        __relayout(closeWrapper(wrapper, true));
      }, 250);
    } else {
      __relayout(await openWrapper(wrapper, true));
    }
  });

  wrapper.appendChild(btn);
}
