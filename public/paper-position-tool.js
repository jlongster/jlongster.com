// Paper positioning tool - allows precise quad positioning
(function () {
  let paperElement = null;
  let overlay = null;
  let corners = { tl: null, tr: null, bl: null, br: null };
  let dragging = null;
  let updateScheduled = false;

  // Corner positions (relative to paper element)
  let cornerPositions = {
    tl: { x: 0, y: 0 },
    tr: { x: 200, y: 0 },
    bl: { x: 0, y: 200 },
    br: { x: 200, y: 200 },
  };

  function init() {
    // Find the first paper element
    paperElement = document.querySelector('.paper-element');
    if (!paperElement) {
      console.warn('No paper element found');
      return;
    }

    createOverlay();
    updateTransform();
  }

  function createOverlay() {
    // Create overlay container
    overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      width: 200px;
      height: 200px;
      pointer-events: none;
      z-index: 1000;
      overflow: visible;
    `;

    // Position overlay to match paper element
    const rect = paperElement.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';

    // Create SVG for dynamic rectangle outline (larger to accommodate dragging)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: absolute;
      top: -400px;
      left: -400px;
      width: 1000px;
      height: 1000px;
      pointer-events: none;
      overflow: visible;
    `;
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '1000');
    svg.setAttribute('viewBox', '-400 -400 1000 1000');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('fill', 'none');
    polygon.setAttribute('stroke', 'rgba(59, 130, 246, 0.5)');
    polygon.setAttribute('stroke-width', '2');
    polygon.id = 'tool-outline';

    svg.appendChild(polygon);
    overlay.appendChild(svg);

    // Create corner dots
    ['tl', 'tr', 'bl', 'br'].forEach(corner => {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: absolute;
        width: 12px;
        height: 12px;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        cursor: move;
        pointer-events: all;
        transform: translate(-50%, -50%);
      `;
      dot.dataset.corner = corner;

      dot.addEventListener('mousedown', startDrag);

      corners[corner] = dot;
      overlay.appendChild(dot);
    });

    updateCornerPositions();
    document.body.appendChild(overlay);

    // Global mouse handlers
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }

  function updateCornerPositions() {
    corners.tl.style.left = cornerPositions.tl.x + 'px';
    corners.tl.style.top = cornerPositions.tl.y + 'px';

    corners.tr.style.left = cornerPositions.tr.x + 'px';
    corners.tr.style.top = cornerPositions.tr.y + 'px';

    corners.bl.style.left = cornerPositions.bl.x + 'px';
    corners.bl.style.top = cornerPositions.bl.y + 'px';

    corners.br.style.left = cornerPositions.br.x + 'px';
    corners.br.style.top = cornerPositions.br.y + 'px';

    // Update the polygon outline to connect all corners
    const polygon = document.getElementById('tool-outline');
    if (polygon) {
      const { tl, tr, bl, br } = cornerPositions;
      const points = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
      polygon.setAttribute('points', points);
    }
  }

  function startDrag(e) {
    e.preventDefault();
    dragging = e.target.dataset.corner;
  }

  function onDrag(e) {
    if (!dragging) return;

    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cornerPositions[dragging] = { x, y };

    // Use requestAnimationFrame to batch updates
    if (!updateScheduled) {
      updateScheduled = true;
      requestAnimationFrame(() => {
        updateCornerPositions();
        updateTransform();
        updateScheduled = false;
      });
    }
  }

  function stopDrag() {
    dragging = null;
  }

  function updateTransform() {
    // Calculate the 3D perspective transform from corner positions
    const { tl, tr, bl, br } = cornerPositions;

    // Source points (original rectangle corners)
    const src = [
      { x: 0, y: 0 },       // top-left
      { x: 200, y: 0 },     // top-right
      { x: 0, y: 200 },     // bottom-left
      { x: 200, y: 200 },   // bottom-right
    ];

    // Destination points (current corner positions)
    const dst = [tl, tr, bl, br];

    // Calculate the perspective transform matrix
    const matrix = getPerspectiveTransform(src, dst);

    // Apply the matrix3d transform
    paperElement.style.transform = `matrix3d(${matrix.join(',')})`;
    paperElement.style.transformOrigin = '0 0';
  }

  // Calculate perspective transform matrix from 4 point correspondences
  function getPerspectiveTransform(src, dst) {
    // Solve for the 3x3 homography matrix using the 4 point correspondences
    // This maps src points to dst points using perspective transformation

    const [s0, s1, s2, s3] = src;
    const [d0, d1, d2, d3] = dst;

    // Build the coefficient matrix for solving the homography
    const A = [
      [s0.x, s0.y, 1, 0, 0, 0, -d0.x * s0.x, -d0.x * s0.y],
      [0, 0, 0, s0.x, s0.y, 1, -d0.y * s0.x, -d0.y * s0.y],
      [s1.x, s1.y, 1, 0, 0, 0, -d1.x * s1.x, -d1.x * s1.y],
      [0, 0, 0, s1.x, s1.y, 1, -d1.y * s1.x, -d1.y * s1.y],
      [s2.x, s2.y, 1, 0, 0, 0, -d2.x * s2.x, -d2.x * s2.y],
      [0, 0, 0, s2.x, s2.y, 1, -d2.y * s2.x, -d2.y * s2.y],
      [s3.x, s3.y, 1, 0, 0, 0, -d3.x * s3.x, -d3.x * s3.y],
      [0, 0, 0, s3.x, s3.y, 1, -d3.y * s3.x, -d3.y * s3.y],
    ];

    const b = [d0.x, d0.y, d1.x, d1.y, d2.x, d2.y, d3.x, d3.y];

    // Solve using Gaussian elimination
    const h = gaussianElimination(A, b);
    h.push(1); // h8 = 1

    // Convert 3x3 homography matrix to 4x4 matrix3d format
    // For 2D transformation embedded in 3D:
    // [h0, h1, 0, h2]
    // [h3, h4, 0, h5]
    // [0,  0,  1, 0 ]
    // [h6, h7, 0, h8]

    return [
      h[0], h[3], 0, h[6],
      h[1], h[4], 0, h[7],
      0,    0,    1, 0,
      h[2], h[5], 0, h[8],
    ];
  }

  // Gaussian elimination to solve Ax = b
  function gaussianElimination(A, b) {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i];
    }

    return x;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
