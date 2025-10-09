(function() {
  'use strict';

  // ============================================================================
  // COLOR CONVERSION UTILITIES (OKLCH <-> RGB <-> HEX)
  // ============================================================================

  // Convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }

  // Convert RGB to hex
  function rgbToHex(r, g, b) {
    const toHex = (n) => {
      const hex = Math.round(Math.max(0, Math.min(255, n * 255))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  // sRGB to linear RGB
  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  // Linear RGB to sRGB
  function linearToSrgb(c) {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }

  // Linear RGB to OKLab
  function linearRgbToOklab(r, g, b) {
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return {
      L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    };
  }

  // OKLab to Linear RGB
  function oklabToLinearRgb(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    return {
      r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    };
  }

  // OKLCH to OKLab
  function oklchToOklab(l, c, h) {
    const hRad = h * Math.PI / 180;
    return {
      L: l,
      a: c * Math.cos(hRad),
      b: c * Math.sin(hRad)
    };
  }

  // OKLab to OKLCH
  function oklabToOklch(L, a, b) {
    const c = Math.sqrt(a * a + b * b);
    let h = Math.atan2(b, a) * 180 / Math.PI;
    if (h < 0) h += 360;
    return { l: L, c, h };
  }

  // Main conversion: OKLCH to RGB
  function oklchToRgb(l, c, h) {
    const lab = oklchToOklab(l, c, h);
    const linear = oklabToLinearRgb(lab.L, lab.a, lab.b);
    return {
      r: linearToSrgb(linear.r),
      g: linearToSrgb(linear.g),
      b: linearToSrgb(linear.b)
    };
  }

  // Main conversion: RGB to OKLCH
  function rgbToOklch(r, g, b) {
    const linear = {
      r: srgbToLinear(r),
      g: srgbToLinear(g),
      b: srgbToLinear(b)
    };
    const lab = linearRgbToOklab(linear.r, linear.g, linear.b);
    return oklabToOklch(lab.L, lab.a, lab.b);
  }

  // OKLCH to Hex
  function oklchToHex(l, c, h) {
    const rgb = oklchToRgb(l, c, h);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  // Hex to OKLCH
  function hexToOklch(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return { l: 0.5, c: 0, h: 0 };
    return rgbToOklch(rgb.r, rgb.g, rgb.b);
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const state = {
    isOpen: false,
    selectedVar: null,
    colors: {
      'primary': { l: 0.5, c: 0, h: 0 },
      'subdued': { l: 0.5, c: 0, h: 0 },
      'link': { l: 0.5, c: 0, h: 0 },
      'accent': { l: 0.5, c: 0, h: 0 },
      'bg': { l: 0.5, c: 0, h: 0 }
    }
  };

  // Read CSS variables
  function readCssVariables() {
    const style = getComputedStyle(document.body);
    Object.keys(state.colors).forEach(key => {
      const value = style.getPropertyValue(`--color-${key}`).trim();
      if (value) {
        state.colors[key] = hexToOklch(value);
      }
    });
  }

  // Update CSS variable
  function updateCssVariable(varName, hex) {
    document.body.style.setProperty(`--color-${varName}`, hex);
  }

  // ============================================================================
  // UI CREATION
  // ============================================================================

  function createUI() {
    const style = document.createElement('style');
    style.textContent = `
      #color-tool-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: transparent;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 9999;
      }

      #color-tool-backdrop.visible {
        opacity: 1;
      }

      #color-tool-panel {
        position: fixed;
        right: 0;
        top: 0;
        bottom: 0;
        width: 420px;
        max-width: 90vw;
        background: var(--color-bg, white);
        color: var(--color-primary, black);
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #color-tool-panel.open {
        transform: translateX(0);
      }

      .color-tool-header {
        padding: 20px;
        border-bottom: 1px solid rgba(128, 128, 128, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .color-tool-title {
        font-size: 18px;
        font-weight: 600;
      }

      #color-tool-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--color-primary);
        opacity: 0.6;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      #color-tool-close:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.1);
      }

      .color-tool-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .color-swatches-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        opacity: 0.6;
        margin-bottom: 4px;
      }

      .color-swatch {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-radius: 8px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }

      .color-swatch:hover {
        background: rgba(128, 128, 128, 0.1);
      }

      .color-swatch.active {
        border-color: var(--color-accent, orange);
        background: rgba(128, 128, 128, 0.05);
      }

      .color-swatch-box {
        width: 48px;
        height: 48px;
        border-radius: 6px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
      }

      .color-swatch-info {
        flex: 1;
        min-width: 0;
      }

      .color-swatch-name {
        font-weight: 600;
        font-size: 13px;
      }

      .color-swatch-value {
        font-size: 11px;
        opacity: 0.6;
        font-family: monospace;
      }

      .picker-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .current-color-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-accent, orange);
      }

      .slider-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .slider-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        opacity: 0.7;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .slider-container {
        height: 40px;
        position: relative;
        cursor: pointer;
      }

      .slider-canvas {
        width: 100%;
        height: 100%;
        border-radius: 6px;
        border: 1px solid rgba(0, 0, 0, 0.2);
      }

      .slider-handle {
        position: absolute;
        width: 24px;
        height: 44px;
        background: white;
        border: 2px solid #333;
        border-radius: 6px;
        top: -2px;
        transform: translateX(-50%);
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: box-shadow 0.2s ease;
      }

      .slider-container:active .slider-handle {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .slider-value {
        font-family: monospace;
        font-size: 13px;
        opacity: 0.8;
      }

      .color-preview {
        display: flex;
        gap: 16px;
        align-items: center;
        padding: 16px;
        background: rgba(128, 128, 128, 0.08);
        border-radius: 8px;
      }

      .color-preview-box {
        width: 100px;
        height: 100px;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
      }

      .color-preview-info {
        flex: 1;
        min-width: 0;
      }

      .color-preview-hex {
        font-size: 20px;
        font-weight: 600;
        font-family: monospace;
        margin-bottom: 6px;
      }

      .color-preview-oklch {
        font-size: 12px;
        opacity: 0.7;
        font-family: monospace;
      }

      .css-output-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      #css-output {
        width: 100%;
        height: 140px;
        font-family: monospace;
        font-size: 12px;
        padding: 12px;
        border: 1px solid rgba(128, 128, 128, 0.3);
        border-radius: 6px;
        background: rgba(128, 128, 128, 0.05);
        color: var(--color-primary);
        resize: none;
      }

      #copy-css {
        padding: 10px 16px;
        background: var(--color-accent, orange);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: opacity 0.2s ease;
      }

      #copy-css:hover {
        opacity: 0.9;
      }

      .picker-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        opacity: 0.5;
        font-style: italic;
        text-align: center;
      }
    `;
    document.head.appendChild(style);

    const html = `
      <div id="color-tool-backdrop"></div>
      <div id="color-tool-panel">
        <div class="color-tool-header">
          <div class="color-tool-title">Color Picker</div>
          <button id="color-tool-close">×</button>
        </div>

        <div class="color-tool-content">
          <div class="color-swatches-section">
            <div class="section-title">Theme Colors</div>
            <div id="color-swatches"></div>
          </div>

          <div id="color-picker-container">
            <div class="picker-placeholder">Select a color above to edit</div>
          </div>

          <div class="css-output-section">
            <div class="section-title">CSS Code</div>
            <textarea readonly id="css-output"></textarea>
            <button id="copy-css">Copy CSS</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  // ============================================================================
  // COLOR SWATCHES
  // ============================================================================

  function renderSwatches() {
    const container = document.getElementById('color-swatches');
    container.innerHTML = '';

    Object.keys(state.colors).forEach(key => {
      const oklch = state.colors[key];
      const hex = oklchToHex(oklch.l, oklch.c, oklch.h);

      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (state.selectedVar === key) {
        swatch.classList.add('active');
      }
      swatch.dataset.var = key;

      swatch.innerHTML = `
        <div class="color-swatch-box" style="background-color: ${hex}"></div>
        <div class="color-swatch-info">
          <div class="color-swatch-name">--color-${key}</div>
          <div class="color-swatch-value">${hex}</div>
        </div>
      `;

      swatch.addEventListener('click', () => selectColor(key));
      container.appendChild(swatch);
    });
  }

  function selectColor(varName) {
    state.selectedVar = varName;
    renderSwatches();
    renderPicker();
    updateCssOutput();
  }

  // ============================================================================
  // COLOR PICKER
  // ============================================================================

  function renderPicker() {
    const container = document.getElementById('color-picker-container');

    if (!state.selectedVar) {
      container.innerHTML = '<div class="picker-placeholder">Select a color above to edit</div>';
      return;
    }

    const oklch = state.colors[state.selectedVar];
    const hex = oklchToHex(oklch.l, oklch.c, oklch.h);

    container.innerHTML = `
      <div class="picker-section">
        <div class="current-color-name">Editing: --color-${state.selectedVar}</div>

        <div class="slider-group">
          <div class="slider-label">
            <span>Lightness</span>
            <span class="slider-value" id="lightness-value">${Math.round(oklch.l * 100)}%</span>
          </div>
          <div class="slider-container" id="lightness-slider">
            <canvas class="slider-canvas" id="lightness-canvas"></canvas>
            <div class="slider-handle" id="lightness-handle"></div>
          </div>
        </div>

        <div class="slider-group">
          <div class="slider-label">
            <span>Chroma</span>
            <span class="slider-value" id="chroma-value">${oklch.c.toFixed(3)}</span>
          </div>
          <div class="slider-container" id="chroma-slider">
            <canvas class="slider-canvas" id="chroma-canvas"></canvas>
            <div class="slider-handle" id="chroma-handle"></div>
          </div>
        </div>

        <div class="slider-group">
          <div class="slider-label">
            <span>Hue</span>
            <span class="slider-value" id="hue-value">${Math.round(oklch.h)}°</span>
          </div>
          <div class="slider-container" id="hue-slider">
            <canvas class="slider-canvas" id="hue-canvas"></canvas>
            <div class="slider-handle" id="hue-handle"></div>
          </div>
        </div>

        <div class="color-preview">
          <div class="color-preview-box" style="background-color: ${hex}"></div>
          <div class="color-preview-info">
            <div class="color-preview-hex">${hex}</div>
            <div class="color-preview-oklch">L: ${Math.round(oklch.l * 100)}% C: ${oklch.c.toFixed(3)} H: ${Math.round(oklch.h)}°</div>
          </div>
        </div>
      </div>
    `;

    drawGradients();
    updateSliderHandles();
    attachSliderListeners();
  }

  function drawGradients() {
    if (!state.selectedVar) return;

    const oklch = state.colors[state.selectedVar];

    // Lightness gradient
    const lCanvas = document.getElementById('lightness-canvas');
    if (lCanvas) {
      lCanvas.width = lCanvas.offsetWidth;
      lCanvas.height = lCanvas.offsetHeight;
      const lCtx = lCanvas.getContext('2d');
      const gradient = lCtx.createLinearGradient(0, 0, lCanvas.width, 0);

      for (let i = 0; i <= 10; i++) {
        const l = i / 10;
        const hex = oklchToHex(l, oklch.c, oklch.h);
        gradient.addColorStop(i / 10, hex);
      }

      lCtx.fillStyle = gradient;
      lCtx.fillRect(0, 0, lCanvas.width, lCanvas.height);
    }

    // Chroma gradient
    const cCanvas = document.getElementById('chroma-canvas');
    if (cCanvas) {
      cCanvas.width = cCanvas.offsetWidth;
      cCanvas.height = cCanvas.offsetHeight;
      const cCtx = cCanvas.getContext('2d');
      const gradient = cCtx.createLinearGradient(0, 0, cCanvas.width, 0);

      for (let i = 0; i <= 10; i++) {
        const c = (i / 10) * 0.4;
        const hex = oklchToHex(oklch.l, c, oklch.h);
        gradient.addColorStop(i / 10, hex);
      }

      cCtx.fillStyle = gradient;
      cCtx.fillRect(0, 0, cCanvas.width, cCanvas.height);
    }

    // Hue gradient
    const hCanvas = document.getElementById('hue-canvas');
    if (hCanvas) {
      hCanvas.width = hCanvas.offsetWidth;
      hCanvas.height = hCanvas.offsetHeight;
      const hCtx = hCanvas.getContext('2d');
      const gradient = hCtx.createLinearGradient(0, 0, hCanvas.width, 0);

      for (let i = 0; i <= 12; i++) {
        const h = (i / 12) * 360;
        const hex = oklchToHex(oklch.l, oklch.c, h);
        gradient.addColorStop(i / 12, hex);
      }

      hCtx.fillStyle = gradient;
      hCtx.fillRect(0, 0, hCanvas.width, hCanvas.height);
    }
  }

  function updateSliderHandles() {
    if (!state.selectedVar) return;

    const oklch = state.colors[state.selectedVar];

    const lHandle = document.getElementById('lightness-handle');
    const cHandle = document.getElementById('chroma-handle');
    const hHandle = document.getElementById('hue-handle');

    if (lHandle) {
      lHandle.style.left = (oklch.l * 100) + '%';
    }
    if (cHandle) {
      cHandle.style.left = ((oklch.c / 0.4) * 100) + '%';
    }
    if (hHandle) {
      hHandle.style.left = ((oklch.h / 360) * 100) + '%';
    }
  }

  function attachSliderListeners() {
    const sliders = [
      { id: 'lightness-slider', type: 'l', max: 1 },
      { id: 'chroma-slider', type: 'c', max: 0.4 },
      { id: 'hue-slider', type: 'h', max: 360 }
    ];

    sliders.forEach(({ id, type, max }) => {
      const slider = document.getElementById(id);
      if (!slider) return;

      let isDragging = false;

      const updateValue = (e) => {
        if (!state.selectedVar) return;

        const rect = slider.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const value = percent * max;

        state.colors[state.selectedVar][type] = value;

        const oklch = state.colors[state.selectedVar];
        const hex = oklchToHex(oklch.l, oklch.c, oklch.h);

        // Instant CSSOM update
        updateCssVariable(state.selectedVar, hex);
        updateSliderHandles();
        drawGradients();
        renderSwatches();
        updateCssOutput();

        // Update value displays
        const lValue = document.getElementById('lightness-value');
        const cValue = document.getElementById('chroma-value');
        const hValue = document.getElementById('hue-value');
        const preview = document.querySelector('.color-preview-box');
        const previewHex = document.querySelector('.color-preview-hex');
        const previewOklch = document.querySelector('.color-preview-oklch');

        if (lValue) lValue.textContent = Math.round(oklch.l * 100) + '%';
        if (cValue) cValue.textContent = oklch.c.toFixed(3);
        if (hValue) hValue.textContent = Math.round(oklch.h) + '°';
        if (preview) preview.style.backgroundColor = hex;
        if (previewHex) previewHex.textContent = hex;
        if (previewOklch) previewOklch.textContent = `L: ${Math.round(oklch.l * 100)}% C: ${oklch.c.toFixed(3)} H: ${Math.round(oklch.h)}°`;
      };

      slider.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateValue(e);
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          updateValue(e);
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    });
  }

  // ============================================================================
  // CSS OUTPUT
  // ============================================================================

  function updateCssOutput() {
    const output = document.getElementById('css-output');
    if (!output) return;

    const lines = Object.keys(state.colors).map(key => {
      const oklch = state.colors[key];
      const hex = oklchToHex(oklch.l, oklch.c, oklch.h);
      return `  --color-${key}: ${hex};`;
    });

    output.value = `@theme {\n${lines.join('\n')}\n}`;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  function toggleTool() {
    state.isOpen = !state.isOpen;
    const panel = document.getElementById('color-tool-panel');
    const backdrop = document.getElementById('color-tool-backdrop');

    if (state.isOpen) {
      readCssVariables();
      renderSwatches();
      renderPicker();
      updateCssOutput();
      panel.classList.add('open');
      backdrop.classList.add('visible');
    } else {
      panel.classList.remove('open');
      backdrop.classList.remove('visible');
      state.selectedVar = null;
    }
  }

  function closeTool() {
    state.isOpen = false;
    const panel = document.getElementById('color-tool-panel');
    const backdrop = document.getElementById('color-tool-backdrop');
    panel.classList.remove('open');
    backdrop.classList.remove('visible');
    state.selectedVar = null;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    createUI();

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        toggleTool();
      }
      if (e.key === 'Escape' && state.isOpen) {
        closeTool();
      }
    });

    // Close button
    document.getElementById('color-tool-close').addEventListener('click', closeTool);

    // Copy button
    document.getElementById('copy-css').addEventListener('click', () => {
      const output = document.getElementById('css-output');
      output.select();
      navigator.clipboard.writeText(output.value).then(() => {
        const btn = document.getElementById('copy-css');
        const oldText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = oldText;
        }, 1000);
      });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
