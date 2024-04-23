import { forwardRef, useState, useEffect, useRef, useMemo } from 'react';
import bg from '../../bg.jpg';
import { difference } from '../../poly';
import { getPathFromCircleGroup } from '../../metaballs';
import { lineCircleIntersection } from '../../intersection';
import { Bezier } from 'bezier-js';

function vec2len([x, y]) {
  return Math.sqrt(x * x + y * y);
}

function vec2normalize(v) {
  const length = vec2len(v);
  return [v[0] / length, v[1] / length];
}

function vec2add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1]];
}

function vec2sub(v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1]];
}

function vec2multn(v1, n) {
  return [v1[0] * n, v1[1] * n];
}

function vec3len([x, y, z]) {
  return Math.sqrt(x * x + y * y + z * z);
}

function vec3add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function vec3normalize(v) {
  const length = vec3len(v);
  return [v[0] / length, v[1] / length, v[2] / length];
}

function vec4add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2], v1[3] + v2[3]];
}

function mat4multvec3(mat, [x, y, z]) {
  return [
    mat[0] * x + mat[1] * y + mat[2] * z + mat[3],
    mat[4] * x + mat[5] * y + mat[6] * z + mat[7],
    mat[8] * x + mat[9] * y + mat[10] * z + mat[11],
  ];
}

function mat4multvec4(mat, [x, y, z, w]) {
  return [
    mat[0] * x + mat[1] * y + mat[2] * z + mat[3] * w,
    mat[4] * x + mat[5] * y + mat[6] * z + mat[7] * w,
    mat[8] * x + mat[9] * y + mat[10] * z + mat[11] * w,
    mat[12] * x + mat[13] * y + mat[14] * z + mat[15] * w,
  ];
}

function mat4transpose(mat) {
  // prettier-ignore
  return [
    mat[0], mat[4], mat[8], mat[12],
    mat[1], mat[5], mat[9], mat[13],
    mat[2], mat[6], mat[10], mat[14],
    mat[3], mat[7], mat[11], mat[15],
  ]
}

function mat4mult(mat1, mat2) {
  // You think this is ugly, I think it's beautiful. We are not the same
  //
  // prettier-ignore
  return [
    mat1[0] * mat2[0] + mat1[1] * mat2[4] + mat1[2] * mat2[8] + mat1[3] * mat2[12],
    mat1[0] * mat2[1] + mat1[1] * mat2[5] + mat1[2] * mat2[9] + mat1[3] * mat2[13],
    mat1[0] * mat2[2] + mat1[1] * mat2[6] + mat1[2] * mat2[10] + mat1[3] * mat2[14],
    mat1[0] * mat2[3] + mat1[1] * mat2[7] + mat1[2] * mat2[11] + mat1[3] * mat2[15],

    mat1[4] * mat2[0] + mat1[5] * mat2[4] + mat1[6] * mat2[8] + mat1[7] * mat2[12],
    mat1[4] * mat2[1] + mat1[5] * mat2[5] + mat1[6] * mat2[9] + mat1[7] * mat2[13],
    mat1[4] * mat2[2] + mat1[5] * mat2[6] + mat1[6] * mat2[10] + mat1[7] * mat2[14],
    mat1[4] * mat2[3] + mat1[5] * mat2[7] + mat1[6] * mat2[11] + mat1[7] * mat2[15],

    mat1[8] * mat2[0] + mat1[9] * mat2[4] + mat1[10] * mat2[8] + mat1[11] * mat2[12],
    mat1[8] * mat2[1] + mat1[9] * mat2[5] + mat1[10] * mat2[9] + mat1[11] * mat2[13],
    mat1[8] * mat2[2] + mat1[9] * mat2[6] + mat1[10] * mat2[10] + mat1[11] * mat2[14],
    mat1[8] * mat2[3] + mat1[9] * mat2[7] + mat1[10] * mat2[11] + mat1[11] * mat2[15],

    mat1[12] * mat2[0] + mat1[13] * mat2[4] + mat1[14] * mat2[8] + mat1[15] * mat2[12],
    mat1[12] * mat2[1] + mat1[13] * mat2[5] + mat1[14] * mat2[9] + mat1[15] * mat2[13],
    mat1[12] * mat2[2] + mat1[13] * mat2[6] + mat1[14] * mat2[10] + mat1[15] * mat2[14],
    mat1[12] * mat2[3] + mat1[13] * mat2[7] + mat1[14] * mat2[11] + mat1[15] * mat2[15],
  ];
}

