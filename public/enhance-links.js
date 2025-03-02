for (let link of document.querySelectorAll('h2 a')) {
  const href = link.getAttribute('href');
  if (href.startsWith('#')) {
    const sectionPath = '/' + href.slice(1);

    link.addEventListener('click', e => {
      if (e.altKey) {
        e.preventDefault();

        window.location.href =
          window.location.origin + window.location.pathname + sectionPath;
      }
    });

    link.classList.add('alt-clickable');
  }
}

const styleSheet = document.createElement('style');
document.head.appendChild(styleSheet);

document.addEventListener('keydown', e => {
  if (e.keyCode === 18) {
    styleSheet.sheet.insertRule(
      `
      .alt-clickable:hover {
        color: #00AA00;
      }
      `,
      0,
    );
  }
});

document.addEventListener('keyup', e => {
  if (e.keyCode === 18) {
    styleSheet.sheet.deleteRule(0);
  }
});
