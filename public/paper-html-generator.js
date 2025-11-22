// Shared utility for generating Paper HTML in the browser

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.generatePaperHTML = function (data) {
  const { title, url, content = '', image = '', paperStyle = 'text', width = 250, height = 300 } = data;
  const numSlices = 10;

  const escapedTitle = escapeHtml(title);
  const escapedContent = escapeHtml(content);
  const escapedUrl = escapeHtml(url);
  const escapedImage = escapeHtml(image);

  // Determine padding and layout based on paperStyle
  const padding = paperStyle === 'image' ? '0' : '20px';
  const showTitle = paperStyle !== 'image';

  // Build content with image in proper order if present
  let contentHtml = '';
  if (image) {
    if (paperStyle === 'image') {
      // For image style, make the image fill the entire paper
      contentHtml = `
        <img src="${escapedImage}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
      `;
    } else {
      // For text style, keep the original image styling
      contentHtml = `
        <img src="${escapedImage}" style="width: 100%; height: auto; margin: 8px 0; display: block;" />
      `;
    }
  }
  if (content && paperStyle !== 'image') {
    contentHtml += `<div style="font-size: 14px; line-height: 1.5em; color: #404031;">${escapedContent}</div>`;
  }

  // Paper content that will be repeated in each slice
  const paperContent = `
    <div
      style="
        position: relative;
        width: 100%;
        height: 100%;
        padding: ${padding};
        border: 2px solid #202020;
        background-color: white;
      "
      class="bg-transparent"
    >
      ${showTitle ? `<a href="${escapedUrl}" class="text-2xl mb-4 leading-tight block" style="font-family: LoveLexie, sans-serif;">${escapedTitle}</a>` : ''}
      ${contentHtml}
    </div>
  `;

  // Generate slices
  const slices = Array.from({ length: numSlices }, (_, i) => {
    const sliceHeight = height / numSlices;
    const startY = i * sliceHeight;
    const endY = (i + 1) * sliceHeight;

    return `
      <div
        class="paper-slice paper-slice-${i}"
        style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${width}px;
          height: ${height}px;
          clip-path: polygon(0 ${startY}px, ${width}px ${startY}px, ${width}px ${endY}px, 0 ${endY}px);
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