function mat4perspective(n) {
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -1/n, 1,
  ]
}

function mat4translate(x, y, z) {
  // prettier-ignore
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1,
  ]
}

function mat4rotate3d(x, y, z, angle) {
  [x, y, z] = vec3normalize([x, y, z]);

  angle *= Math.PI / 360;

  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const sinA2 = sinA * sinA;
  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;

  // prettier-ignore
  return [
    1 - 2 * (y2 + z2) * sinA2,
      2 * (y * x * sinA2 - z * sinA * cosA),
      2 * (z * x * sinA2 + y * sinA * cosA),
      0,
    2 * (x * y * sinA2 + z * sinA * cosA),
      1 - 2 * (z2 + x2) * sinA2,
      2 * (z * y * sinA2 - x * sinA * cosA),
      0,
    2 * (x * z * sinA2 - y * sinA * cosA),
      2 * (y * z * sinA2 + x * sinA * cosA),
      1 - 2 * (x2 + y2) * sinA2,
      0,
    0, 0, 0, 1
  ]
}

// function makeFrustum(fovy, aspect, znear, zfar) {
//   var range = znear * Math.tan((fovy * Math.PI) / 360.0);

//   return {
//     xmax: range,
//     xmin: -range,
//     ymax: range / aspect,
//     ymin: -range / aspect,
//     znear: znear,
//     zfar: zfar,
//   };
// }

function project2d(vec) {
  let [x, y, z] = vec;
  if (vec[3] !== 0) {
    x = vec[0] / vec[3];
    y = vec[1] / vec[3];
    z = vec[2] / vec[3];
  }

  // if (z !== 0) {
  //   x /= z;
  //   y /= z;
  // }

  // x = (frustum.xmax - x) / (frustum.xmax - frustum.xmin);
  // y = (frustum.ymax - y) / (frustum.ymax - frustum.ymin);

  return [x, y];
}

function bounded(n, lower, upper) {
  return n < lower ? lower : n > upper ? upper : n;
}

function debugLine(name, v1, v2, color = 'blue') {
  let el = document.getElementById(name);
  if (el == null) {
    el = document.createElement('div');
    el.id = name;
    el.className = 'debug-render';
    Object.assign(el.style, {
      position: 'absolute',
      borderTop: '1px solid ' + color,
      transformOrigin: 'top left',
      zIndex: 1000,
    });
    document.body.appendChild(el);
  }

  const to = vec2sub(v2, v1);

  el.style.top = v1[1] + 'px';
  el.style.left = v1[0] + 'px';
  el.style.width = vec2len(to) + 'px';
  el.style.height = '1px';

  const angle = Math.atan2(to[1], to[0]);
  el.style.transform = `rotateZ(${angle}rad)`;
}

function debugShape(name, points, color) {
  let lastPoint = null;
  points.forEach((point, idx) => {
    if (lastPoint) {
      debugLine(name + '-' + idx, lastPoint, point, color);
    }
    lastPoint = point;
  });
}

function debugCircle(name, vec, size = 20) {
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

function Svgs() {
  const ref = useRef(null);

  useEffect(() => {
    const circles = [
      {
        cx: (Math.random() * 800) | 0,
        cy: (Math.random() * 200) | 0,
        r: 64,
      },
      {
        cx: (Math.random() * 800) | 0,
        cy: (Math.random() * 200) | 0,
        r: 96,
      },
      {
        cx: Math.random() * 800,
        cy: Math.random() * 200,
        r: 56,
      },
      // {
      //   cx: Math.random() * 800,
      //   cy: Math.random() * 200,
      //   r: 128,
      // },
      // {
      //   cx: Math.random() * 800,
      //   cy: Math.random() * 200,
      //   r: 76,
      // },
    ];
    const path = getPathFromCircleGroup(circles);
    let y = circles.map(circle => circle.cy + circle.r);
    let x = circles.map(circle => circle.cx + circle.r);
    const viewBox = `0 0 ${Math.round(Math.max(...x))} ${Math.round(
      Math.max(...y),
    )}`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('width', '800px');
    svg.setAttribute('height', '200px');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    Object.assign(svg.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 2,
    });

    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('fill', 'red');
    p.setAttribute('d', path);
    svg.appendChild(p);

    ref.current.appendChild(svg);

    let last = null;
    function render(timestamp) {
      const dt = timestamp ? timestamp - (last || timestamp) : 0;

      circles.forEach(circle => {
        circle.cx += (Math.random() * 0.4 - 0.2) * dt;
        circle.cy += (Math.random() * 0.4 - 0.2) * dt;
      });
      p.setAttribute('d', getPathFromCircleGroup(circles));

      requestAnimationFrame(render);
      last = timestamp;
    }

    render();
  }, []);

  return <div ref={ref} />;
}

