import { difference } from './poly.js';
import Animations from './animations.js';
import {
  mat4mult,
  mat4perspective,
  mat4rotate3d,
  mat4multvec4,
  vec2add,
  project2d,
} from './math.js';

function createSvgElement(rectRef) {
  const slide = Animations.create({
    to: {
      transform: 'translate(0, 0)',
    },
  });
  const slide2 = Animations.create({
    to: {
      transform: 'translate(0, 0)',
    },
  });

  const stroke = Animations.create({
    to: {
      'stroke-dashoffset': '0',
    },
  });
  const stroke2 = Animations.create({
    to: {
      'stroke-dashoffset': '0',
    },
  });

  const div = document.createElement('div');
  div.innerHTML = `
     <svg width=${rectRef.width + 20} height=${rectRef.height +
    20 +
    30} style="transform: translateY(-15px)">
        <g
          fill="transparent"
          stroke="#303030"
          stroke-width="8px"
          stroke-miterlimit="15"
          stroke-dasharray="1300"
          stroke-dashoffset="1300"
          style="transform: translateY(15px)"
        >
          <path
            style="
              transform: translate(10px, -10px);
              animation: ${stroke.name} 1s ease-in-out, ${
    slide.name
  } 3s ease-in-out;
              animation-delay: 0s, 4s;
              animation-fill-mode: forwards;
            "
          />
          <path
            style="
              transform: translate(-10px, 10px);
              animation: ${stroke2.name} 1s ease-in-out, ${
    slide2.name
  } 3s ease-in-out;
              animation-delay: .2s, 5s;
              animation-fill-mode: forwards;
            "
          />
        </g>
      </svg>
   `;
  return div.childNodes[1];
}

function initSvg(parentElement) {
  let currentForce = 800;

  const rectRef = {
    width: 300,
    height: 200,
    x: 10,
    y: 10,
  };
  const midRef = [
    rectRef.x + rectRef.width / 2,
    rectRef.y + rectRef.height / 2,
  ];

  const svg = createSvgElement(rectRef);
  const [path1, path2] = svg.querySelectorAll('path');
  parentElement.appendChild(svg);

  function addForce(amount) {
    currentForce += amount;
  }

  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', e => {
    let diff = (window.scrollY - lastScrollY) / 10;
    addForce(diff * 8);
    lastScrollY = window.scrollY;
  });

  let last = null;
  function updateForce(timestamp) {
    // for (let el of document.querySelectorAll('.debug-render')) {
    //   el.remove();
    // }

    let dt = timestamp ? timestamp - (last || timestamp) : 0;
    if (timestamp > 6000) {
      currentForce +=
        (dt / 1000) * (Math.pow(0.8, (timestamp - 2000) / 1000) * 2000);
    } else if (timestamp > 2000) {
      currentForce +=
        (dt / 1000) * ((1 - Math.pow(0.8, (timestamp - 2000) / 1000)) * 2000);
    }

    const transformMatrix = mat4mult(
      mat4perspective(2000),
      mat4rotate3d(0.25, 1.2, 0, -Math.abs(Math.max(currentForce, 0)) / 6),
    );

    const r = rectRef;

    const topleft = [-r.width / 4, -r.height / 1.9, 0, 1];
    const topright = [r.width / 4, -r.height / 1.9, 0, 1];
    const bottomleft = [-r.width / 4, r.height / 1.9, 0, 1];
    const bottomright = [r.width / 4, r.height / 1.9, 0, 1];

    const mat = transformMatrix;
    let a1 = mat4multvec4(mat, topleft);
    let a2 = mat4multvec4(mat, topright);
    let a3 = mat4multvec4(mat, bottomleft);
    let a4 = mat4multvec4(mat, bottomright);

    a1 = vec2add(project2d(a1), midRef);
    a2 = vec2add(project2d(a2), midRef);
    a3 = vec2add(project2d(a3), midRef);
    a4 = vec2add(project2d(a4), midRef);

    const shape1 = [a1, a2, a4, a3, a1];
    const shape2 = [
      [r.x, r.y],
      [r.x + r.width, r.y],
      [r.x + r.width, r.y + r.height],
      [r.x, r.y + r.height],
      [r.x, r.y],
    ];

    const toPoint = p => ({ x: p[0], y: p[1] });
    const fromPoint = p => [p.x, p.y];

    let segments = null;
    try {
      segments = difference([shape2.map(toPoint)], [shape1.map(toPoint)]);
    } catch (e) {}

    // debugShape('shape', shape1, 'red');

    if (segments) {
      function setPathData(segment, path) {
        path.setAttribute(
          'd',
          `M${segment[0].x} ${segment[0].y}` +
            segment
              .slice(1)
              .map(s => `L${s.x} ${s.y}`)
              .join(' ') +
            `Z`,
        );
      }

      const [first, second] = segments;
      if (first && first.length > 2) {
        setPathData(first, path1);
      }
      if (second && second.length > 2) {
        setPathData(second, path2);
      }
    }

    requestAnimationFrame(updateForce);
    last = timestamp;
  }

  setTimeout(() => {
    path1.style['stroke-dasharray'] = '0';
  }, 500);

  setTimeout(() => {
     path2.style['stroke-dasharray'] = '0';
  }, 800);

  parentElement.style.width = rectRef.width + 20 + 'px';
  parentElement.style.height = rectRef.height + 20 + 'px';

  updateForce();
}

initSvg(document.querySelector('#demo'));
