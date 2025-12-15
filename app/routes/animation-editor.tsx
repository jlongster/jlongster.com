import styles from '~/css/old-paper-refresh.css?url';

export function links() {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap',
    },
    {
      rel: 'stylesheet',
      href: styles,
    },
  ];
}

function Paper({
  children,
  animationConfig,
}: {
  children: React.ReactNode;
  animationConfig?: {
    animationName: string;
    offsetX: number;
    offsetY: number;
    rotation: number;
    scale: number;
    startKeyframe: number;
    endKeyframe: number;
  };
}) {
  const config = animationConfig || {
    animationName: 'floating',
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
      data-animation-name={config.animationName}
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
    <div
      className="min-h-screen overflow-visible"
      style={{
        backgroundColor: '#f5f5f4',
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      {/* Animation scripts - no devtools */}
      <script src="/old-paper-refresh/shadow-renderer.js" />
      <script src="/old-paper-refresh/paper-animator.js?v=7" />
      <script src="/old-paper-refresh/paper-renderer.js?v=3" />
      <script src="/old-paper-refresh/paper-animation-editor.js" />
      <script src="/old-paper-refresh/arrow-animator.js" />
      <script src="/old-paper-refresh/animation-coordinator.js" />

      {/* Video player */}
      <script src="/video-player.js" />

      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold text-gray-800 mb-2"
              style={{ fontFamily: 'Playfair Display' }}
            >
              Animation Editor
            </h1>
            <p className="text-gray-600">
              Click a paper to edit its animation.
              Use the video player button to load reference video.
            </p>
          </div>
          <button
            id="toggle-video-player"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Open Video Player
          </button>
        </div>

        <div className="relative min-h-[600px] flex flex-wrap justify-center content-start gap-8 py-12">
          <Paper
            animationConfig={{
              animationName: 'floating',
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
              scale: 1,
              startKeyframe: 0,
              endKeyframe: 59,
            }}
          >
            <p className="font-bold text-lg mb-2">Demo Paper</p>
            <p className="text-sm">
              Click on this paper to open the animation editor.
            </p>
          </Paper>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Wait for video player to be created
              function setupToggle() {
                const toggleBtn = document.getElementById('toggle-video-player');
                const container = document.getElementById('video-player-container');

                if (toggleBtn && container) {
                  toggleBtn.addEventListener('click', function() {
                    if (container.style.display === 'none') {
                      container.style.display = 'block';
                      toggleBtn.textContent = 'Hide Video Player';
                    } else {
                      container.style.display = 'none';
                      toggleBtn.textContent = 'Open Video Player';
                    }
                  });
                } else if (toggleBtn) {
                  // Video player not created yet, try again
                  setTimeout(setupToggle, 100);
                }
              }

              // Open animation editor automatically on page load
              function openAnimationEditor() {
                if (!window.PaperAnimator || !window.PaperAnimationEditor) {
                  setTimeout(openAnimationEditor, 100);
                  return;
                }

                // Get the first paper animator (paper-0)
                const animator = window.PaperAnimator.getAnimator('paper-0');
                if (!animator) {
                  // Papers not initialized yet, try again
                  setTimeout(openAnimationEditor, 100);
                  return;
                }

                const paperElement = animator.paperElement;
                if (!paperElement) {
                  setTimeout(openAnimationEditor, 100);
                  return;
                }

                const animationName = paperElement.getAttribute('data-animation-name') || 'floating';

                window.PaperAnimationEditor.open(animationName, paperElement, animator, {
                  onClose: function() {
                    console.log('Animation editor closed');
                  },
                  onAnimationChange: function(name, data) {
                    console.log('Animation changed:', name, data);
                  }
                });
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                  setupToggle();
                  openAnimationEditor();
                });
              } else {
                setupToggle();
                openAnimationEditor();
              }
            })();
          `,
        }}
      />
    </div>
  );
}