function SvgFilter() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="0" height="0">
      <defs>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
        </filter>
        <filter id="contrast">
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -6"
          />
        </filter>
        <filter id="gooey">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -6"
          />
        </filter>
      </defs>
    </svg>
  );
}

const Box3d = forwardRef((props, ref) => {
  const blobs = useMemo(() =>
    new Array(150).fill().map(_ => ({
      size: Math.random() * 75 + 25,
      x: Math.random() * 800,
      y: Math.random() * 300,
      duration: Math.random() * 4 + 1,
      dir: [Math.random() * 4 - 2, Math.random() * 4 - 2],
      off: Math.random(),
      top: Math.random() < 0.25,
      offset: Math.random() * 10,
    })),
  );

  return (
    <div className="scene">
      {/*<svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        width="100"
        height="100"
        viewBox="0 0 100 100"
      >
        <line
          stroke="var(--green-2)"
          x1="0"
          y1="0"
          x2="50"
          y2="50"
          strokeWidth="30"
        />
        <path
          stroke="var(--purple-2)"
          strokeWidth="2"
          fill="none"
          // d="M50 50Ha8 8 0 0 0 8-8 32 32 0 1 0-32 32h2.34a9.66 9.66 0 0 0 6.83-16.48l-4.69-4.69A1.66 1.66 0 0 1 37.65 40Zm"
          d="M10 10v5l20 20"
        />
        </svg>*/}

      {/*<Blobs blobs={blobs} rectRef={props.rectRef} />*/}
      {/*<SvgFilter />*/}
      <div ref={ref} className="scene-inner">
        <div
          className="shape cuboid-1 cub-1"
          style={{
            transform: 'rotateX(90deg) rotateY(90deg)',
          }}
        >
          <div className="face ft">
            <div
              className="photon-shader"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.255)' }}
            />
          </div>
          <div className="face bk">
            <div
              className="photon-shader"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.345)' }}
            />
          </div>
          <div className="face rt">
            <div
              className="photon-shader"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.255)' }}
            />
          </div>
          <div className="face lt">
            <div
              className="photon-shader"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.255)' }}
            />
          </div>
          <div className="face bm foreground">
            <div
              className="photon-shader"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.255)',
                '--bg': `url(${bg})`,
              }}
            />
          </div>
          <div className="face tp">
            <div
              className="photon-shader"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.255)' }}
            />
          </div>
          <div className="cr cr-0">
            <div className="face side s0">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.29)' }}
              />
            </div>
            <div className="face side s1">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.357)' }}
              />
            </div>
            <div className="face side s2">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.41)' }}
              />
            </div>
          </div>
          <div className="cr cr-1">
            <div className="face side s0">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.44)' }}
              />
            </div>
            <div className="face side s1">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.424)' }}
              />
            </div>
            <div className="face side s2">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.376)' }}
              />
            </div>
          </div>
          <div className="cr cr-2">
            <div className="face side s0">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.31)' }}
              />
            </div>
            <div className="face side s1">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.243)' }}
              />
            </div>
            <div className="face side s2">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.19)' }}
              />
            </div>
          </div>
          <div className="cr cr-3">
            <div className="face side s0">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.16)' }}
              />
            </div>
            <div className="face side s1">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.176)' }}
              />
            </div>
            <div className="face side s2">
              <div
                className="photon-shader"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.224)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function makeBlob(blob, outline) {
  const div = document.createElement('div');
  div.className = 'blob';
  Object.assign(div.style, {
    width: blob.size + 'px',
    height: blob.size + 'px',
    backgroundColor: outline ? '#202020' : 'black',
    borderRadius: blob.size + 'px',
    willChange: 'transform',
    zIndex: 1,
  });
  return div;
}

