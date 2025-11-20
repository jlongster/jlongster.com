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
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '20px',
        fontFamily: 'LoveLexie, sans-serif',
        backgroundColor: 'white',
        border: '3px solid black',
      }}
      className="bg-transparent"
    >
      <a href={url} className="font-bold text-2xl mb-4 leading-tight">
        {title}
      </a>
      <div style={{ lineHeight: '1.5em' }}>{children}</div>
    </div>
  );

  const numSlices = 20;
  const slices = Array.from({ length: numSlices }, (_, i) => i);

  return (
    <div
      className={`uncolored-links paper-element block relative text-black no-underline ${className}`}
      style={{
        width: '250px',
        height: '300px',
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
