import React from 'react';

interface PaperProps {
  title: string;
  url: string;
  rotation?: number;
  className?: string;
}

export function Paper({
  title,
  url,
  rotation = 0,
  className = '',
}: PaperProps) {
  // Generate a unique ID for this paper instance to avoid clip-path conflicts
  const clipId = React.useId();

  // Generate deterministic random scribbles based on URL
  const seed = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (index: number, range: number) => {
    const x = Math.sin(seed + index) * 10000;
    return (x - Math.floor(x)) * range;
  };

  // Create the paper content to be reused across all slices
  const paperContent = (
    <>
      {/* Paper with torn edge as visible path */}
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Torn paper shape */}
        <path
          d={`M 6,3
                        C 7,5 10,2 13,4
                        L 18,1.6
                        C 22,1 25,3.6 29,2.4
                        L 38,1.6
                        C 42,0.6 46,2.4 50,1.2
                        L 74,0.8
                        C 88,0.4 102,1.6 116,1
                        L 152,1.8
                        C 164,3 176,1.2 182,3.6
                        L 191,6
                        C 193,7.6 196,10 197,13
                        L 198.4,22
                        C 199.2,26 198,30 198.8,34
                        L 199.6,60
                        C 200,76 198.8,92 199.2,108
                        L 198.4,152
                        C 197.2,168 198.6,176 197.6,184
                        L 196,194
                        C 195,196.4 197,198.4 194,199
                        L 182,199.6
                        C 176,200 170,198.6 164,199.2
                        L 140,199.6
                        C 124,199.8 108,199 92,199.4
                        L 50,198.8
                        C 30,198.2 16,199.2 6,197
                        L 3,194
                        C 2,191 3.6,187 2.4,184
                        L 1.6,170
                        C 0.8,162 2.4,154 1.2,146
                        L 0.8,104
                        C 0.4,84 1.6,64 1,44
                        L 2.4,16
                        C 3,10 1.6,6 3,4.4
                        Z`}
          fill="white"
          stroke="#1a1a1a"
          strokeWidth="3"
          opacity="1"
        />
      </svg>

      {/* Content overlay */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: '20px',
        }}
        className="bg-transparent"
      >
        <div className="font-bold text-lg mb-4 leading-tight">Whoa</div>

        {/* Tiny illegible handwriting effect */}
        <svg
          className="mt-2"
          width="160"
          height="100"
          viewBox="0 0 160 100"
          style={{ overflow: 'visible' }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lineIndex => {
            const lineY = 5 + lineIndex * 10;
            const marks: JSX.Element[] = [];

            // Generate letter-like marks across the line
            for (let x = 2; x < 155; x += 2 + random(lineIndex * 100 + x, 2)) {
              const markIndex = lineIndex * 100 + x;
              const height = 2.5 + random(markIndex, 2); // Letter height variation
              const yOffset = random(markIndex + 1, 1.5) - 0.5; // Slight baseline variation
              const width = 1.5 + random(markIndex + 2, 1.5); // Letter width

              // Randomly create different letter-like shapes
              const shapeType = Math.floor(random(markIndex + 3, 3));

              if (shapeType === 0) {
                // Vertical stroke (like i, l, t)
                marks.push(
                  <line
                    key={`${lineIndex}-${x}`}
                    x1={x}
                    y1={lineY - height + yOffset}
                    x2={x}
                    y2={lineY + yOffset}
                    stroke="#1a1a1a"
                    strokeWidth="0.8"
                    opacity={0.7 + random(markIndex + 4, 0.15)}
                    strokeLinecap="round"
                  />,
                );
              } else if (shapeType === 1) {
                // Curved stroke (like c, e, o)
                marks.push(
                  <path
                    key={`${lineIndex}-${x}`}
                    d={`M${x},${lineY + yOffset} q${width * 0.5},-${
                      height * 0.7
                    } ${width},0`}
                    stroke="#1a1a1a"
                    strokeWidth="0.8"
                    fill="none"
                    opacity={0.7 + random(markIndex + 5, 0.15)}
                    strokeLinecap="round"
                  />,
                );
              } else {
                // Small horizontal stroke (like dash, crossbar)
                marks.push(
                  <line
                    key={`${lineIndex}-${x}`}
                    x1={x}
                    y1={lineY - height * 0.5 + yOffset}
                    x2={x + width}
                    y2={lineY - height * 0.5 + yOffset}
                    stroke="#1a1a1a"
                    strokeWidth="0.8"
                    opacity={0.7 + random(markIndex + 6, 0.15)}
                    strokeLinecap="round"
                  />,
                );
              }

              // Occasionally add a small space (word break)
              if (random(markIndex + 7, 10) > 7) {
                x += 3;
              }
            }

            return marks;
          })}
        </svg>
      </div>
    </>
  );

  const numSlices = 10;
  const slices = Array.from({ length: numSlices }, (_, i) => i);

  return (
    <a
      href="#"
      className={`uncolored-link paper-element block relative text-black no-underline ${className}`}
      style={{
        width: '200px',
        height: '200px',
        transform: `rotate(${rotation}deg)`,
        transformStyle: 'preserve-3d',
        zIndex: 10,
      }}
    >
      {slices.map(i => {
        const sliceHeight = 200 / numSlices;
        const startY = i * sliceHeight;
        const endY = (i + 1) * sliceHeight;

        return (
          <div
            key={i}
            className={`paper-slice paper-slice-${i}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '200px',
              height: '200px',
              clipPath: `polygon(0 ${startY}px, 200px ${startY}px, 200px ${endY}px, 0 ${endY}px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {paperContent}
          </div>
        );
      })}
    </a>
  );
}