function Blobs({ blobs, rectRef }) {
  const ref = useRef(null);
  const outerRef = useRef(null);

  useEffect(() => {
    const refs = [];
    for (let blob of blobs) {
      const div = makeBlob(blob);
      ref.current.appendChild(div);
      refs.push({ ref: div, blob });

      if (blob.top) {
        const divOutline = makeBlob(blob, true);
        divOutline.style.zIndex = 2;
        outerRef.current.appendChild(divOutline);
        refs.push({ ref: divOutline, blob });
      }
    }

    let last = null;
    function render(timestamp) {
      const dt = timestamp ? timestamp - (last || timestamp) : 0;

      if (rectRef.current) {
        const b = new Bezier(
          0,
          0,
          480,
          30,
          rectRef.current.width,
          rectRef.current.height,
        );

        for (let ref of refs) {
          const p = b.get(
            Math.sin(timestamp / 2000 + ref.blob.off) * 0.5 + 0.5,
          );
          ref.ref.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        }
      }

      requestAnimationFrame(render);
      last = timestamp;
    }

    render();
  }, []);

  return (
    <div
      ref={outerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 60,
        width: 690,
        height: 280,
        borderRadius: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          filter: 'brightness(100%) contrast(8000%)',
          backgroundColor: 'white',
          width: 800,
          height: 280,
        }}
      >
        <div ref={ref} style={{ filter: 'blur(20px)' }} />
      </div>
    </div>
  );
}

