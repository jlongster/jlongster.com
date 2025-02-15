(function() {
  'use strict';

  var X = 0;
  var Y = 1;
  var Z = 2;
  var W = 3;

  function vec(x, y, z, w) {
    var arr;
    var len = w != undefined ? 4 : z != undefined ? 3 : y != undefined ? 2 : 1;

    if (typeof ArrayBuffer !== 'undefined') {
      var buffer = new ArrayBuffer(4 * len);
      arr = new Float32Array(buffer);
    } else {
      arr = [];
    }

    arr[X] = x;
    len >= 2 && (arr[Y] = y);
    len >= 3 && (arr[Z] = z);
    len == 4 && (arr[W] = w);
    return arr;
  }

  function vec_equals(v1, v2) {
    function fleq(x, y) {
      if (isNaN(x) && isNaN(y)) return true;

      return Math.abs(x - y) < 0.0000000001;
    }

    return (
      fleq(v1[X], v2[X]) &&
      fleq(v1[Y], v2[Y]) &&
      fleq(v1[Z], v2[Z]) &&
      fleq(v1[W], v2[W])
    );
  }

  function vec_copy(v1) {
    if (typeof Float32Array !== 'undefined' && v1 instanceof Float32Array) {
      var buffer = new ArrayBuffer(4 * v1.length);
      var arr = new Float32Array(buffer);
      arr[X] = v1[X];
      arr[Y] = v1[Y];
      arr[Z] = v1[Z];
      arr[W] = v1[W];
      return arr;
    }
    return Array.prototype.slice.call(v1);
  }

  function vec_pure_operation(op) {
    return function(v1, v2) {
      v1 = vec_copy(v1);
      op(v1, v2);
      return v1;
    };
  }

  function _vec_subtract(v1, v2) {
    v1[X] = v1[X] - v2[X];
    v1.length >= 2 && (v1[Y] = v1[Y] - v2[Y]);
    v1.length >= 3 && (v1[Z] = v1[Z] - v2[Z]);
    v1.length == 4 && (v1[W] = v1[W] - v2[W]);
  }
  var vec_subtract = vec_pure_operation(_vec_subtract);

  function _vec_multiply(v1, v2) {
    v1[X] = v1[X] * v2[X];
    v1.length >= 2 && (v1[Y] = v1[Y] * v2[Y]);
    v1.length >= 3 && (v1[Z] = v1[Z] * v2[Z]);
    v1.length == 4 && (v1[W] = v1[W] * v2[W]);
  }

  function _vec_add(v1, v2) {
    (v1[X] = v1[X] + v2[X]), v1.length >= 2 && (v1[Y] = v1[Y] + v2[Y]);
    v1.length >= 3 && (v1[Z] = v1[Z] + v2[Z]);
    v1.length == 4 && (v1[W] = v1[W] + v2[W]);
  }
  var vec_add = vec_pure_operation(_vec_add);

  function vec_dot(v1, v2) {
    return (
      v1[X] * v2[X] +
      (v1.length >= 2 ? v1[Y] * v2[Y] : 0) +
      (v1.length >= 3 ? v1[Z] * v2[Z] : 0) +
      (v1.length == 4 ? v1[W] * v2[W] : 0)
    );
  }

  function _vec_cross(v1, v2) {
    if (v1.length < 3) return;

    var x = v1[Y] * v2[Z] - v1[Z] * v2[Y];
    var y = v1[Z] * v2[X] - v1[X] * v2[Z];
    var z = v1[X] * v2[Y] - v1[Y] * v2[X];
    v1[X] = x;
    v1[Y] = y;
    v1[Z] = z;
  }
  var vec_cross = vec_pure_operation(_vec_cross);

  function vec_length(v1) {
    return Math.sqrt(
      v1[X] * v1[X] +
        v1[Y] * v1[Y] +
        (v1.length >= 3 ? v1[Z] * v1[Z] : 0) +
        (v1.length == 4 ? v1[W] * v1[W] : 0),
    );
  }

  function _vec_3drotateX(v1, angle) {
    var y = v1[Y] * Math.cos(angle) - v1[Z] * Math.sin(angle);
    var z = v1[Y] * Math.sin(angle) + v1[Z] * Math.cos(angle);
    v1[Y] = y;
    v1[Z] = z;
  }
  var vec_3drotateX = vec_pure_operation(_vec_3drotateX);

  function _vec_3drotateY(v1, angle) {
    var x = v1[Z] * Math.sin(angle) + v1[X] * Math.cos(angle);
    var z = v1[Z] * Math.cos(angle) - v1[X] * Math.sin(angle);
    v1[X] = x;
    v1[Z] = z;
  }
  var vec_3drotateY = vec_pure_operation(_vec_3drotateY);

  function _vec_3drotateZ(v1, angle) {
    var x = v1[X] * Math.cos(angle) - v1[Y] * Math.sin(angle);
    var y = v1[X] * Math.sin(angle) + v1[Y] * Math.cos(angle);
    v1[X] = x;
    v1[Y] = y;
  }
  var vec_3drotateZ = vec_pure_operation(_vec_3drotateZ);

  function _vec_3drotate(v1, axis, angle) {
    let v = v1;
    let k = vec_unit(axis);

    let cosTheta = Math.cos(angle);
    let sinTheta = Math.sin(angle);

    // Cross product k × v
    let cross = [
      k[1] * v[2] - k[2] * v[1],
      k[2] * v[0] - k[0] * v[2],
      k[0] * v[1] - k[1] * v[0],
    ];

    // Dot product k · v
    let dot = vec_dot(k, v);

    // Rodrigues' formula
    v[0] = v[0] * cosTheta + cross[0] * sinTheta + k[0] * dot * (1 - cosTheta);
    v[1] = v[1] * cosTheta + cross[1] * sinTheta + k[1] * dot * (1 - cosTheta);
    v[2] = v[2] * cosTheta + cross[2] * sinTheta + k[2] * dot * (1 - cosTheta);
  }
  // var vec_3drotate = _vec_3drotate;

  function _vec_unit(v1) {
    var len = vec_length(v1);
    v1[X] = v1[X] / len;
    v1[Y] = v1[Y] / len;
    v1[Z] = v1[Z] / len;
  }
  var vec_unit = vec_pure_operation(_vec_unit);

  function anyNaN(v) {
    return v.findIndex(n => isNaN(n)) !== -1;
  }

  // Rotations

  function axisAngleToQuaternion({ axis, angle }) {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return {
      w: Math.cos(halfAngle),
      x: axis[X] * s,
      y: axis[Y] * s,
      z: axis[Z] * s,
    };
  }

  function quaternionToAxisAngle(q) {
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);

    if (s < 0.0001) {
      // If s is close to zero, direction doesn't matter (pure rotation around w)
      return { type: 'rotate', axis: vec(1, 0, 0), angle }; // Default to x-axis
    } else {
      return { type: 'rotate', axis: vec(q.x / s, q.y / s, q.z / s), angle };
    }
  }

  function slerp(q1, q2, t) {
    let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

    // If dot is negative, invert one quaternion to take the shorter path
    if (dot < 0) {
      q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
      dot = -dot;
    }

    // Use linear interpolation if the quaternions are very close
    // if (dot > 0.9995) {
    //   return {
    //     w: q1.w + t * (q2.w - q1.w),
    //     x: q1.x + t * (q2.x - q1.x),
    //     y: q1.y + t * (q2.y - q1.y),
    //     z: q1.z + t * (q2.z - q1.z),
    //   };
    // }

    const theta_0 = Math.acos(dot); // Angle between quaternions
    const sin_theta_0 = Math.sin(theta_0);

    const theta = theta_0 * t;

    const sin_theta = Math.sin(theta);

    const s0 = Math.cos(theta) - (dot * sin_theta) / sin_theta_0;
    const s1 = sin_theta / sin_theta_0;

    return {
      w: s0 * q1.w + s1 * q2.w,
      x: s0 * q1.x + s1 * q2.x,
      y: s0 * q1.y + s1 * q2.y,
      z: s0 * q1.z + s1 * q2.z,
    };
  }

  function interpolateRotation(rotation1, rotation2, t) {
    t = _spring(t);

    const q1 = axisAngleToQuaternion(rotation1);
    const q2 = axisAngleToQuaternion(rotation2);
    const qInterp = slerp(q1, q2, t);
    const transform = quaternionToAxisAngle(qInterp);

    if (anyNaN(transform.axis)) {
      debugger;
      slerp(q1, q2, t);
    }

    return transform;
  }

  // Heap

  var LEFT = 2;
  var RIGHT = 3;

  function make_heap() {
    return [null, null, null, null];
  }

  function heap_add(heap, line) {
    var z = (line[0][Z] + line[1][Z]) / 2.0;
    _heap_insert(heap, line, z);
  }

  function _heap_insert(heap, line, z) {
    if (!heap[0]) {
      heap[0] = line;
      heap[1] = z;
    } else if (z > heap[1]) {
      if (!heap[LEFT]) {
        heap[LEFT] = [line, z, null, null];
      } else {
        _heap_insert(heap[LEFT], line, z);
      }
    } else {
      if (!heap[RIGHT]) {
        heap[RIGHT] = [line, z, null, null];
      } else {
        _heap_insert(heap[RIGHT], line, z);
      }
    }
  }

  function heap_depth_first(heap, func) {
    if (heap[LEFT]) {
      heap_depth_first(heap[LEFT], func);
    }

    if (heap[0]) {
      func(heap[0]);
    }

    if (heap[RIGHT]) {
      heap_depth_first(heap[RIGHT], func);
    }
  }

  let canvas = document.querySelector('canvas');
  let size = [canvas.clientWidth, canvas.clientHeight];
  let dpi = window.devicePixelRatio;
  canvas.width = size[0] * dpi;
  canvas.height = size[1] * dpi;
  let ctx = canvas.getContext('2d');

  let camera = vec(0, 0, 0);
  let frustum = make_frustum(60.0, 1.8, 1, 1000.0);
  let currentColor = 'red';
  let totalTime = 0;

  window.addEventListener('resize', e => {
    size = [canvas.clientWidth | 0, canvas.clientHeight | 0];
    canvas.width = size[0] * dpi;
    canvas.height = size[1] * dpi;
  });

  // let codeString = `(define (shift* f) (let* ((parent-denv (vector-ref *meta-continuation* 2)) (curr-denv (current-dynamic-env)) (diff-denv (dynamic-env-sub curr-denv parent-denv))) (let ((v (call/cc (lambda (k) (abort-env* (lambda () (f (lambda (v) (reset (k v)))))))))) (current-dynamic-env-set! (dynamic-env-add diff-denv (vector-ref *meta-continuation* 2))) v))) (define (reset* thunk) (let ((mc *meta-continuation*) (denv (current-dynamic-env))) (continuation-capture (lambda (k-pure) (current-dynamic-wind-set! ##initial-dynwind) (abort-pure* ((call/cc (lambda (k) (set! *meta-continuation* (make-vector-values (lambda (v) (set! *meta-continuation* mc) (current-dynamic-env-set! denv) (##continuation-return-no-winding k-pure v)) k denv)) thunk))))))))`;
  // let codeString = `----- -, ... ,,- ---- ..--...--. .. ... .- --
  // ----__-`;
  let codeString = `
wasm-function[0]:
  sub rsp, 8
  cmp esi, 1
  jge 0x14
 0x00000d:
  xor eax, eax
  jmp 0x26
 0x000014:
  xor eax, eax
 0x000016:
  mov ecx, dword ptr [r15 + rdi]
  add eax, ecx
  add edi, 4
  add esi, -1
  test esi, esi
  jne 0x16
 0x000026:
  nop
  add rsp, 8
`;

  function getCodeIndex(i) {
    // Walk forwards until it's not pointing to a space
    while (codeString[i] === ' ') {
      i++;
    }
    return i;
  }

  // Y up
  // X left
  // Z into the scren
  let meshes = [];

  // meshes.push({
  //   yaw: 0,
  //   pitch: 0,
  //   roll: 0,
  //   translate: vec(0, 0, 0),
  //   // scale: vec(7, 7, 7),
  //   color: `rgb(${(Math.random() * 100 + 100) | 0},
  //                   ${(Math.random() * 100 + 100) | 0},
  //                   ${(Math.random() * 100 + 100) | 0})`,
  //   data: [[[0, 0, 10], [0, 0, 8]]],
  // });

  // for (let i = 0; i < 20; i++) {
  //   let x = Math.random() * 10 - 2;
  //   let y = Math.random() * 3 - 1;
  //   meshes.push({
  //     seed: Math.random() * 2 - 1,
  //     yaw: 0,
  //     pitch: 0,
  //     roll: 0,
  //     // translate: vec(0, 0, 12),
  //     // scale: vec(7, 7, 7),
  //     color: `rgb(${(Math.random() * 100 + 100) | 0},
  //                   ${(Math.random() * 100 + 100) | 0},
  //                   ${(Math.random() * 100 + 100) | 0})`,
  //     data: [[[x, y, 10], [x, y, 8]]],
  //   });
  // }

  let idx = 0;

  let TRANSFORM_WAVE_IDX = 0;
  let TRANSFORM_ROTATE_IDX = 1;
  let TRANSFORM_TRANSLATE_IDX = 2;

  let DEFAULT_ROTATION = { type: 'rotate', axis: vec(0, 0, 1), angle: 0 };

  for (let x = -10; x < 10; x += 0.4) {
    for (let y = 2; y < 3.5; y += 0.05) {
      // for (let x = -10; x < 10; x += 0.4) {
      //   for (let y = 2; y < 3.5; y += 0.1) {
      const x_ = x + Math.random() * 0.35;
      const y_ = y + Math.random() * 0.35 - ((x + 10) / 20) * 2;
      meshes.push({
        idx: idx++,
        seed: Math.random() * 3 - 1.5,

        // The transforms are static; we want all the transforms that
        // are mutated by the system to exist at creation. This is way
        // some of these are basically noops right now.
        transforms: [
          // wave
          DEFAULT_ROTATION,
          // rotation applied from the mouse
          DEFAULT_ROTATION,
          // moves the line to the right point in space
          { type: 'translate', pos: vec(x_, y_, 10) },
        ],

        // rotate: {
        //   axis: vec(Math.random(), Math.random(), Math.random()),
        //   angle: 0,
        // },
        // scale: vec(7, 7, 7),
        // color: `rgb(${(Math.random() * 100 + 100) | 0},
        //             ${(Math.random() * 100 + 100) | 0},
        //             ${(Math.random() * 100 + 100) | 0})`,
        color: 'pink',
        data: [[[0, 0, -2], [0, 0, 0]]],
      });
      // {
      //   yaw: 0,
      //   pitch: 0,
      //   roll: 0,
      //   // translate: vec(0, 0, 100),
      //   // scale: vec(7, 7, 7),
      //   color: 'green',
      //   data: [[[0, 0, 0], [0, 1, 0]]],
      // },
      // {
      //   hidden: true,
      //   yaw: 0,
      //   pitch: 0,
      //   roll: 0,
      //   // translate: vec(0, 0, 100),
      //   // scale: vec(1, 1, 1),
      //   color: 'blue',
      //   data: [[[0, 0, 0], [1, 0, 0]]],
      // },
    }
  }

  let explodeStarted = null;
  let explodeEnded = null;
  // let touchArea = document.querySelector('.demo-touch-area');

  let canvasRect = canvas.getBoundingClientRect();
  let canvasPos = [canvasRect.left, canvasRect.top];
  let mousePos;
  let rawMousePos;
  let lastMousePos;
  let mousePosStarted;
  let projectedOffset = vec(0, 0);
  let projectedScale = vec(1, 1);

  // function startExplode(e) {
  //   explodeStarted = Date.now();
  //   explodeEnded = null;

  //   let curves = meshes[2];
  //   if (curves.opacity === 0) {
  //     curves.scale = [0, 0, 0];
  //   }

  //   meshes.forEach(mesh => {
  //     mesh.originalScale = mesh.scale;
  //     mesh.originalOpacity = mesh.opacity;
  //   });
  // }

  // function stopExplode() {
  //   explodeStarted = null;
  //   explodeEnded = Date.now();
  //   meshes.forEach(mesh => {
  //     mesh.originalScale = mesh.scale;
  //     mesh.originalOpacity = mesh.opacity;
  //   });
  // }

  // touchArea.addEventListener('mouseenter', startExplode);
  // touchArea.addEventListener('mouseleave', stopExplode);
  // touchArea.addEventListener('touchstart', startExplode);

  document.addEventListener('scroll', e => {
    if (rawMousePos) {
      const pos = vec_subtract(
        [rawMousePos[0], rawMousePos[1] + window.scrollY],
        [[canvasRect.left], [canvasRect.top]],
      );
      _vec_multiply(pos, vec(1 / projectedScale[X], 1 / projectedScale[Y]));

      mousePos = unproject2d(vec_subtract(pos, projectedOffset), 8, frustum);
    }
  });

  document.addEventListener('mousemove', e => {
    if (rawMousePos == null) {
      mousePosStarted = Date.now();
    }

    rawMousePos = [e.clientX, e.clientY];

    const pos = vec_subtract(
      [rawMousePos[0], rawMousePos[1] + window.scrollY],
      [[canvasRect.left], [canvasRect.top]],
    );
    _vec_multiply(pos, vec(1 / projectedScale[X], 1 / projectedScale[Y]));

    mousePos = unproject2d(vec_subtract(pos, projectedOffset), 8, frustum);
  });

  document.addEventListener('touchmove', e => {
    if (e.touches.length > 0) {
      if (rawMousePos == null) {
        mousePosStarted = Date.now();
      }

      rawMousePos = vec(e.touches[0].clientX, e.touches[0].clientY);

      const pos = vec_subtract(
        [rawMousePos[0], rawMousePos[1] + window.scrollY],
        [[canvasRect.left], [canvasRect.top]],
      );
      _vec_multiply(pos, vec(1 / projectedScale[X], 1 / projectedScale[Y]));

      mousePos = unproject2d(vec_subtract(pos, projectedOffset), 8, frustum);
      console.log(mousePos);
    }
  });

  // let resumeTimeout;
  // let animationFrame;
  // window.addEventListener('resize', () => {
  //   clearTimeout(resumeTimeout);
  //   cancelAnimationFrame(animationFrame);

  //   resumeTimeout = setTimeout(() => {
  //     frame(0, 0, ctx);
  //   }, 250);
  // });

  frame(0, 0, ctx);

  function make_frustum(fovy, aspect, znear, zfar) {
    var range = znear * Math.tan((fovy * Math.PI) / 360.0);

    return {
      xmax: range,
      xmin: -range,
      ymax: range / aspect,
      ymin: -range / aspect,
      znear: znear,
      zfar: zfar,
    };
  }

  function _project2d(point, frustum) {
    let z = point[Z] === 0 ? 0.000001 : point[Z];
    let x = point[X] / z;
    let y = point[Y] / z;

    x = (frustum.xmax - x) / (frustum.xmax - frustum.xmin);
    y = (frustum.ymax - y) / (frustum.ymax - frustum.ymin);

    return vec(x * 1425, y * 700);
  }

  function project2d(points, frustum) {
    return [_project2d(points[0], frustum), _project2d(points[1], frustum)];
  }

  function unproject2d(point, depth, frustum) {
    let x = point[0] / 1425;
    let y = point[1] / 600;

    x = frustum.xmin + (frustum.xmax - frustum.xmin) * (1 - x);
    y = frustum.ymin + (frustum.ymax - frustum.ymin) * (1 - y);

    x *= depth;
    y *= depth;

    return [x, y, depth];
  }

  function _transform_points(mesh, points) {
    var p = [vec_copy(points[0]), vec_copy(points[1])];

    if (mesh.transforms) {
      for (let i = 0; i < mesh.transforms.length; i++) {
        let t = mesh.transforms[i];
        switch (t.type) {
          case 'translate':
            _line_apply(p, function(v) {
              _vec_add(v, t.pos);
            });
            break;
          case 'rotate':
            _line_apply(p, function(v) {
              _vec_3drotate(v, t.axis, t.angle);
            });
            break;
          case 'scale':
            _line_apply(p, function(v) {
              _vec_multiply(v, t.amount);
            });
            break;
        }
      }
    }

    return p;
  }

  function _line_apply(tri, transform) {
    transform(tri[0]);
    transform(tri[1]);
  }

  function frame(time, lastTime, ctx) {
    update(time - lastTime);
    render(ctx);

    requestAnimationFrame(newTime => {
      frame(newTime, time, ctx);
    });
  }

  function _spring(progress) {
    let damping = 10.0;
    let mass = 1.0;
    let stiffness = 100.0;
    let velocity = 0.0;

    let beta = damping / (2 * mass);
    let omega0 = Math.sqrt(stiffness / mass);
    let omega1 = Math.sqrt(omega0 * omega0 - beta * beta);
    let omega2 = Math.sqrt(beta * beta - omega0 * omega0);

    let x0 = -1;

    let oscillation;

    if (beta < omega0) {
      // Underdamped
      oscillation = t => {
        let envelope = Math.exp(-beta * t);

        let part2 = x0 * Math.cos(omega1 * t);
        let part3 = ((beta * x0 + velocity) / omega1) * Math.sin(omega1 * t);
        return -x0 + envelope * (part2 + part3);
      };
    } else if (beta == omega0) {
      // Critically damped
      oscillation = t => {
        let envelope = Math.exp(-beta * t);
        return -x0 + envelope * (x0 + (beta * x0 + velocity) * t);
      };
    } else {
      // Overdamped
      oscillation = t => {
        let envelope = Math.exp(-beta * t);
        let part2 = x0 * Math.cosh(omega2 * t);
        let part3 = ((beta * x0 + velocity) / omega2) * Math.sinh(omega2 * t);
        return -x0 + envelope * (part2 + part3);
      };
    }

    return oscillation(progress);
  }

  function spring(v1, v2, progress) {
    return (v2 - v1) * _spring(progress) + v1;
  }

  function lerp(v1, v2, progress, func) {
    return (v2 - v1) * (func ? func(progress) : progress) + v1;
  }

  function update(dt) {
    totalTime += dt;

    if (window.innerWidth < 570) {
      projectedOffset = vec(-400, 100);
    } else {
      const p = 1 - Math.max(0, Math.min(1, (window.innerWidth - 570) / 1425));
      projectedOffset = vec(-400 * p, 40 * p);
    }

    // mousePos = unproject2d(
    //   [(size[0] * 0.75) | 0, (size[1] * 0.7) | 0],
    //   30,
    //   frustum,
    // );

    // meshes[500].rotate = {
    //   axis: [0.5, 0.1, -0.8],
    //   angle: totalTime / 900,
    // };
    // meshes[500].color = 'red';

    for (let mesh of meshes) {
      mesh.transforms[TRANSFORM_WAVE_IDX] = {
        type: 'rotate',
        axis: vec(0, 1, 0),
        angle:
          Math.sin(
            mesh.transforms[TRANSFORM_TRANSLATE_IDX].pos[X] * 0.2 +
              totalTime * 0.0005 +
              mesh.seed * 0.2,
          ) * 0.1,
      };

      // if (Math.random() < 0.005) {
      //   console.log(
      //     'updating',
      //     lastMousePos,
      //     lastMousePos ? vec_equals(mousePos, lastMousePos) : null,
      //   );
      // }
      if (mousePos) {
        const line = mesh.data[0];
        const start = line[0];
        const end = line[1];
        const vec1 = vec_subtract(end, start);
        let vec2 = vec_subtract(
          mousePos,
          vec_add(end, mesh.transforms[TRANSFORM_TRANSLATE_IDX].pos),
        );

        let p = vec_length(vec2);

        // mesh.transforms[TRANSFORM_WAVE_IDX] = {
        //   type: 'rotate',
        //   axis: vec(0, 1, 0),
        //   angle:
        //     Math.sin(
        //       mesh.transforms[TRANSFORM_TRANSLATE_IDX].pos[X] * 0.2 +
        //         totalTime * 0.0005,
        //     ) *
        //     0.1 *
        //     (vec_length(vec2) / 6),
        // };

        let vec3 = vec_unit(vec_cross(vec2, vec1));

        mesh.transforms[TRANSFORM_ROTATE_IDX] = interpolateRotation(
          DEFAULT_ROTATION,
          {
            type: 'rotate',
            axis: vec3,
            // angle: -Math.PI * 0.3 * ((3 - vec_length(vec2)) * 0.3),
            angle: -Math.PI * 0.3 * Math.pow(p, -1.5),
          },
          Math.min(1, (Date.now() - mousePosStarted) / 900),
        );
      }
    }

    // meshes[1].color = `rgb(0, 0, ${(Math.sin(totalTime * 0.00005) + 1) * 255})`;

    // let computer = meshes[1];
    // let lines = meshes[0];
    // let curve = meshes[2];

    // computer.pitch += 0.0001 * dt;
    // lines.pitch += 0.00025 * dt;
    // curve.pitch += 0.0005 * dt;

    // lines.data[0].codeIndex = 0;
    // lines.data[1].codeIndex = getCodeIndex(25);

    // if (explodeStarted) {
    //   meshes.forEach(mesh => {
    //     if (mesh === meshes[2]) {
    //       let d = Math.min((Date.now() - explodeStarted) / 500, 1);

    //       if (mesh.originalOpacity > 0) {
    //         mesh.opacity = lerp(mesh.originalOpacity, 1, d);
    //       } else {
    //         mesh.opacity = 1;
    //       }

    //       mesh.scale = [
    //         spring(mesh.originalScale[0], 8.8, d),
    //         spring(mesh.originalScale[1], 8.8, d),
    //         spring(mesh.originalScale[2], 8.8, d),
    //       ];
    //     } else if (mesh.id !== 'box') {
    //       let d = Math.min((Date.now() - explodeStarted) / 1500, 1);
    //       mesh.scale = [
    //         spring(mesh.originalScale[0], 4.5, d),
    //         spring(mesh.originalScale[1], 4.5, d),
    //         spring(mesh.originalScale[2], 4.5, d),
    //       ];
    //     }
    //   });
    // } else if (explodeEnded) {
    //   meshes.forEach(mesh => {
    //     if (mesh === meshes[2]) {
    //       let dOpacity = Math.min((Date.now() - explodeEnded) / 500, 1);
    //       mesh.opacity = lerp(mesh.originalOpacity, 0, dOpacity);
    //     } else if (mesh.id !== 'box') {
    //       let d = Math.min((Date.now() - explodeEnded) / 1500, 1);
    //       mesh.scale = [
    //         spring(mesh.originalScale[0], 7, d),
    //         spring(mesh.originalScale[1], 7, d),
    //         spring(mesh.originalScale[2], 7, d),
    //       ];
    //     }
    //   });
    // }
  }

  function render(ctx) {
    let heap = make_heap();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, size[0], size[1]);

    if (window.innerWidth < 570) {
      projectedScale = vec(0.6, 0.6);
      ctx.scale(projectedScale[X], projectedScale[Y]);
    } else {
      projectedScale = vec(1, 1);
    }

    for (var i = 0; i < meshes.length; i++) {
      if (!meshes[i].hidden) {
        renderMesh(meshes[i], heap);
      }
    }

    heap_depth_first(heap, function(line) {
      render3d(ctx, line, camera, frustum);
    });

    // if (mousePos) {
    //   // var p_camera = vec_subtract(mousePos, camera);
    //   var point2d = _project2d(mousePos, frustum);
    //   ctx.beginPath();
    //   ctx.rect(point2d[X] - 5, point2d[Y] - 5, 5, 5);
    //   ctx.fillStyle = 'red';
    //   ctx.fill();
    // }

    // let points = [vec(1, 1, 10), vec(1, 1, 8)];
    // let vec1 = vec_subtract(points[1], points[0]);
    // points.color = 'red';
    // // render3d(ctx, points, camera, frustum);

    // if (mousePos) {
    //   let toMouse = [points[1], mousePos];

    //   let vec2 = vec_subtract(mousePos, points[1]);
    //   let vec3 = vec_cross(vec1, vec2);
    //   let points2 = [points[1], vec_add(vec3, points[1])];
    //   points2.color = 'green';
    //   // render3d(ctx, points2, camera, frustum);

    //   for (let i = 0; i < 20; i++) {
    //     let v = vec_3drotate(vec1, vec3, -i / 30);
    //     let p = [points[0], vec_add(points[0], v)];
    //     p.color = 'gray';
    //     render3d(ctx, p, camera, frustum);
    //   }

    //   let points3 = toMouse;
    //   points3.color = 'blue';
    //   // render3d(ctx, points3, camera, frustum);
    // }
  }

  function renderMesh(mesh, heap) {
    let { data } = mesh;
    for (var i = 0; i < data.length; i++) {
      if (data[i].codeIndex == null) {
        data[i].codeIndex = getCodeIndex(
          (Math.random() * (codeString.length - 15)) | 0,
        );
      }

      // if (mesh.idx === 500) {
      //   console.log(mesh.transforms[TRANSFORM_ROTATE_IDX]);
      // }

      var line = _transform_points(mesh, data[i]);

      _line_apply(line, function(v) {
        _vec_subtract(v, camera);
      });

      line.color = mesh.color || currentColor;
      line.opacity = mesh.opacity != null ? mesh.opacity : 1;
      line.zs = [line[0][Z], line[1][Z]];
      line.meshId = mesh.id;
      line.debug = !!mesh.rotate;
      line.idx = mesh.idx;

      heap_add(heap, line);
    }
  }

  function render3d(ctx, points, camera, frustum) {
    let p_camera = [
      vec_subtract(points[0], camera),
      vec_subtract(points[1], camera),
    ];

    let length = vec_length(vec_subtract(points[0], points[1]));

    // var tri_ca = vec_subtract(p_camera[2], p_camera[0]);
    // var tri_cb = vec_subtract(p_camera[2], p_camera[1]);

    // var normal_camera = vec_cross(tri_ca, tri_cb);
    // var angle = vec_dot(p_camera[0], normal_camera);

    // // don't render back faces of triangles
    // if (angle >= 0) {
    //   return;
    // }

    // lighting
    // var p_ba = vec_subtract(points[1], points[0]);
    // var p_ca = vec_subtract(points[2], points[0]);
    // var normal = vec_unit(vec_cross(p_ba, p_ca));

    let color = points.color;

    // var angle = vec_dot(normal, light);
    // var ambient = 0.3;
    // var shade = Math.min(1.0, Math.max(0.0, angle));
    // shade = Math.min(1.0, shade + ambient);

    let projected = project2d(p_camera, frustum);
    _vec_add(projected[0], projectedOffset);
    _vec_add(projected[1], projectedOffset);
    renderLine(ctx, projected, points.zs, points.idx, length);

    // if (points.debug) {
    //   let a = projected[0];
    //   let b = projected[1];

    //   const getSize = x => (x / 2) * (x / 2) * (x / 2) * 0.02;

    //   let size = getSize(points[0][Z]);
    //   let size_ = (size / 2) | 0;

    //   // ctx.rect(a[X] - size_, a[Y] - size_, size_, size_);
    //   // ctx.fillStyle = 'red';
    //   // ctx.fill();

    //   // size = getSize(points[1][Z]);
    //   // size_ = (size / 2) | 0;
    //   // ctx.rect(b[X] - size_, b[Y] - size_, size_, size_);
    //   // ctx.fillStyle = 'red';
    //   // ctx.fill();
    // }
  }

  // function render2d(ctx, points, color) {
  //   ctx.beginPath();
  //   ctx.moveTo(points[0][X], points[0][Y]);
  //   ctx.lineTo(points[1][X], points[1][Y]);
  //   ctx.lineWidth = 1;
  //   ctx.strokeStyle = color;
  //   ctx.stroke();
  // }

  function renderLine(ctx, points, zs, idx, length) {
    const pointA = points[0];
    const pointB = points[1];

    let gradient = ctx.createLinearGradient(
      pointB[X],
      pointB[Y],
      pointA[X],
      pointA[Y],
    );

    gradient.addColorStop(0, `rgba(130, 200, 140, 0)`);
    gradient.addColorStop(1, `rgba(130, 200, 140, 0.5)`);

    // gradient.addColorStop(
    //   1,
    //   `rgba(130, 200, 140, ${f(1 - (zs[0] - 8) / 0.09)})`,
    // );
    // gradient.addColorStop(
    //   0,
    //   `rgba(130, 200, 140, ${f(1 - (zs[1] - 8) / 0.09)})`,
    // );

    // _renderLine(pointA, pointB, gradient);
    _renderLine(pointA, pointB, gradient);
  }

  function _renderLine(pointA, pointB, color) {
    ctx.beginPath();
    ctx.moveTo(pointA[X], pointA[Y]);
    ctx.lineTo(pointB[X], pointB[Y]);

    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // const colorContainer = document.createElement('div');
  // Object.assign(colorContainer.style, {
  //   position: 'fixed',
  //   top: '10px',
  //   left: '10px',
  // });
  // document.body.appendChild(colorContainer);

  // function createColorInput(onChange) {
  //   const div = document.createElement('div');
  //   const span = document.createElement('span');
  //   const input = document.createElement('input');
  //   input.type = 'color';
  //   input.addEventListener('change', e => {
  //     onChange(e.target.value);
  //     span.textContent = e.target.value;
  //   });
  //   div.appendChild(input);
  //   div.appendChild(span);
  //   colorContainer.appendChild(div);
  // }

  // createColorInput(color => {
  //   meshes[0].color = color;
  // });
  // createColorInput(color => {
  //   meshes[1].color = color;
  // });
  // createColorInput(color => {
  //   meshes[2].color = color;
  // });
})();
