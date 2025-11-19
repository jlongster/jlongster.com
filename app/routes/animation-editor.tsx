import { Paper } from '~/components/Paper';

export default function AnimationEditor() {
  return (
    <div className="min-h-screen bg-[#fcfbf9] p-8 overflow-visible">
      <script src="/paper-position-tool.js" />
      <script src="/video-player.js" />
      <div className="max-w-6xl mx-auto relative min-h-[800px] flex flex-wrap justify-center content-start gap-8 py-20">
        <Paper
          title="Animation Editor Demo"
          url="#"
          rotation={0}
        >
          This is a demo paper for testing the animation editor.
        </Paper>
      </div>
    </div>
  );
}
