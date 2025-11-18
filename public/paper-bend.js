// Paper bend control script
(function () {
  // Create slider UI
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 16px;
    left: 16px;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 50;
  `;

  const label = document.createElement('label');
  label.style.cssText = `
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
  `;
  label.textContent = 'Bend Amount: 50';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = '50';
  slider.style.cssText = 'width: 192px;';

  // Update CSS custom property when slider changes
  slider.addEventListener('input', (e) => {
    const value = e.target.value;
    label.textContent = `Bend Amount: ${value}`;
    document.documentElement.style.setProperty('--paper-bend-amount', value);
  });

  container.appendChild(label);
  container.appendChild(slider);

  // Add to page when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(container);
    });
  } else {
    document.body.appendChild(container);
  }

  // Set initial value
  document.documentElement.style.setProperty('--paper-bend-amount', '50');
})();
