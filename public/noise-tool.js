(function() {
  'use strict';

  // ============================================================================
  // NOISE GENERATION UTILITIES
  // ============================================================================

  // Box-Muller transform for Gaussian distribution
  function gaussianRandom(mean = 0, stdDev = 1) {
    let u1 = Math.random();
    let u2 = Math.random();

    // Ensure u1 is never 0 to avoid log(0)
    while (u1 === 0) u1 = Math.random();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Generate blue noise using void-and-cluster method (simplified)
  function generateBlueNoisePattern(width, height, grainSize) {
    const patternWidth = Math.ceil(width / grainSize);
    const patternHeight = Math.ceil(height / grainSize);
    const pattern = new Array(patternWidth * patternHeight);

    // Initialize with random values
    for (let i = 0; i < pattern.length; i++) {
      pattern[i] = Math.random();
    }

    // Apply spatial filtering to reduce low-frequency content
    // This is a simplified approach - true blue noise requires more complex algorithms
    const filtered = new Array(pattern.length);
    const kernelSize = 3;
    const offset = Math.floor(kernelSize / 2);

    for (let y = 0; y < patternHeight; y++) {
      for (let x = 0; x < patternWidth; x++) {
        let sum = 0;
        let count = 0;

        for (let ky = -offset; ky <= offset; ky++) {
          for (let kx = -offset; kx <= offset; kx++) {
            const nx = (x + kx + patternWidth) % patternWidth;
            const ny = (y + ky + patternHeight) % patternHeight;
            sum += pattern[ny * patternWidth + nx];
            count++;
          }
        }

        const avg = sum / count;
        const idx = y * patternWidth + x;
        // High-pass filter: subtract low frequencies
        filtered[idx] = pattern[idx] - avg + 0.5;
      }
    }

    // Normalize to 0-1 range
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] < min) min = filtered[i];
      if (filtered[i] > max) max = filtered[i];
    }

    for (let i = 0; i < filtered.length; i++) {
      filtered[i] = (filtered[i] - min) / (max - min);
    }

    return { pattern: filtered, width: patternWidth, height: patternHeight };
  }

  function generateNoise(width, height, options) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const { intensity, grainSize, noiseType, opacity, algorithm } = options;
    const alpha = Math.round(opacity * 2.55); // Convert 0-100 to 0-255

    // Pre-generate blue noise pattern if needed
    let blueNoiseData = null;
    if (algorithm === 'blue') {
      blueNoiseData = generateBlueNoisePattern(width, height, grainSize);
    }

    for (let y = 0; y < height; y += grainSize) {
      for (let x = 0; x < width; x += grainSize) {
        let r, g, b;

        if (algorithm === 'gaussian') {
          // Gaussian noise: mean at intensity/2, stdDev at intensity/6 for nice bell curve
          if (noiseType === 'monochrome') {
            const value = Math.max(0, Math.min(intensity, gaussianRandom(intensity / 2, intensity / 6)));
            r = g = b = value;
          } else {
            r = Math.max(0, Math.min(intensity, gaussianRandom(intensity / 2, intensity / 6)));
            g = Math.max(0, Math.min(intensity, gaussianRandom(intensity / 2, intensity / 6)));
            b = Math.max(0, Math.min(intensity, gaussianRandom(intensity / 2, intensity / 6)));
          }
        } else if (algorithm === 'blue') {
          // Blue noise: use pre-generated pattern
          const px = Math.floor(x / grainSize);
          const py = Math.floor(y / grainSize);
          const patternIdx = py * blueNoiseData.width + px;
          const noiseValue = blueNoiseData.pattern[patternIdx] * intensity;

          if (noiseType === 'monochrome') {
            r = g = b = noiseValue;
          } else {
            // For colored, add slight variation
            r = noiseValue * (0.8 + Math.random() * 0.4);
            g = noiseValue * (0.8 + Math.random() * 0.4);
            b = noiseValue * (0.8 + Math.random() * 0.4);
          }
        } else {
          // White noise (uniform distribution)
          if (noiseType === 'monochrome') {
            const value = Math.random() * intensity;
            r = g = b = value;
          } else {
            r = Math.random() * intensity;
            g = Math.random() * intensity;
            b = Math.random() * intensity;
          }
        }

        // Fill the grain block
        for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
          for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
            const i = ((y + dy) * width + (x + dx)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = alpha;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const state = {
    isOpen: false,
    enabled: false,
    settings: {
      opacity: 10,
      grainSize: 1,
      intensity: 30,
      patternSize: 256,
      noiseType: 'monochrome',
      algorithm: 'gaussian',
      blendMode: 'normal'
    }
  };

  // Apply noise to background
  function applyNoise() {
    if (!state.enabled) {
      document.body.style.backgroundImage = 'none';
      return;
    }

    const { opacity, grainSize, intensity, patternSize, noiseType, algorithm, blendMode } = state.settings;

    const dataUri = generateNoise(patternSize, patternSize, {
      intensity,
      grainSize,
      noiseType,
      algorithm,
      opacity
    });

    document.body.style.backgroundImage = `url(${dataUri})`;
    document.body.style.backgroundSize = `${patternSize}px ${patternSize}px`;
    document.body.style.backgroundRepeat = 'repeat';
    document.body.style.backgroundBlendMode = blendMode;
    document.body.style.backgroundPosition = '0 0';
  }

  // ============================================================================
  // UI CREATION
  // ============================================================================

  function createUI() {
    const style = document.createElement('style');
    style.textContent = `
      #noise-tool-backdrop {
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

      #noise-tool-backdrop.visible {
        opacity: 1;
      }

      #noise-tool-panel {
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

      #noise-tool-panel.open {
        transform: translateX(0);
      }

      .noise-tool-header {
        padding: 20px;
        border-bottom: 1px solid rgba(128, 128, 128, 0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .noise-tool-title {
        font-size: 18px;
        font-weight: 600;
      }

      #noise-tool-close {
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

      #noise-tool-close:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.1);
      }

      .noise-tool-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .noise-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .noise-section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        opacity: 0.6;
        margin-bottom: 4px;
      }

      .noise-preview {
        width: 100%;
        height: 150px;
        border-radius: 8px;
        border: 1px solid rgba(128, 128, 128, 0.2);
        background-color: var(--color-bg);
        position: relative;
        overflow: hidden;
      }

      .noise-preview-pattern {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-repeat: repeat;
      }

      .noise-control {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .noise-control-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .noise-control-label {
        font-size: 13px;
        font-weight: 500;
      }

      .noise-control-value {
        font-size: 12px;
        opacity: 0.6;
        font-family: monospace;
      }

      .noise-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(128, 128, 128, 0.2);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
      }

      .noise-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-accent, orange);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .noise-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-accent, orange);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .noise-toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(128, 128, 128, 0.05);
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
      }

      .noise-toggle-switch {
        width: 44px;
        height: 24px;
        background: rgba(128, 128, 128, 0.3);
        border-radius: 12px;
        position: relative;
        transition: background 0.2s ease;
      }

      .noise-toggle-switch::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        top: 3px;
        left: 3px;
        transition: transform 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .noise-toggle.enabled .noise-toggle-switch {
        background: var(--color-accent, orange);
      }

      .noise-toggle.enabled .noise-toggle-switch::after {
        transform: translateX(20px);
      }

      .noise-toggle-label {
        font-weight: 500;
      }

      .noise-select {
        width: 100%;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid rgba(128, 128, 128, 0.3);
        background: var(--color-bg);
        color: var(--color-primary);
        font-size: 13px;
        cursor: pointer;
      }

      .noise-button {
        padding: 10px 16px;
        border-radius: 6px;
        border: 1px solid rgba(128, 128, 128, 0.3);
        background: rgba(128, 128, 128, 0.05);
        color: var(--color-primary);
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .noise-button:hover {
        background: rgba(128, 128, 128, 0.1);
      }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = 'noise-tool-backdrop';
    backdrop.addEventListener('click', closePanel);

    const panel = document.createElement('div');
    panel.id = 'noise-tool-panel';
    panel.innerHTML = `
      <div class="noise-tool-header">
        <div class="noise-tool-title">Noise Generator</div>
        <button id="noise-tool-close">×</button>
      </div>
      <div class="noise-tool-content">
        <div class="noise-section">
          <div class="noise-toggle ${state.enabled ? 'enabled' : ''}" id="noise-enable-toggle">
            <div class="noise-toggle-switch"></div>
            <div class="noise-toggle-label">Enable Background Noise</div>
          </div>
        </div>

        <div class="noise-section">
          <div class="noise-section-title">Preview</div>
          <div class="noise-preview">
            <div class="noise-preview-pattern" id="noise-preview"></div>
          </div>
        </div>

        <div class="noise-section">
          <div class="noise-section-title">Settings</div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Algorithm</span>
            </div>
            <select class="noise-select" id="algorithm-select">
              <option value="white" ${state.settings.algorithm === 'white' ? 'selected' : ''}>White Noise (Uniform)</option>
              <option value="gaussian" ${state.settings.algorithm === 'gaussian' ? 'selected' : ''}>Gaussian Noise (Film Grain)</option>
              <option value="blue" ${state.settings.algorithm === 'blue' ? 'selected' : ''}>Blue Noise (High Freq)</option>
            </select>
          </div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Opacity</span>
              <span class="noise-control-value" id="opacity-value">${state.settings.opacity}%</span>
            </div>
            <input type="range" class="noise-slider" id="opacity-slider" min="0" max="100" value="${state.settings.opacity}">
          </div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Grain Size</span>
              <span class="noise-control-value" id="grain-size-value">${state.settings.grainSize}px</span>
            </div>
            <input type="range" class="noise-slider" id="grain-size-slider" min="1" max="5" value="${state.settings.grainSize}">
          </div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Intensity</span>
              <span class="noise-control-value" id="intensity-value">${state.settings.intensity}</span>
            </div>
            <input type="range" class="noise-slider" id="intensity-slider" min="0" max="255" value="${state.settings.intensity}">
          </div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Pattern Size</span>
              <span class="noise-control-value" id="pattern-size-value">${state.settings.patternSize}px</span>
            </div>
            <select class="noise-select" id="pattern-size-select">
              <option value="128" ${state.settings.patternSize === 128 ? 'selected' : ''}>128px (Fast)</option>
              <option value="256" ${state.settings.patternSize === 256 ? 'selected' : ''}>256px (Balanced)</option>
              <option value="512" ${state.settings.patternSize === 512 ? 'selected' : ''}>512px (Quality)</option>
            </select>
          </div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Noise Type</span>
            </div>
            <select class="noise-select" id="noise-type-select">
              <option value="monochrome" ${state.settings.noiseType === 'monochrome' ? 'selected' : ''}>Monochrome</option>
              <option value="colored" ${state.settings.noiseType === 'colored' ? 'selected' : ''}>Colored</option>
            </select>
          </div>

          <div class="noise-control">
            <div class="noise-control-header">
              <span class="noise-control-label">Blend Mode</span>
            </div>
            <select class="noise-select" id="blend-mode-select">
              <option value="normal" ${state.settings.blendMode === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="multiply" ${state.settings.blendMode === 'multiply' ? 'selected' : ''}>Multiply</option>
              <option value="overlay" ${state.settings.blendMode === 'overlay' ? 'selected' : ''}>Overlay</option>
              <option value="screen" ${state.settings.blendMode === 'screen' ? 'selected' : ''}>Screen</option>
              <option value="soft-light" ${state.settings.blendMode === 'soft-light' ? 'selected' : ''}>Soft Light</option>
            </select>
          </div>
        </div>

        <div class="noise-section">
          <button class="noise-button" id="copy-css-button">Copy CSS Code</button>
          <button class="noise-button" id="reset-button">Reset to Defaults</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    attachEventListeners();
    updatePreview();
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  function attachEventListeners() {
    document.getElementById('noise-tool-close').addEventListener('click', closePanel);
    document.getElementById('noise-enable-toggle').addEventListener('click', toggleEnabled);

    document.getElementById('algorithm-select').addEventListener('change', (e) => {
      state.settings.algorithm = e.target.value;
      updatePreview();
      applyNoise();
    });

    document.getElementById('opacity-slider').addEventListener('input', (e) => {
      state.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacity-value').textContent = `${state.settings.opacity}%`;
      updatePreview();
      applyNoise();
    });

    document.getElementById('grain-size-slider').addEventListener('input', (e) => {
      state.settings.grainSize = parseInt(e.target.value);
      document.getElementById('grain-size-value').textContent = `${state.settings.grainSize}px`;
      updatePreview();
      applyNoise();
    });

    document.getElementById('intensity-slider').addEventListener('input', (e) => {
      state.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensity-value').textContent = state.settings.intensity;
      updatePreview();
      applyNoise();
    });

    document.getElementById('pattern-size-select').addEventListener('change', (e) => {
      state.settings.patternSize = parseInt(e.target.value);
      document.getElementById('pattern-size-value').textContent = `${state.settings.patternSize}px`;
      updatePreview();
      applyNoise();
    });

    document.getElementById('noise-type-select').addEventListener('change', (e) => {
      state.settings.noiseType = e.target.value;
      updatePreview();
      applyNoise();
    });

    document.getElementById('blend-mode-select').addEventListener('change', (e) => {
      state.settings.blendMode = e.target.value;
      applyNoise();
    });

    document.getElementById('reset-button').addEventListener('click', resetToDefaults);
    document.getElementById('copy-css-button').addEventListener('click', copyCssCode);
  }

  function copyCssCode() {
    const { opacity, grainSize, intensity, patternSize, noiseType, algorithm, blendMode } = state.settings;

    const dataUri = generateNoise(patternSize, patternSize, {
      intensity,
      grainSize,
      noiseType,
      algorithm,
      opacity
    });

    const css = `background-image: url(${dataUri});
background-size: ${patternSize}px ${patternSize}px;
background-repeat: repeat;
background-blend-mode: ${blendMode};
background-position: 0 0;`;

    navigator.clipboard.writeText(css).then(() => {
      const button = document.getElementById('copy-css-button');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    });
  }

  function toggleEnabled() {
    state.enabled = !state.enabled;
    const toggle = document.getElementById('noise-enable-toggle');
    if (state.enabled) {
      toggle.classList.add('enabled');
    } else {
      toggle.classList.remove('enabled');
    }
    applyNoise();
  }

  function resetToDefaults() {
    state.settings = {
      opacity: 10,
      grainSize: 1,
      intensity: 30,
      patternSize: 256,
      noiseType: 'monochrome',
      algorithm: 'gaussian',
      blendMode: 'normal'
    };

    document.getElementById('algorithm-select').value = state.settings.algorithm;

    document.getElementById('opacity-slider').value = state.settings.opacity;
    document.getElementById('opacity-value').textContent = `${state.settings.opacity}%`;

    document.getElementById('grain-size-slider').value = state.settings.grainSize;
    document.getElementById('grain-size-value').textContent = `${state.settings.grainSize}px`;

    document.getElementById('intensity-slider').value = state.settings.intensity;
    document.getElementById('intensity-value').textContent = state.settings.intensity;

    document.getElementById('pattern-size-select').value = state.settings.patternSize;
    document.getElementById('pattern-size-value').textContent = `${state.settings.patternSize}px`;

    document.getElementById('noise-type-select').value = state.settings.noiseType;
    document.getElementById('blend-mode-select').value = state.settings.blendMode;

    updatePreview();
    applyNoise();
  }

  function updatePreview() {
    const preview = document.getElementById('noise-preview');
    const { opacity, grainSize, intensity, patternSize, noiseType, algorithm } = state.settings;

    const dataUri = generateNoise(patternSize, patternSize, {
      intensity,
      grainSize,
      noiseType,
      algorithm,
      opacity
    });

    preview.style.backgroundImage = `url(${dataUri})`;
    preview.style.backgroundSize = `${patternSize}px ${patternSize}px`;
    preview.style.backgroundRepeat = 'repeat';
  }

  // ============================================================================
  // PANEL CONTROL
  // ============================================================================

  function openPanel() {
    state.isOpen = true;
    document.getElementById('noise-tool-backdrop').classList.add('visible');
    document.getElementById('noise-tool-panel').classList.add('open');
  }

  function closePanel() {
    state.isOpen = false;
    document.getElementById('noise-tool-backdrop').classList.remove('visible');
    document.getElementById('noise-tool-panel').classList.remove('open');
  }

  function togglePanel() {
    if (state.isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    createUI();

    // Keyboard shortcut: Ctrl+Shift+N
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        togglePanel();
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
