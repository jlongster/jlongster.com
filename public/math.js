export function vec2len([x, y]) {
  return Math.sqrt(x * x + y * y);
}

export function vec2normalize(v) {
  const length = vec2len(v);
  return [v[0] / length, v[1] / length];
}

export function vec2add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1]];
}

export function vec2sub(v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1]];
}

export function vec2multn(v1, n) {
  return [v1[0] * n, v1[1] * n];
}

export function vec3len([x, y, z]) {
  return Math.sqrt(x * x + y * y + z * z);
}

export function vec3add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

export function vec3normalize(v) {
  const length = vec3len(v);
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function vec4add(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2], v1[3] + v2[3]];
}

export function mat4multvec3(mat, [x, y, z]) {
  return [
    mat[0] * x + mat[1] * y + mat[2] * z + mat[3],
    mat[4] * x + mat[5] * y + mat[6] * z + mat[7],
    mat[8] * x + mat[9] * y + mat[10] * z + mat[11],
  ];
}

export function mat4multvec4(mat, [x, y, z, w]) {
  return [
    mat[0] * x + mat[1] * y + mat[2] * z + mat[3] * w,
    mat[4] * x + mat[5] * y + mat[6] * z + mat[7] * w,
    mat[8] * x + mat[9] * y + mat[10] * z + mat[11] * w,
    mat[12] * x + mat[13] * y + mat[14] * z + mat[15] * w,
  ];
}

export function mat4transpose(mat) {
  // prettier-ignore
  return [
    mat[0], mat[4], mat[8], mat[12],
    mat[1], mat[5], mat[9], mat[13],
    mat[2], mat[6], mat[10], mat[14],
    mat[3], mat[7], mat[11], mat[15],
  ]
}

export function mat4mult(mat1, mat2) {
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

export function mat4perspective(n) {
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -1/n, 1,
  ]
}

export function mat4translate(x, y, z) {
  // prettier-ignore
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1,
  ]
}

export function mat4rotate3d(x, y, z, angle) {
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

export function project2d(vec) {
  let [x, y, z] = vec;
  if (vec[3] !== 0) {
    x = vec[0] / vec[3];
    y = vec[1] / vec[3];
    z = vec[2] / vec[3];
  }
  return [x, y];
}
