// Shared utility for generating Paper HTML in the browser

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.generatePaperHTML = function (data) {
  const { title, url, content = '', image = '', rotation = 0 } = data;
  const numSlices = 10;

  const escapedTitle = escapeHtml(title);
  const escapedContent = escapeHtml(content);
  const escapedUrl = escapeHtml(url);
  const escapedImage = escapeHtml(image);

  // Build content with image in proper order if present
  let contentHtml = '';
  if (image) {
    contentHtml = `
      <img src="${escapedImage}" style="width: 100%; height: auto; margin: 8px 0; display: block;" />
    `;
  }
  if (content) {
    contentHtml += `<div style="line-height: 1.5em;">${escapedContent}</div>`;
  }

  // Paper content that will be repeated in each slice
  const paperContent = `
    <div
      style="
        position: relative;
        width: 100%;
        height: 100%;
        padding: 20px;
        font-family: LoveLexie, sans-serif;
        background-color: white;
        border: 3px solid black;
      "
      class="bg-transparent"
    >
      <a href="${escapedUrl}" class="font-bold text-2xl mb-4 leading-tight block">
        ${escapedTitle}
      </a>
      ${contentHtml}
    </div>
  `;

  // Generate slices
  const slices = Array.from({ length: numSlices }, (_, i) => {
    const sliceHeight = 300 / numSlices;
    const startY = i * sliceHeight;
    const endY = (i + 1) * sliceHeight;

    return `
      <div
        class="paper-slice paper-slice-${i}"
        style="
          position: absolute;
          top: 0;
          left: 0;
          width: 250px;
          height: 300px;
          clip-path: polygon(0 ${startY}px, 250px ${startY}px, 250px ${endY}px, 0 ${endY}px);
          transform-style: preserve-3d;
        "
      >
        ${paperContent}
      </div>
    `;
  }).join('');

  return `
    <div
      class="uncolored-links paper-element block relative text-black no-underline"
      style="
        opacity: 0;
        width: 250px;
        height: 300px;
        transform: rotate(${rotation}deg);
        transform-style: preserve-3d;
        z-index: 10;
      "
    >
      ${slices}
    </div>
  `;
};
