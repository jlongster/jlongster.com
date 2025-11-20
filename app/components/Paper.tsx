import React from 'react';

interface PaperProps {
  title: string;
  url: string;
  rotation?: number;
  className?: string;
  children?: React.ReactNode;
}

export function Paper({
  title,
  url,
  rotation = 0,
  children,
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
        width="250"
        height="300"
        viewBox="0 0 250 300"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Torn paper shape */}
        <path
          d={`M 7.5,4.5
                        C 8.75,7.5 12.5,3 16.25,6
                        L 22.5,2.4
                        C 27.5,1.5 31.25,5.4 36.25,3.6
                        L 47.5,2.4
                        C 52.5,0.9 57.5,3.6 62.5,1.8
                        L 92.5,1.2
                        C 110,0.6 127.5,2.4 145,1.5
                        L 190,2.7
                        C 205,4.5 220,1.8 227.5,5.4
                        L 238.75,9
                        C 241.25,11.4 245,15 246.25,19.5
                        L 248,33
                        C 249,39 247.5,45 248.5,51
                        L 249.5,90
                        C 250,114 248.5,138 249,162
                        L 248,228
                        C 246.5,252 247.25,264 246,276
                        L 245,291
                        C 243.75,294.6 246.25,297.6 242.5,298.5
                        L 227.5,299.4
                        C 220,300 212.5,297.9 205,298.8
                        L 175,299.4
                        C 155,299.7 135,298.5 115,299.1
                        L 62.5,298.2
                        C 37.5,297.3 20,298.8 7.5,295.5
                        L 3.75,291
                        C 2.5,286.5 4.5,280.5 3,276
                        L 2,255
                        C 1,243 3,231 1.5,219
                        L 1,156
                        C 0.5,126 2,96 1.25,66
                        L 3,24
                        C 3.75,15 2,9 3.75,6.6
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
          fontFamily: 'LoveLexie, sans-serif',
        }}
        className="bg-transparent"
      >
        <a href={url} className="font-bold text-2xl mb-4 leading-tight">
          {title}
        </a>

        {/* Tiny illegible handwriting effect */}
        {/*<svg
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
          </svg>*/}
        <div style={{ lineHeight: '1.5em' }}>{children}</div>
      </div>
    </>
  );

  const numSlices = 10;
  const slices = Array.from({ length: numSlices }, (_, i) => i);

  return (
    <div
      className={`uncolored-links paper-element block relative text-black no-underline ${className}`}
      style={{
        width: '250px',
        height: '300px',
        transform: `rotate(${rotation}deg)`,
        transformStyle: 'preserve-3d',
        zIndex: 10,
      }}
    >
      {slices.map(i => {
        const sliceHeight = 300 / numSlices;
        const startY = i * sliceHeight;
        const endY = (i + 1) * sliceHeight;

        return (
          <div
            key={i}
            className={`paper-slice paper-slice-${i}`}
            style={{
              opacity: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              width: '250px',
              height: '300px',
              clipPath: `polygon(0 ${startY}px, 250px ${startY}px, 250px ${endY}px, 0 ${endY}px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {paperContent}
          </div>
        );
      })}
    </div>
  );
}
