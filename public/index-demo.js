// poly
// animations
// math

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
    return [
      v[0] * cosTheta + cross[0] * sinTheta + k[0] * dot * (1 - cosTheta),
      v[1] * cosTheta + cross[1] * sinTheta + k[1] * dot * (1 - cosTheta),
      v[2] * cosTheta + cross[2] * sinTheta + k[2] * dot * (1 - cosTheta),
    ];
  }
  var vec_3drotate = _vec_3drotate;

  function _vec_unit(v1) {
    var len = vec_length(v1);
    v1[X] = v1[X] / len;
    v1[Y] = v1[Y] / len;
    v1[Z] = v1[Z] / len;
  }
  var vec_unit = vec_pure_operation(_vec_unit);

  // tests

  function assert(msg, exp) {
    if (!exp) throw '[FAILED] ' + msg;
  }

  function assert_equal(msg, v1, v2) {
    if (typeof v1 == 'object') {
      assert(msg + ' ' + v1 + ' ' + v2, vec_equals(v1, v2));
    } else {
      assert(msg + ' ' + v1 + ' ' + v2, v1 == v2);
    }
  }

  var x = vec(4, 5, 6);
  var y;
  var z = vec(2, 3, 4);

  assert_equal('vec_subtract', vec_subtract(x, z), vec(2, 2, 2));
  assert_equal('vec_add', vec_add(x, z), vec(6, 8, 10));

  x = vec(0, 1, 0);
  y = vec(1, 0, 0);
  assert_equal('vec_dot', vec_dot(x, y), 0);

  x = vec(-1, 0, 0);
  assert_equal('vec_dot', vec_dot(x, y), -1);

  x = vec(1, 1, 0);
  y = vec(1.5, 1, 0);
  assert_equal('vec_dot', vec_dot(x, y), 2.5);

  x = vec(0, 1, 0);
  y = vec(1, 0, 0);
  assert_equal('vec_cross', vec_cross(x, y), vec(0, 0, -1));

  assert_equal('vec_3drotateX', vec_3drotateX(x, Math.PI / 2.0), vec(0, 0, 1));
  assert_equal('vec_3drotateY', vec_3drotateY(y, Math.PI / 2.0), vec(0, 0, -1));
  assert_equal('vec_3drotateZ', vec_3drotateZ(x, Math.PI / 2.0), vec(-1, 0, 0));

  assert_equal(
    'vec_3drotate',
    vec_3drotate(x, vec(0, 0, 1), Math.PI / 2.0),
    vec(-1, 0, 0),
  );

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
  ctx.scale(2, 2);

  let camera = vec(0, 0, 0);
  let frustum = make_frustum(60.0, size[0] / size[1], 1, 1000.0);
  let currentColor = 'red';
  let totalTime = 0;

  window.addEventListener('resize', e => {
    size = [canvas.clientWidth | 0, canvas.clientHeight | 0];
    canvas.width = size[0] * dpi;
    canvas.height = size[1] * dpi;
    ctx.scale(2, 2);
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

  // for (let x = -10; x < 10; x += 0.4) {
  //   for (let y = 2; y < 3.5; y += 0.025) {
  //     const x_ = x + Math.random() * 0.35;
  //     const y_ = y + Math.random() * 0.35 - ((x + 10) / 20) * 2;
  //     meshes.push({
  //       seed: Math.random() * 3 - 1.5,
  //       yaw: 0,
  //       pitch: 0,
  //       roll: 0,
  //       // translate: vec(0, 0, 12),
  //       // scale: vec(7, 7, 7),
  //       color: `rgb(${(Math.random() * 100 + 100) | 0},
  //                   ${(Math.random() * 100 + 100) | 0},
  //                   ${(Math.random() * 100 + 100) | 0})`,
  //       data: [[[x_, y_, 10], [x_, y_, 8]]],
  //     });
  //     // {
  //     //   yaw: 0,
  //     //   pitch: 0,
  //     //   roll: 0,
  //     //   // translate: vec(0, 0, 100),
  //     //   // scale: vec(7, 7, 7),
  //     //   color: 'green',
  //     //   data: [[[0, 0, 0], [0, 1, 0]]],
  //     // },
  //     // {
  //     //   hidden: true,
  //     //   yaw: 0,
  //     //   pitch: 0,
  //     //   roll: 0,
  //     //   // translate: vec(0, 0, 100),
  //     //   // scale: vec(1, 1, 1),
  //     //   color: 'blue',
  //     //   data: [[[0, 0, 0], [1, 0, 0]]],
  //     // },
  //   }
  // }

  for (let mesh of meshes) {
    if (
      mesh.data[0][X] < 2 &&
      mesh.data[0][X] > -2 &&
      mesh.data[0][Y] < 2 &&
      mesh.data[0][Y] > -2
    ) {
      console.log(mesh);
    }
  }

  let explodeStarted = null;
  let explodeEnded = null;
  // let touchArea = document.querySelector('.demo-touch-area');

  let canvasRect = canvas.getBoundingClientRect();
  let canvasPos = [canvasRect.left, canvasRect.top];
  let mousePos;
  let rawMousePos;

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
    const pos = vec_subtract(
      [rawMousePos[0], rawMousePos[1] + window.scrollY],
      [[canvasRect.left], [canvasRect.top]],
    );
    mousePos = unproject2d(pos, 8, frustum);
  });

  document.addEventListener('mousemove', e => {
    rawMousePos = [e.clientX, e.clientY];

    const pos = vec_subtract(
      [rawMousePos[0], rawMousePos[1] + window.scrollY],
      [[canvasRect.left], [canvasRect.top]],
    );
    mousePos = unproject2d(pos, 8, frustum);
  });

  // Newer iOS phones have sucky tendency to bring up a bottom tab bar
  // but still think that 100vh means you want to go underneath it. This
  // is stupid. window.innerHeight is correct so set it to that, and we
  // have to do it a little in the future because it's racy.
  if (window.innerWidth < 500) {
    setTimeout(() => {
      document.querySelector('.demo-full-screen').style.height =
        window.innerHeight + 'px';
    }, 100);
  }

  let resumeTimeout;
  let animationFrame;
  window.addEventListener('resize', () => {
    clearTimeout(resumeTimeout);
    cancelAnimationFrame(animationFrame);

    resumeTimeout = setTimeout(() => {
      frame(0, 0, ctx);
    }, 250);
  });

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

    return vec(x * size[0], y * size[1]);
  }

  function project2d(points, frustum) {
    return [_project2d(points[0], frustum), _project2d(points[1], frustum)];
  }

  function unproject2d(point, depth, frustum) {
    let x = point[0] / size[0];
    let y = point[1] / size[1];

    x = frustum.xmin + (frustum.xmax - frustum.xmin) * (1 - x);
    y = frustum.ymin + (frustum.ymax - frustum.ymin) * (1 - y);

    x *= depth;
    y *= depth;

    return [x, y, depth];
  }

  function _transform_points(mesh, points) {
    var p = [vec_copy(points[0]), vec_copy(points[1])];

    if (mesh.scale) {
      _line_apply(p, function(v) {
        _vec_multiply(v, mesh.scale);
      });
    }

    if (mesh.yaw) {
      _line_apply(p, function(v) {
        _vec_3drotateX(v, mesh.yaw);
      });
    }

    if (mesh.pitch) {
      _line_apply(p, function(v) {
        _vec_3drotateY(v, mesh.pitch);
      });
    }

    if (mesh.roll) {
      _line_apply(p, function(v) {
        _vec_3drotateZ(v, mesh.roll);
      });
    }

    if (mesh.translate) {
      _line_apply(p, function(v) {
        _vec_add(v, mesh.translate);
      });
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

    animationFrame = requestAnimationFrame(newTime => {
      frame(newTime, time, ctx);
    });
  }

  function x$1(progress) {
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
    return (v2 - v1) * x$1(progress) + v1;
  }

  function lerp(v1, v2, progress, func) {
    return (v2 - v1) * (func ? func(progress) : progress) + v1;
  }

  function update(dt) {
    totalTime += dt;

    // mousePos = unproject2d(
    //   [(size[0] * 0.75) | 0, (size[1] * 0.7) | 0],
    //   30,
    //   frustum,
    // );

    for (let mesh of meshes) {
      // if (mesh.translate == null) {
      //   mesh.translate = vec(0, 0, 0);
      // } else {
      //   mesh.translate[2] += 0.0005 * dt;
      // }
      // mesh.pitch  = Math.cos(totalTime * 0.002);
      // mesh.yaw  = Math.sin(totalTime * 0.002);
      // mesh.pitch = totalTime * 0.0005 * 2;
      // mesh.yaw = totalTime * 0.0005 * 2;
      // mesh.roll = totalTime * 0.0002 * 2;

      if (mousePos) {
        const line = mesh.data[0];
        const end = line[1];
        const end_ = vec_subtract(end, mousePos);

        if (mousePos && vec_length(end_) < 1.5) {
          // if (vec_length(end) > 1.3) {
          //   const size = 1.3;
          //   _vec_unit(end);
          //   _vec_multiply(end, [-size, -size, -size]);
          // } else {
          //   _vec_multiply(end, [-1, -1, -1]);
          // }
          // // line[0] = [0, 0, 1];
          // _vec_3drotateZ(
          //   end,
          //   Math.sin(totalTime * 0.0005 + mesh.seed * 1.1) / 6,
          // );
          // line[1] = vec_add(start, end);
        }
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

    ctx.clearRect(0, 0, size[0], size[1]);

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

    let points = [vec(1, 1, 10), vec(1, 1, 8)];
    let vec1 = vec_subtract(points[1], points[0]);
    points.color = 'red';
    // render3d(ctx, points, camera, frustum);

    if (mousePos) {
      let toMouse = [points[1], mousePos];

      let vec2 = vec_subtract(mousePos, points[1]);
      let vec3 = vec_cross(vec1, vec2);
      let points2 = [points[1], vec_add(vec3, points[1])];
      points2.color = 'green';
      // render3d(ctx, points2, camera, frustum);

      for (let i = 0; i < 20; i++) {
        let v = vec_3drotate(vec1, vec3, -i / 30);
        let p = [points[0], vec_add(points[0], v)];
        p.color = 'gray';
        render3d(ctx, p, camera, frustum);
      }

      let points3 = toMouse;
      points3.color = 'blue';
      // render3d(ctx, points3, camera, frustum);
    }
  }

  function renderMesh(mesh, heap) {
    let { data } = mesh;
    for (var i = 0; i < data.length; i++) {
      if (data[i].codeIndex == null) {
        data[i].codeIndex = getCodeIndex(
          (Math.random() * (codeString.length - 15)) | 0,
        );
      }

      var line = _transform_points(mesh, data[i]);

      _line_apply(line, function(v) {
        _vec_subtract(v, camera);
      });

      line.color = mesh.color || currentColor;
      line.opacity = mesh.opacity != null ? mesh.opacity : 1;
      line.codeIndex = data[i].codeIndex;
      line.meshId = mesh.id;

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

    renderLine(ctx, project2d(p_camera, frustum), color, length);
  }

  // function render2d(ctx, points, color) {
  //   ctx.beginPath();
  //   ctx.moveTo(points[0][X], points[0][Y]);
  //   ctx.lineTo(points[1][X], points[1][Y]);
  //   ctx.lineWidth = 1;
  //   ctx.strokeStyle = color;
  //   ctx.stroke();
  // }

  function renderLine(ctx, points, color, length) {
    const pointA = points[0];
    const pointB = points[1];

    const gradient = ctx.createLinearGradient(
      pointA[X],
      pointA[Y],
      pointB[X],
      pointB[Y],
    );

    // Add three color stops
    gradient.addColorStop(0.2, 'rgb(130, 200, 140, 0)');
    gradient.addColorStop(1, 'rgb(130, 200, 140)');

    // _renderLine(pointA, pointB, gradient);
    _renderLine(pointA, pointB, color);
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
