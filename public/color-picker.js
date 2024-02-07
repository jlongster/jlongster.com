/* global React, ReactDOM */
import 'https://unpkg.com/react@18/umd/react.production.min.js';
import 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
import { Hsluv } from 'https://unpkg.com/hsluv@1.0.1/dist/hsluv.mjs';

const { createElement: e, useState, useRef, useEffect } = React;

const colorNames = ['red', 'green', 'yellow', 'purple', 'blue'];

// const initialColors = [
//   {
//     h: 100,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 172,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 244,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 316,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 388 % 360,
//     s: 100,
//     l: 52,
//   },
// ];

const initialColors = [
  {
    h: 13,
    s: 87,
    l: 36,
  },
  {
    h: 155,
    s: 85,
    l: 60,
  },
  {
    h: 57,
    s: 79,
    l: 55,
  },
  {
    h: 287,
    s: 61,
    l: 50,
  },
  {
    h: 258,
    s: 74,
    l: 43,
  },
];

function Box({ varName }) {
  return e('div', {
    style: {
      width: 80,
      height: 70,
      backgroundColor: `var(${varName})`,
    },
    onClick: e => {
      if (e.shiftKey) {
        document.body.style.color = `var(${varName})`;
      } else {
        document.body.style.backgroundColor = `var(${varName})`;
      }
    },
  });
}

if (typeof window !== 'undefined') {
  window.Hsluv = Hsluv;
}

function hsl_to_hex(h, s, l) {
  var conv = new Hsluv();
  conv.hsluv_h = h;
  conv.hsluv_s = s;
  conv.hsluv_l = l;
  conv.hsluvToHex();
  return conv.hex;
}

function color_to_gradient(h, s, l) {
  const step = 5;
  return [
    { h, s, l: l - step },
    { h, s, l },
    { h, s, l: l + step },
    { h, s, l: l + step * 2 },
    { h, s, l: l + step * 3 },
    { h, s, l: l + step * 4 },
  ];
}

function makeVarName(name, idx) {
  return `--${name}-${idx}`;
}

function Gradient({ name }) {
  const boxes = [];
  for (let i = 0; i < 6; i++) {
    boxes.push(e(Box, { varName: makeVarName(name, i) }));
  }

  return e('div', null, boxes);
}

