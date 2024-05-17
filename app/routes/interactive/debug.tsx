import { vec2sub } from './math';

export function debugLine(name, v1, v2, color = 'blue') {
  let el = document.getElementById(name);
  if (el == null) {
    el = document.createElement('div');
    el.id = name;
    el.className = 'debug-render';
    Object.assign(el.style, {
      position: 'absolute',
      borderTop: '10px solid ' + color,
      transformOrigin: 'top left',
      zIndex: 1000,
    });
    document.body.appendChild(el);
  }

  const to = vec2sub(v2, v1);

  el.style.top = v1[1] + 'px';
  el.style.left = v1[0] + 'px';
  el.style.width = vec2len(to) + 'px';

  const angle = Math.atan2(to[1], to[0]);
  el.style.transform = `rotateZ(${angle}rad)`;
}

export function debugShape(name, points, color) {
  let lastPoint = null;
  points.forEach((point, idx) => {
    if (lastPoint) {
      debugLine(name + '-' + idx, lastPoint, point, color);
    }
    lastPoint = point;
  });
}

export function debugCircle(name, vec, size = 20) {
  let el = document.getElementById(name);
  if (el == null) {
    el = document.createElement('div');
    el.className = 'debug-render';
    el.id = name;
    Object.assign(el.style, {
      position: 'absolute',
      backgroundColor: 'var(--purple-0)',
      zIndex: 999,
    });
    document.body.appendChild(el);
  }

  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.borderRadius = size + 'px';
  el.style.top = vec[1] - size / 2 + 'px';
  el.style.left = vec[0] - size / 2 + 'px';
}
