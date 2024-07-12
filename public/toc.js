const toc = document.getElementById('toc');

if (toc) {
  const div = document.createElement('div');
  div.className = 'toc toc-pointer';

  const a = document.createElement('a');
  a.textContent = '↑ Table of contents';
  a.href = '#toc';
  Object.assign(a.style, {
    display: 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    fontSize: '14px',
    margin: '20px',
  });
  div.appendChild(a);
  document.body.appendChild(div);

  window.addEventListener('scroll', e => {
    const rect = toc.getBoundingClientRect();
    const boundary = rect.height + rect.top + window.scrollY;

    if (window.scrollY > boundary + 20) {
      if (a.style.display !== 'block') {
        a.style.display = 'block';
      }
    } else {
      if (a.style.display !== 'none') {
        a.style.display = 'none';
      }
    }
  });
}
