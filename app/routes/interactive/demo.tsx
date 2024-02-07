import { forwardRef, useState, useEffect, useRef } from 'react';
import bg from '../../bg.jpg';

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

function vec3add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
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
    mat1[4] * mat2[0] + mat1[5] * mat2[4] + mat1[6] * mat2[8] + mat1[7] * mat2[12],
    mat1[8] * mat2[0] + mat1[9] * mat2[4] + mat1[10] * mat2[8] + mat1[11] * mat2[12],
    mat1[12] * mat2[0] + mat1[13] * mat2[4] + mat1[14] * mat2[8] + mat1[15] * mat2[12],

    mat1[0] * mat2[1] + mat1[1] * mat2[5] + mat1[2] * mat2[9] + mat1[3] * mat2[13],
    mat1[4] * mat2[1] + mat1[5] * mat2[5] + mat1[6] * mat2[9] + mat1[7] * mat2[13],
    mat1[8] * mat2[1] + mat1[9] * mat2[5] + mat1[10] * mat2[9] + mat1[11] * mat2[13],
    mat1[12] * mat2[1] + mat1[13] * mat2[5] + mat1[14] * mat2[9] + mat1[15] * mat2[13],

    mat1[0] * mat2[2] + mat1[1] * mat2[6] + mat1[2] * mat2[10] + mat1[3] * mat2[14],
    mat1[4] * mat2[2] + mat1[5] * mat2[6] + mat1[6] * mat2[10] + mat1[7] * mat2[14],
    mat1[8] * mat2[2] + mat1[9] * mat2[6] + mat1[10] * mat2[10] + mat1[11] * mat2[14],
    mat1[12] * mat2[2] + mat1[13] * mat2[6] + mat1[14] * mat2[10] + mat1[15] * mat2[14],

    mat1[0] * mat2[3] + mat1[1] * mat2[7] + mat1[2] * mat2[11] + mat1[3] * mat2[15],
    mat1[4] * mat2[3] + mat1[5] * mat2[7] + mat1[6] * mat2[11] + mat1[7] * mat2[15],
    mat1[8] * mat2[3] + mat1[9] * mat2[7] + mat1[10] * mat2[11] + mat1[11] * mat2[15],
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
  angle *= Math.PI / 360;

  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const sinA2 = sinA * sinA;
  const length = Math.sqrt(x * x + y * y + z * z);
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

function debugShape(name, line1, line2, line3, line4) {
  debugLine(name + '-1', line1[0], line1[1]);
  debugLine(name + '-2', line2[0], line2[1]);
  debugLine(name + '-3', line3[0], line3[1]);
  debugLine(name + '-4', line4[0], line4[1]);
}

function debugCircle(name, vec, size = 20) {
  let el = document.getElementById(name);
  if (el == null) {
    el = document.createElement('div');
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

const Box3d = forwardRef((props, ref) => {
  return (
    <div className="scene">
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

export default function Demo() {
  const ref = useRef();
  const currentForce = useRef(0);
  const currentForceDir = useRef(vec2normalize([0.1, 1.0]));
  const midRef = useRef(null);
  const midCursor = useRef(vec2normalize([0.1, 1.0]));
  const cursorRef = useRef(null);
  const rectRef = useRef(null);

  const MAX_DIST = 800;

  function addForce(amount) {
    currentForce.current +=
      amount * (MAX_DIST - vec2len(midCursor.current)) * 0.01;
  }

  useEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      midRef.current = [r.x + r.width / 2, r.y + r.height / 2 + window.scrollY];

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

      const div = document.createElement('div');
      Object.assign(div.style, {
        position: 'absolute',
        top: offset.y + 'px',
        left: offset.x + 'px',
        width: bounds.width + 'px',
        height: bounds.height + 'px',
        backgroundColor: 'red',
        zIndex: 1,
        borderRadius: '0.3em',
      });
      ref.current.parentNode.appendChild(div);
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
      addForce(20);
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
      const dt = timestamp ? timestamp - (last || timestamp) : 0;

      if (currentForce.current > 0) {
        currentForce.current = Math.max(
          currentForce.current - (dt / 1000) * 80,
          0,
        );
      } else if (currentForce.current < 0) {
        currentForce.current = Math.min(
          currentForce.current + (dt / 1000) * 80,
          0,
        );
      }

      const dir = vec2normalize(currentForceDir.current);

      const rev = currentForce.current < 0;

      // mat4translate(
      //   0,
      //   -currentForce.current / 5,
      //   Math.abs(currentForce.current) / 2,
      // ),

      console.log(
        mat4rotate3d(
          -dir[1] * (rev ? 1 : -1),
          dir[0],
          0,
          Math.abs(currentForce.current) / 6,
        ),
      );

      const transformMatrix = mat4mult(
        mat4perspective(2000),
        mat4rotate3d(
          -dir[1] * (rev ? 1 : -1),
          dir[0],
          0,
          Math.abs(currentForce.current) / 6,
        ),
      );

      ref.current.style.transform = `
        matrix3d(${mat4transpose(transformMatrix).join(',')})
      `;

      // ref.current.style.transform = `
      //   perspective(2000px)

      //   translate3d(0,

      //   rotate3d(
      //     ${-dir[1] * (rev ? -1 : 1)},
      //     ${dir[0]},
      //     0,
      //     ${Math.abs(currentForce.current) / 6}deg
      //   )
      // `;

      // const matrix = window.getComputedStyle(ref.current).transform;
      // const m = matrix.match(
      //   /matrix3d\(([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+), ([-.e\d]+)\)/,
      // );

      // debugRect(
      //   'stone2',
      //   [rectRef.current.x, rectRef.current.y],
      //   [
      //     rectRef.current.x + rectRef.current.width,
      //     rectRef.current.y + rectRef.current.height,
      //   ],
      // );

      const r = rectRef.current;

      function off([x, y, z, w]) {
        return [x, y, z, w];
      }

      const topleft = off([-r.width / 2, -r.height / 2, 0, 1]);
      const topright = off([r.width / 2, -r.height / 2, 0, 1]);
      const bottomleft = off([-r.width / 2, r.height / 2, 0, 1]);
      const bottomright = off([r.width / 2, r.height / 2, 0, 1]);

      // const mat = mat4transpose(m.slice(1, 17).map(n =>
      // parseFloat(n)));
      const mat = transformMatrix;
      // console.log(mat);
      let a1 = mat4multvec4(mat, topleft);
      // console.log(mat);
      // console.log('foo', topleft, a1);
      let a2 = mat4multvec4(mat, topright);
      let a3 = mat4multvec4(mat, bottomleft);
      let a4 = mat4multvec4(mat, bottomright);

      // console.log(mat, a1);
      // const offset = [rectRef.current.x, rectRef.current.y, 0];
      const poff = midRef.current;
      // const poff = [0, 0];
      a1 = vec2add(project2d(a1), poff);
      a2 = vec2add(project2d(a2), poff);
      a3 = vec2add(project2d(a3), poff);
      a4 = vec2add(project2d(a4), poff);

      debugShape('shape', [a1, a2], [a2, a4], [a3, a1], [a3, a4]);

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
      <Box3d ref={ref} />

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
