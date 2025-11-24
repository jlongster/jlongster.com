// DOM Warping Editor - Experiment with arbitrary 3D corner positioning

const canvasArea = document.getElementById('canvasArea');
const warpedContainer = document.getElementById('warpedContainer');
const warpedElement = document.getElementById('warpedElement');
const perspectiveSlider = document.getElementById('perspectiveSlider');
const perspectiveValue = document.getElementById('perspectiveValue');
const resetBtn = document.getElementById('resetBtn');

// Corner handles
const corners = {
  tl: document.getElementById('cornerTL'),
  tr: document.getElementById('cornerTR'),
  bl: document.getElementById('cornerBL'),
  br: document.getElementById('cornerBR'),
};

// Element dimensions
const elementWidth = 300;
const elementHeight = 400;

// Corner positions (relative to canvas center)
let cornerPositions = {
  tl: { x: -150, y: -200, z: 0 },
  tr: { x: 150, y: -200, z: 0 },
  bl: { x: -150, y: 200, z: 0 },
  br: { x: 150, y: 200, z: 0 },
};

let perspectiveDistance = 1000;

let draggingCorner = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartCornerX = 0;
let dragStartCornerY = 0;

// Initialize
function init() {
  updatePerspective();
  updateCornerHandles();
  updateTransform();

  // Perspective slider
  perspectiveSlider.addEventListener('input', () => {
    updatePerspective();
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    cornerPositions = {
      tl: { x: -150, y: -200, z: 0 },
      tr: { x: 150, y: -200, z: 0 },
      bl: { x: -150, y: 200, z: 0 },
      br: { x: 150, y: 200, z: 0 },
    };
    updateCornerHandles();
    updateTransform();
  });

  // Corner dragging
  Object.entries(corners).forEach(([key, handle]) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      draggingCorner = key;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartCornerX = cornerPositions[key].x;
      dragStartCornerY = cornerPositions[key].y;
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (draggingCorner) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      cornerPositions[draggingCorner].x = dragStartCornerX + dx;
      cornerPositions[draggingCorner].y = dragStartCornerY + dy;

      updateCornerHandles();
      updateTransform();
    }
  });

  document.addEventListener('mouseup', () => {
    draggingCorner = null;
  });
}

function updatePerspective() {
  perspectiveDistance = parseFloat(perspectiveSlider.value);
  perspectiveValue.textContent = perspectiveDistance;
  warpedContainer.style.perspective = `${perspectiveDistance}px`;
  updateTransform(); // Recalculate transform with new perspective
}

function updateCornerHandles() {
  const canvasRect = canvasArea.getBoundingClientRect();
  const centerX = canvasRect.width / 2;
  const centerY = canvasRect.height / 2;

  Object.entries(cornerPositions).forEach(([key, pos]) => {
    const handle = corners[key];
    handle.style.left = `${centerX + pos.x}px`;
    handle.style.top = `${centerY + pos.y}px`;
  });
}

function updateTransform() {
  // Source rectangle (the element's natural dimensions at origin)
  const src = [
    { x: 0, y: 0 },                    // TL
    { x: elementWidth, y: 0 },         // TR
    { x: 0, y: elementHeight },        // BL
    { x: elementWidth, y: elementHeight }, // BR
  ];

  // Apply perspective scaling to destination corners
  // Corners closer to viewer (negative Z) appear larger
  const perspectiveScale = 1000 / perspectiveDistance;
  const dst = [
    {
      x: cornerPositions.tl.x * perspectiveScale,
      y: cornerPositions.tl.y * perspectiveScale
    },
    {
      x: cornerPositions.tr.x * perspectiveScale,
      y: cornerPositions.tr.y * perspectiveScale
    },
    {
      x: cornerPositions.bl.x * perspectiveScale,
      y: cornerPositions.bl.y * perspectiveScale
    },
    {
      x: cornerPositions.br.x * perspectiveScale,
      y: cornerPositions.br.y * perspectiveScale
    },
  ];

  // Calculate perspective transform matrix
  const matrix = getPerspectiveTransform(src, dst);

  if (matrix) {
    // Apply transform
    const transformString = `matrix3d(${matrix.join(',')})`;
    warpedElement.style.transform = transformString;
  }
}

// Calculate perspective transformation matrix from 4 point correspondences
function getPerspectiveTransform(src, dst) {
  // This solves for the 3x3 homography matrix that maps src points to dst points
  // We need to solve: dst = H * src (in homogeneous coordinates)

  const [s0, s1, s2, s3] = src;
  const [d0, d1, d2, d3] = dst;

  // Build the coefficient matrix for the linear system
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
  if (!h) return null;

  h.push(1); // h8 = 1 (homogeneous coordinate)

  // Convert 3x3 homography to 4x4 matrix3d format
  // matrix3d takes column-major order: [m11, m21, m31, m41, m12, m22, ...]
  return [
    h[0], h[3], 0, h[6],  // First column
    h[1], h[4], 0, h[7],  // Second column
    0,    0,    1, 0,     // Third column (z-axis, identity)
    h[2], h[5], 0, h[8],  // Fourth column (translation)
  ];
}

// Gaussian elimination to solve linear system Ax = b
function gaussianElimination(A, b) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    // Check for singular matrix
    if (Math.abs(aug[i][i]) < 1e-10) {
      console.warn('Singular matrix detected');
      return null;
    }

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

// Start the editor
init();