export default function Demo() {
  const ref = useRef();
  const currentForce = useRef(0);
  const currentForceDir = useRef(vec2normalize([0.1, 1.0]));
  const midRef = useRef(null);
  const midCursor = useRef(vec2normalize([0.1, 1.0]));
  const cursorRef = useRef([0, 0]);
  const rectRef = useRef(null);

  const MAX_DIST = 800;

  function addForce(amount) {
    currentForce.current +=
      amount * (MAX_DIST - vec2len(midCursor.current)) * 0.01;
  }

  useEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      midRef.current = [r.x + r.width / 2, r.y + window.scrollY + r.height / 2];

      const parentRect = ref.current.offsetParent.getBoundingClientRect();
      const offset = {
        x: r.x - parentRect.x,
        y: r.y - parentRect.y,
      };

      rectRef.current = {
        x: r.x,
        y: r.y + window.scrollY,
        width: r.width,
        height: r.height,
      };

      const face = ref.current.querySelector('.foreground');
      const bounds = face.getBoundingClientRect();

      // const div = document.createElement('div');
      // Object.assign(div.style, {
      //   position: 'absolute',
      //   top: offset.y + 'px',
      //   left: offset.x + 'px',
      //   width: bounds.width + 'px',
      //   height: bounds.height + 'px',
      //   backgroundColor: '#f0f0f0',
      //   zIndex: 1,
      //   borderRadius: '0.3em',
      // });
      // ref.current.parentNode.appendChild(div);
      // ref.current.style.border = '1px solid red';
    }
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', e => {
      const mid = midRef.current;
      const cursor = cursorRef.current;
      const INPUT_DIST = 500;

      const leftBound = mid[0] - INPUT_DIST / 2;
      const rightBound = mid[0] + INPUT_DIST / 2;

      const perc =
        (Math.min(Math.max(cursor[0], leftBound), rightBound) - leftBound) /
        (rightBound - leftBound);

      const angleDist = 100;
      const dir = [angleDist / 2 - angleDist * perc, -100];

      // const to = vec2add(mid, dir);
      // debugCircle('p1', [rightBound, mid[1]]);
      // debugCircle('p2', [leftBound, mid[1]]);
      // debugLine('dir', mid, to, 'var(--green-2)');

      currentForceDir.current = dir;

      let diff = (window.scrollY - lastScrollY) / 10;
      addForce(diff);
      lastScrollY = window.scrollY;
    });

    window.addEventListener('mousemove', e => {
      if (ref.current == null) {
        return;
      }

      cursorRef.current = [e.clientX, e.clientY];
    });

    document.body.addEventListener('click', e => {
      addForce(-20);
    });

    // Render a 3d line
    // const p1 = [0, 0, 0];
    // const p2 = [200, 200, 200];
    // debugLine(
    //   '3dline',
    //   vec2add(
    //     [rectRef.current.x, rectRef.current.x],
    //     project2d(vec3add(p1, [0, 0, 2000]), FRUSTUM),
    //   ),
    //   project2d(vec3add(p2, [0, 0, 2000]), FRUSTUM),
    //   'var(--green-3)',
    // );

    // console.log(p1, project2d(p1, FRUSTUM, true));
  }, []);

  useEffect(() => {
    let last = null;
    function updateForce(timestamp) {
      for (let el of document.querySelectorAll('.debug-render')) {
        el.remove();
      }

      const dt = timestamp ? timestamp - (last || timestamp) : 0;

      if (currentForce.current > 0) {
        currentForce.current = Math.max(
          currentForce.current - (dt / 1000) * 300,
          0,
        );
      } else if (currentForce.current < 0) {
        currentForce.current = Math.min(
          currentForce.current + (dt / 1000) * 300,
          0,
        );
      }

      const dir = vec2normalize(currentForceDir.current);

      const rev = currentForce.current < 0;

      const transformMatrix = mat4mult(
        mat4perspective(2000),
        mat4mult(
          mat4translate(
            0,
            currentForce.current,
            Math.abs(currentForce.current) / 2,
          ),

          mat4rotate3d(
            -dir[1] * (rev ? -1 : 1),
            dir[0],
            0,
            Math.abs(currentForce.current) / 6,
          ),
        ),
      );

      // const globalOff = [midRef.current[0], midRef.current[1], 0, 1];

      // debugCircle(
      //   'foo',
      //   project2d(
      //     mat4multvec4(transformMatrix, vec4add(globalOff, [0, 0, 0, 1])),
      //   ),
      // );

      // debugCircle('foo2', globalOff);

      ref.current.style.transform = `
        matrix3d(${mat4transpose(transformMatrix).join(',')})
      `;
      // ref.current.style.display = 'none';

      const r = rectRef.current;

      const topleft = [-r.width / 2, -r.height / 2, 0, 1];
      const topright = [r.width / 2, -r.height / 2, 0, 1];
      const bottomleft = [-r.width / 2, r.height / 2, 0, 1];
      const bottomright = [r.width / 2, r.height / 2, 0, 1];

      const mat = transformMatrix;
      let a1 = mat4multvec4(mat, topleft);
      let a2 = mat4multvec4(mat, topright);
      let a3 = mat4multvec4(mat, bottomleft);
      let a4 = mat4multvec4(mat, bottomright);

      const poff = midRef.current;
      a1 = vec2add(project2d(a1), poff);
      a2 = vec2add(project2d(a2), poff);
      a3 = vec2add(project2d(a3), poff);
      a4 = vec2add(project2d(a4), poff);

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

      debugShape('shape', shape1, 'red');

      if (segments) {
        segments.forEach((segment, idx) => {
          if (segment.length > 2) {
            segment.push(segment[0]);
          }
          debugShape('diff-' + idx, segment.map(fromPoint));
        });
      }

      requestAnimationFrame(updateForce);
      last = timestamp;
    }

    updateForce();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 200,
        minHeight: 2000,
      }}
    >
      <Box3d ref={ref} rectRef={rectRef} />
      <canvas
        style={{
          width: 900,
          height: 800,
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />

      <div style={{ marginTop: 100 }}>
        <input
          type="range"
          min="-100"
          max="100"
          defaultValue={currentForce.current}
          onChange={e => (currentForce.current = parseInt(e.target.value))}
        />{' '}
        {currentForce.current}
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <button onClick={() => addForce(-10)}>push down</button>
        <button onClick={() => addForce(-250)}>push down (large)</button>
        <button onClick={() => addForce(10)}>push up</button>
        <button onClick={() => addForce(250)}>push up (large)</button>
      </div>
    </div>
  );
}
