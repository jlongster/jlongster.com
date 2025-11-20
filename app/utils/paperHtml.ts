// Shared utility for generating Paper HTML on both server and client

const tornPaperPath = `M 7.5,4.5
  C 8.75,7.5 12.5,3 16.25,6
  L 22.5,2.4
  C 27.5,1.5 31.25,5.4 36.25,3.6
  L 47.5,2.4
  C 52.5,0.9 57.5,3.6 62.5,1.8
  L 92.5,1.2
  C 110,0.6 127.5,2.4 145,1.5
  L 190,2.7
  C 205,4.5 220,1.8 227.5,5.4
  L 238.75,9
  C 241.25,11.4 245,15 246.25,19.5
  L 248,33
  C 249,39 247.5,45 248.5,51
  L 249.5,90
  C 250,114 248.5,138 249,162
  L 248,228
  C 246.5,252 247.25,264 246,276
  L 245,291
  C 243.75,294.6 246.25,297.6 242.5,298.5
  L 227.5,299.4
  C 220,300 212.5,297.9 205,298.8
  L 175,299.4
  C 155,299.7 135,298.5 115,299.1
  L 62.5,298.2
  C 37.5,297.3 20,298.8 7.5,295.5
  L 3.75,291
  C 2.5,286.5 4.5,280.5 3,276
  L 2,255
  C 1,243 3,231 1.5,219
  L 1,156
  C 0.5,126 2,96 1.25,66
  L 3,24
  C 3.75,15 2,9 3.75,6.6
  Z`;

export interface PaperData {
  title: string;
  url: string;
  content?: string;
  rotation?: number;
}

export function generatePaperHTML(data: PaperData): string {
  const { title, url, content = '', rotation = 0 } = data;
  const numSlices = 10;

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const escapedTitle = escapeHtml(title);
  const escapedContent = escapeHtml(content);
  const escapedUrl = escapeHtml(url);

  // Paper content that will be repeated in each slice
  const paperContent = `
    <svg
      width="250"
      height="300"
      viewBox="0 0 250 300"
      style="position: absolute; top: 0; left: 0;"
    >
      <path
        d="${tornPaperPath}"
        fill="white"
        stroke="#1a1a1a"
        stroke-width="3"
        opacity="1"
      />
    </svg>
    <div
      style="
        position: relative;
        width: 100%;
        height: 100%;
        padding: 20px;
        font-family: LoveLexie, sans-serif;
      "
      class="bg-transparent"
    >
      <a href="${escapedUrl}" class="font-bold text-2xl mb-4 leading-tight">
        ${escapedTitle}
      </a>
      <div style="line-height: 1.5em;">${escapedContent}</div>
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
}
