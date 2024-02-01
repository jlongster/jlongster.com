import { useState, useRef } from 'react';
import { Hsluv } from 'hsluv';

// const initialColors = [
//   {
//     h: 100,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 100 + 72 % 360,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 100 + 72 * 2 % 360,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 100 + 72 * 3 % 360,
//     s: 100,
//     l: 52,
//   },
//   {
//     h: 100 + 72 * 4 % 360,
//     s: 100,
//     l: 52,
//   },
// ];

const colorNames = ['pink', 'green', 'yellow', 'purple', 'blue'];

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
    h: 359,
    s: 60,
    l: 41,
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

function Box({ color }) {
  return (
    <div
      style={{ width: 80, height: 70, backgroundColor: color }}
      onClick={e => {
        if (e.shiftKey) {
          document.body.querySelector('.text').style.color = color;
        } else {
          document.body.style.backgroundColor = color;
        }
      }}
    />
  );
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
  return [
    { h, s, l: l - 12 },
    { h, s, l },
    { h, s, l: l + 9 },
    { h, s, l: l + 9 * 2 },
    { h, s, l: l + 9 * 3 },
    { h, s, l: l + 9 * 4 },
  ];
}

function Gradient({ color }) {
  const { h, s, l } = color;
  const gradient = color_to_gradient(h, s, l);

  return (
    <div>
      {gradient.map((color, idx) => (
        <Box key={idx} color={hsl_to_hex(color.h, color.s, color.l)} />
      ))}
    </div>
  );
}

function Controls({ color }) {
  const { h, setH, s, setS, l, setL } = color;
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <Gradient color={color} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'center',
        }}
      >
        <div>
          H:{' '}
          <input
            type="range"
            value={h}
            min="0"
            max="360"
            onChange={e =>
              console.log(h, s, l, e.target.value) ||
              setH(parseInt(e.target.value))
            }
            style={{ width: 300 }}
          />
        </div>
        <div>
          S:{' '}
          <input
            type="range"
            value={s}
            min="0"
            max="100"
            onChange={e => setS(parseInt(e.target.value))}
            style={{ width: 300 }}
          />
        </div>
        <div>
          L:{' '}
          <input
            type="range"
            value={l}
            min="0"
            max="100"
            onChange={e => setL(parseInt(e.target.value))}
            style={{ width: 300 }}
          />
        </div>
      </div>
    </div>
  );
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

export default function Colors() {
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

  return (
    <div
      style={{
        margin: '0 auto',
        marginTop: 20,
        width: 'fit-content',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div className="text" style={{ marginBottom: 30 }}>
        This is a bunch of text
      </div>
      <div
        style={{
          display: 'flex',
        }}
      >
        <Gradient color={color1} />
        <Gradient color={color2} />
        <Gradient color={color3} />
        <Gradient color={color4} />
        <Gradient color={color5} />
      </div>
      <div
        style={{
          marginTop: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        <Controls color={color1} />
        <Controls color={color2} />
        <Controls color={color3} />
        <Controls color={color4} />
        <Controls color={color5} />
      </div>

      <div style={{ marginTop: 50 }}>
        <textarea
          style={{ minWidth: 500, height: 300 }}
          value={JSON.stringify(colors, null, 2)}
          onChange={() => {}}
        />
      </div>
      <div style={{ marginTop: 50 }}>
        <textarea
          style={{ minWidth: 500, height: 300 }}
          defaultValue=""
          ref={inputRef}
          placeholder="paste hsl colors here"
        />
        <br />
        <button
          onClick={e => {
            const input = inputRef.current.value;
            const data = JSON.parse(input);

            data.forEach((c, idx) => {
              const currentColor = colors[idx];
              currentColor.setH(c.h);
              currentColor.setS(c.s);
              currentColor.setL(c.l);
            });

            inputRef.current.value = '';
          }}
        >
          apply
        </button>
      </div>
      <div style={{ marginTop: 50 }}>
        <textarea
          style={{ minWidth: 500, height: 300 }}
          value={makeCssVars(hexes)}
          onChange={() => {}}
        />
      </div>
    </div>
  );
}
