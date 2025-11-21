// Shared utility for generating Paper HTML in the browser

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.generatePaperHTML = function (data) {
  const { title, url, content = '', image = '' } = data;
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
    contentHtml += `<div style="font-size: 14px; line-height: 1.5em; color: #404031;">${escapedContent}</div>`;
  }

  // Paper content that will be repeated in each slice
  const paperContent = `
    <div
      style="
        position: relative;
        width: 100%;
        height: 100%;
        padding: 20px;
        border: 2px solid #202020;
        background-color: white;
      "
      class="bg-transparent"
    >
      <a href="${escapedUrl}" class="text-2xl mb-4 leading-tight block" style="
        font-family: LoveLexie, sans-serif;
       ">
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
      "
    >
      ${slices}
    </div>
  `;
};
