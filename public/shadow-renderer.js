// Shared shadow rendering module for both animation editor and paper animator

(function () {
  'use strict';

  // Cubic bezier interpolation
  function cubicBezier(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
  }

  // Generate points along bezier curves
  function generateShapePoints(leftCurvePoints, rightCurvePoints, numPointsPerCurve = 10) {
    const generatedPoints = [];

    // Generate points along left curve (top to bottom)
    for (let i = 0; i < numPointsPerCurve; i++) {
      const t = i / (numPointsPerCurve - 1);
      const x = cubicBezier(
        leftCurvePoints[0].x,
        leftCurvePoints[1].x,
        leftCurvePoints[2].x,
        leftCurvePoints[3].x,
        t
      );
      const y = cubicBezier(
        leftCurvePoints[0].y,
        leftCurvePoints[1].y,
        leftCurvePoints[2].y,
        leftCurvePoints[3].y,
        t
      );
      generatedPoints.push({ x, y, index: i });
    }

    // Generate points along right curve (bottom to top for proper winding)
    for (let i = numPointsPerCurve - 1; i >= 0; i--) {
      const t = i / (numPointsPerCurve - 1);
      const x = cubicBezier(
        rightCurvePoints[0].x,
        rightCurvePoints[1].x,
        rightCurvePoints[2].x,
        rightCurvePoints[3].x,
        t
      );
      const y = cubicBezier(
        rightCurvePoints[0].y,
        rightCurvePoints[1].y,
        rightCurvePoints[2].y,
        rightCurvePoints[3].y,
        t
      );
      generatedPoints.push({ x, y, index: numPointsPerCurve + (numPointsPerCurve - 1 - i) });
    }

    return generatedPoints;
  }

  // Parse color string to RGBA object
  function parseColor(color) {
    // Parse rgba(r, g, b, a) format
    if (color.startsWith('rgba')) {
      const matches = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (matches) {
        return {
          r: parseInt(matches[1]),
          g: parseInt(matches[2]),
          b: parseInt(matches[3]),
          a: parseFloat(matches[4])
        };
      }
    }
    // Parse hex format (assume full opacity)
    if (color.startsWith('#')) {
      return {
        r: parseInt(color.slice(1, 3), 16),
        g: parseInt(color.slice(3, 5), 16),
        b: parseInt(color.slice(5, 7), 16),
        a: 1
      };
    }
    // Default
    return { r: 224, g: 224, b: 224, a: 1 };
  }

  // Interpolate between two colors
  function interpolateColors(color1, color2, t) {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);

    // Interpolate each channel including alpha
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    const a = c1.a + (c2.a - c1.a) * t;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Get interpolated color for a point index
  function getInterpolatedColor(index, pointColors) {
    // If this index has a color set, return it
    if (pointColors[index] !== null) {
      return pointColors[index];
    }

    // Find the nearest set color before this index
    let beforeIndex = -1;
    let beforeColor = null;
    for (let i = index - 1; i >= 0; i--) {
      if (pointColors[i] !== null) {
        beforeIndex = i;
        beforeColor = pointColors[i];
        break;
      }
    }

    // Find the nearest set color after this index
    let afterIndex = -1;
    let afterColor = null;
    for (let i = index + 1; i < pointColors.length; i++) {
      if (pointColors[i] !== null) {
        afterIndex = i;
        afterColor = pointColors[i];
        break;
      }
    }

    // If no colors are set at all, return default gray
    if (beforeColor === null && afterColor === null) {
      return '#e0e0e0';
    }

    // If only before color exists, use that
    if (afterColor === null) {
      return beforeColor;
    }

    // If only after color exists, use that
    if (beforeColor === null) {
      return afterColor;
    }

    // Interpolate between before and after colors
    const t = (index - beforeIndex) / (afterIndex - beforeIndex);
    return interpolateColors(beforeColor, afterColor, t);
  }

  // Draw SVG shadow shape
  function drawSVGShape(svg, generatedPoints, pointColors, blurEnabled, blurAmount, idPrefix = '') {
    if (!svg) return;

    // Remove existing shape elements and gradients
    const existingShapes = svg.querySelectorAll('.shape-slice');
    existingShapes.forEach(shape => shape.remove());
    const existingDefs = svg.querySelector('defs');
    if (existingDefs) existingDefs.remove();

    if (generatedPoints.length === 0) return;

    const numPointsPerCurve = 10;

    // Get left and right points separately
    const leftPoints = generatedPoints.slice(0, numPointsPerCurve);
    const rightPoints = generatedPoints.slice(numPointsPerCurve, numPointsPerCurve * 2).reverse();

    // Create defs element for gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);

    // Create a single gradient that spans the entire shape
    // Calculate Y bounds of the shape
    const allYs = [...leftPoints, ...rightPoints].map(p => p.y);
    const minY = Math.min(...allYs);
    const maxY = Math.max(...allYs);

    const gradientId = idPrefix ? `${idPrefix}-gradient` : 'shape-gradient';
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    // Use default objectBoundingBox for better browser compatibility

    // Add color stops for each point based on their Y position
    for (let i = 0; i < numPointsPerCurve; i++) {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      const sliceIndex = Math.min(i, pointColors.length - 1);

      // Calculate Y position as a percentage of the total range
      const pointY = (leftPoints[i].y + rightPoints[i].y) / 2;
      const offset = ((pointY - minY) / (maxY - minY)) * 100;

      stop.setAttribute('offset', `${offset}%`);
      stop.setAttribute('stop-color', getInterpolatedColor(sliceIndex, pointColors));
      gradient.appendChild(stop);
    }

    defs.appendChild(gradient);

    // Create a single shape following the outline of both curves
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

    // Build points string: left curve (top to bottom) + right curve (bottom to top)
    const allPoints = [...leftPoints, ...rightPoints.reverse()];
    const pointsStr = allPoints.map(p => `${p.x},${p.y}`).join(' ');

    polygon.setAttribute('points', pointsStr);
    polygon.setAttribute('fill', `url(#${gradientId})`);
    polygon.setAttribute('stroke', 'none');
    polygon.setAttribute('class', 'shape-slice');
    polygon.style.pointerEvents = 'all';

    svg.appendChild(polygon);

    // Apply blur if enabled
    applyShadowBlur(svg, blurEnabled, blurAmount, idPrefix);
  }

  // Apply blur filter to shadow
  function applyShadowBlur(svg, blurEnabled, blurAmount, idPrefix = '') {
    if (!svg) return;

    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
    }

    const filterId = idPrefix ? `${idPrefix}-blur` : 'permanent-shadow-blur';

    // Remove existing blur filter
    const existingFilter = defs.querySelector(`#${filterId}`);
    if (existingFilter) {
      existingFilter.remove();
    }

    // Only apply blur if enabled
    if (!blurEnabled) {
      // Remove filter from shape slices
      const slices = svg.querySelectorAll('.shape-slice');
      slices.forEach(slice => {
        slice.removeAttribute('filter');
      });
      return;
    }

    // Create blur filter with extended region
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', filterId);

    // Extend filter region beyond shape bounds (50% in each direction)
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', blurAmount);

    filter.appendChild(blur);
    defs.appendChild(filter);

    // Apply filter to the shape
    const slices = svg.querySelectorAll('.shape-slice');
    slices.forEach(slice => {
      slice.setAttribute('filter', `url(#${filterId})`);
    });
  }

  // Export public API
  window.ShadowRenderer = {
    generateShapePoints,
    drawSVGShape,
    interpolateColors,
    parseColor,
    getInterpolatedColor
  };
})();
