function Paper({
  children,
  animationConfig,
}: {
  children: React.ReactNode;
  animationConfig?: {
    animationIndex: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
    scale: number;
    startKeyframe: number;
    endKeyframe: number;
  };
}) {
  const config = animationConfig || {
    animationIndex: 0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1,
    startKeyframe: 0,
    endKeyframe: 59,
  };

  return (
    <div
      className="paper-component"
      data-paper-style="text"
      data-animation-index={config.animationIndex}
      data-offset-x={config.offsetX}
      data-offset-y={config.offsetY}
      data-rotation={config.rotation}
      data-scale={config.scale}
      data-start-keyframe={config.startKeyframe}
      data-end-keyframe={config.endKeyframe}
    >
      {children}
    </div>
  );
}

export default function AnimationEditor() {
  return (
    <div className="min-h-screen bg-[#fcfbf9] p-8 overflow-visible">
      {/* Load scripts in same order as index page */}
      <script src="/paper-devtools.js" />
      <script src="/shadow-renderer.js" />
      <script src="/paper-animator.js?v=7" />
      <script src="/paper-renderer.js?v=3" />
      <script src="/paper-animation-editor.js" />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-gray-800 mb-2"
            style={{ fontFamily: 'Playfair Display' }}
          >
            Animation Editor
          </h1>
          <p className="text-gray-600">
            Click a paper to select it, then use the DevTools sidebar to edit.
            Click "Edit Animation" to open the bezier curve editor.
          </p>
        </div>

        <div
          className="relative min-h-[600px] flex flex-wrap justify-center content-start gap-8 py-12"
        >
          <Paper
            animationConfig={{
              animationIndex: 0,
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
              scale: 1,
              startKeyframe: 0,
              endKeyframe: 59,
            }}
          >
            <p className="font-bold text-lg mb-2">Demo Paper 1</p>
            <p className="text-sm">
              This is a demo paper for testing the animation editor.
              Click on it to select, then click "Edit Animation" in the DevTools sidebar.
            </p>
          </Paper>

          <Paper
            animationConfig={{
              animationIndex: 1,
              offsetX: 300,
              offsetY: 50,
              rotation: 5,
              scale: 1,
              startKeyframe: 0,
              endKeyframe: 59,
            }}
          >
            <p className="font-bold text-lg mb-2">Demo Paper 2</p>
            <p className="text-sm">
              This paper uses a different animation (Animation 2).
              Edit it to see changes reflected in real-time.
            </p>
          </Paper>

          <Paper
            animationConfig={{
              animationIndex: 0,
              offsetX: 600,
              offsetY: -20,
              rotation: -8,
              scale: 0.9,
              startKeyframe: 20,
              endKeyframe: 59,
            }}
          >
            <p className="font-bold text-lg mb-2">Demo Paper 3</p>
            <p className="text-sm">
              This paper also uses Animation 1 - edit Animation 1 and both
              Paper 1 and Paper 3 will update!
            </p>
          </Paper>
        </div>
      </div>
    </div>
  );
}