function Controls({ color, name }) {
  const { h, setH, s, setS, l, setL } = color;

  useEffect(() => {
    // Apply all the colors to CSS variables
    const gradient = color_to_gradient(h, s, l);
    gradient.forEach((color, idx) => {
      const vname = makeVarName(name, idx);
      const hex = hsl_to_hex(color.h, color.s, color.l);
      document.documentElement.style.setProperty(vname, hex);
    });
  }, [h, s, l, name]);

  return e('div', {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
    },
    children: [
      e(Gradient, {
        color: color,
        name,
      }),
      e('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'center',
        },
        children: [
          e('div', {
            children: [
              'H:',
              ' ',
              e('input', {
                type: 'range',
                value: h,
                min: '0',
                max: '360',
                onChange: e => setH(parseInt(e.target.value)),
                style: {
                  width: 300,
                },
              }),
            ],
          }),
          e('div', {
            children: [
              'S:',
              ' ',
              e('input', {
                type: 'range',
                value: s,
                min: '0',
                max: '100',
                onChange: e => setS(parseInt(e.target.value)),
                style: {
                  width: 300,
                },
              }),
            ],
          }),
          e('div', {
            children: [
              'L:',
              ' ',
              e('input', {
                type: 'range',
                value: l,
                min: '0',
                max: '100',
                onChange: e => setL(parseInt(e.target.value)),
                style: {
                  width: 300,
                },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function makeCssVars(hexes) {
  return hexes
    .map((lst, idx) => {
      const name = colorNames[idx];
      return lst
        .map((hex, idx) => {
          return `--${name}-${idx}: ${hex};`;
        })
        .join('\n');
    })
    .join('\n');
}

function useColorState(c) {
  const [h, setH] = useState(c.h);
  const [s, setS] = useState(c.s);
  const [l, setL] = useState(c.l);
  return { h, setH, s, setS, l, setL };
}

function Colors() {
  const color1 = useColorState(initialColors[0]);
  const color2 = useColorState(initialColors[1]);
  const color3 = useColorState(initialColors[2]);
  const color4 = useColorState(initialColors[3]);
  const color5 = useColorState(initialColors[4]);

  const inputRef = useRef();

  const colors = [color1, color2, color3, color4, color5];
  const gradients = colors.map(c => color_to_gradient(c.h, c.s, c.l));
  const hexes = gradients.map(gradient =>
    gradient.map(c => hsl_to_hex(c.h, c.s, c.l)),
  );

  function setColors(data) {
    data.forEach((c, idx) => {
      const currentColor = colors[idx];
      currentColor.setH(c.h);
      currentColor.setS(c.s);
      currentColor.setL(c.l);
    });
  }

  const timer = useRef();
  useEffect(() => {
    clearTimeout(timer);
    timer.current = setTimeout(() => {
      window.localStorage.setItem('lastColors', JSON.stringify(colors));
    }, 100);
  });

  useEffect(() => {
    if (window.localStorage.lastColors) {
      const colors = JSON.parse(window.localStorage.getItem('lastColors'));
      if (colors) {
        setColors(colors);
      }
    }
  }, []);

  return e('div', {
    style: {
      margin: '0 auto',
      marginTop: 20,
      width: 'fit-content',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    children: [
      e('div', {
        style: {
          display: 'flex',
        },
        children: [
          e(Gradient, {
            color: color1,
            name: colorNames[0],
          }),
          e(Gradient, {
            color: color2,
            name: colorNames[1],
          }),
          e(Gradient, {
            color: color3,
            name: colorNames[2],
          }),
          e(Gradient, {
            color: color4,
            name: colorNames[3],
          }),
          e(Gradient, {
            color: color5,
            name: colorNames[4],
          }),
        ],
      }),
      e('div', {
        style: {
          marginTop: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        },
        children: [
          e(Controls, {
            color: color1,
            name: colorNames[0],
          }),
          e(Controls, {
            color: color2,
            name: colorNames[1],
          }),
          e(Controls, {
            color: color3,
            name: colorNames[2],
          }),
          e(Controls, {
            color: color4,
            name: colorNames[3],
          }),
          e(Controls, {
            color: color5,
            name: colorNames[4],
          }),
        ],
      }),
      e('div', {
        style: {
          marginTop: 50,
        },
        children: e('textarea', {
          style: {
            minWidth: 500,
            height: 300,
          },
          value: JSON.stringify(colors, null, 2),
          onChange: () => {},
        }),
      }),
      e('div', {
        style: {
          marginTop: 50,
        },
        children: [
          e('textarea', {
            style: {
              minWidth: 500,
              height: 300,
            },
            defaultValue: '',
            ref: inputRef,
            placeholder: 'paste hsl colors here',
          }),
          e('br'),
          e('button', {
            onClick: e => {
              const input = inputRef.current.value;
              const data = JSON.parse(input);
              setColors(data);
              inputRef.current.value = '';
            },
            children: 'apply',
          }),
        ],
      }),
      e('div', {
        style: {
          marginTop: 50,
        },
        children: e('textarea', {
          style: {
            minWidth: 500,
            height: 300,
          },
          value: makeCssVars(hexes),
          onChange: () => {},
        }),
      }),
    ],
  });
}

const colorPickerBtn = document.querySelector('#color-picker');
const appState = {};

function closeApp(reset) {
  const app = document.querySelector('#color-picker-app');
  app.remove();

  document.querySelector('.color-picker-close').remove();
  document.querySelector('.site-content').classList.remove('collapsed');
  window.localStorage.removeItem('colorPickerOpen', 'true');
  colorPickerBtn.style.display = 'block';

  if (reset) {
    window.localStorage.removeItem('lastColors');
    document.body.style.backgroundColor = appState.initialBackgroundColor;
    document.body.style.color = appState.initialColor;
  }
}

function openApp() {
  const styles = window.getComputedStyle(document.body);
  if (appState.initialBackgroundColor == null) {
    appState.initialBackgroundColor = styles.backgroundColor;
  }
  if (appState.initialColor == null) {
    appState.initialColor = styles.color;
  }

  window.localStorage.setItem('colorPickerOpen', 'true');
  colorPickerBtn.style.display = 'none';

  const buttons = document.createElement('div');
  buttons.className = 'color-picker-close';
  Object.assign(buttons.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 1,
    display: 'flex',
    gap: '10px',
  });

  const closeAndReset = document.createElement('button');
  closeAndReset.textContent = 'close & reset';
  closeAndReset.addEventListener('click', () => closeApp(true));
  buttons.appendChild(closeAndReset);

  const close = document.createElement('button');
  close.textContent = 'close';
  close.addEventListener('click', () => closeApp());
  buttons.appendChild(close);

  document.body.appendChild(buttons);

  const div = document.createElement('div');
  div.id = 'color-picker-app';
  Object.assign(div.style, {
    width: 'calc(100% - var(--site-width) - 30px)',
    position: 'fixed',
    top: 0,
    right: 0,
    padding: '20px',
    borderLeft: '1px solid rgba(100, 100, 100, .1)',
    overflow: 'auto',
    height: '100%',
  });
  document.body.appendChild(div);

  document.querySelector('.site-content').classList.add('collapsed');

  ReactDOM.render(e(Colors), div);
}

if (colorPickerBtn) {
  colorPickerBtn.addEventListener('click', openApp);

  if (window.localStorage.getItem('colorPickerOpen')) {
    openApp();
  }
}
