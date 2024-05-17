import { forwardRef, useState, useEffect, useRef, useMemo } from 'react';
import { difference } from '../../poly';

import {
  vec2normalize,
  mat4mult,
  mat4perspective,
  mat4rotate3d,
  mat4multvec4,
  vec2add,
  project2d,
} from './math';

function Shape() {
  const currentForce = useRef(0);
  const currentForceDir = useRef(vec2normalize([0.1, 1.0]));
  const midRef = useRef(null);
  const midCursor = useRef(vec2normalize([0.1, 1.0]));
  const cursorRef = useRef([0, 0]);
  const rectRef = useRef(null);
  const path1Ref = useRef(null);
  const path2Ref = useRef(null);

  const MAX_DIST = 800;

  function addForce(amount) {
    currentForce.current +=
      amount * (MAX_DIST - vec2len(midCursor.current)) * 0.01;
  }

  const r = {
    width: 700,
    height: 280,
    x: 10,
    y: 10,
  };
  midRef.current = [r.x + r.width / 2, r.y + r.height / 2];

  rectRef.current = {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
  };

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

      currentForceDir.current = dir;

      let diff = (window.scrollY - lastScrollY) / 10;
      addForce(diff);
      lastScrollY = window.scrollY;
    });
  }, []);

  useEffect(() => {
    let last = null;
    function updateForce(timestamp) {
      // for (let el of document.querySelectorAll('.debug-render')) {
      //   el.remove();
      // }

      let dt = timestamp ? timestamp - (last || timestamp) : 0;
      if (timestamp > 2500) {
        currentForce.current +=
          (dt / 1000) * (Math.pow(0.8, timestamp / 1000) * 2000);
      }

      const transformMatrix = mat4mult(
        mat4perspective(2000),
        mat4rotate3d(
          0.25,
          1.2,
          0,
          -Math.abs(Math.max(currentForce.current, 0)) / 6,
        ),
      );

      const r = rectRef.current;

      const topleft = [-r.width / 4, -r.height / 1.9, 0, 1];
      const topright = [r.width / 4, -r.height / 1.9, 0, 1];
      const bottomleft = [-r.width / 4, r.height / 1.9, 0, 1];
      const bottomright = [r.width / 4, r.height / 1.9, 0, 1];

      const mat = transformMatrix;
      let a1 = mat4multvec4(mat, topleft);
      let a2 = mat4multvec4(mat, topright);
      let a3 = mat4multvec4(mat, bottomleft);
      let a4 = mat4multvec4(mat, bottomright);

      const poff = midRef.current;
      // const poff = [0,0];
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
          setPathData(first, path1Ref.current);
        }
        if (second && second.length > 2) {
          setPathData(second, path2Ref.current);
        }
      }

      requestAnimationFrame(updateForce);
      last = timestamp;
    }

    setTimeout(() => {
      path1Ref.current.style['stroke-dasharray'] = '0';
      path2Ref.current.style['stroke-dasharray'] = '0';
    }, 1700);

    updateForce();
  }, []);

  return (
    <>
      <style>{`
        @keyframes slide {
          to {
            transform: translateX(0);
          }
        }

        @keyframes stroke {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      <svg
        width={rectRef.current?.width + 20}
        height={rectRef.current?.height + 20}
      >
        <g
          fill="transparent"
          stroke="#303030"
          stroke-width="12px"
          stroke-miterlimit="15"
          stroke-dasharray="1300"
          stroke-dashoffset="1300"
        >
          <path
            ref={path1Ref}
            style={{
              transform: 'translateX(200px)',
              animation: 'stroke 2s ease-in-out, slide 4s ease-in-out',
              animationDelay: '0s, 3s',
              animationFillMode: 'forwards',
            }}
          />
          <path
            ref={path2Ref}
            style={{
              transform: 'translateX(-200px)',
              animation: 'stroke 2s ease-in-out, slide 4s ease-in-out',
              animationDelay: '.5s, 3s',
              animationFillMode: 'forwards',
            }}
          />
        </g>
      </svg>
    </>
  );
}

export default function Demo() {
  const ref = useRef(null);

  useEffect(() => {
    initSvg(ref.current);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 250,
      }}
      ref={ref}
    />
  );
}
