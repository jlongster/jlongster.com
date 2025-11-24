export default function AnimationEditor() {
  return (
    <div className="min-h-screen bg-[#fcfbf9] p-8 overflow-visible">
      <script src="/paper-html-generator.js" />
      <script src="/paper-position-tool.js" />
      <script src="/video-player.js" />
      <div
        id="paper-container"
        className="max-w-6xl mx-auto relative min-h-[800px] flex flex-wrap justify-center content-start gap-8 py-20"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Wait for paper-html-generator to load
              function initPaper() {
                if (!window.generatePaperHTML) {
                  setTimeout(initPaper, 50);
                  return;
                }

                const container = document.getElementById('paper-container');
                if (!container) return;

                const paperHtml = window.generatePaperHTML({
                  title: 'Animation Editor Demo',
                  url: '#',
                  content: 'This is a demo paper for testing the animation editor. This is a demo paper for testing the animation editor. This is a demo paper for testing the animation editor. This is a demo paper for testing the animation editor. This is a demo paper for testing the animation editor. This is a demo paper for testing the animation editor.',
                  image: '',
                  rotation: 0
                });

                container.innerHTML = paperHtml;

                // Make the paper visible immediately (override the opacity: 0 from generator)
                const paperElement = container.querySelector('.paper-element');
                if (paperElement) {
                  paperElement.style.opacity = '1';
                }

                // Trigger paper-position-tool init after paper is rendered
                if (window.PaperPositionTool && window.PaperPositionTool.init) {
                  setTimeout(() => {
                    window.PaperPositionTool.init();
                  }, 100);
                }
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initPaper);
              } else {
                initPaper();
              }
            })();
          `,
        }}
      />
    </div>
  );
}
