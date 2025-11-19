import { useState, useRef } from 'react';

export default function AnimationFlipper() {
  const [animationData, setAnimationData] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    debugger;
    e.preventDefault();
    console.log('Button clicked');
    console.log('Ref:', fileInputRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File change event triggered');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        console.log('Parsed JSON:', json);
        setAnimationData(json);
        console.log('Animation data set');
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const flipAnimation = () => {
    if (!animationData) return;

    const flipped = { ...animationData };

    // Process each keyframe
    if (flipped.keyframes) {
      flipped.keyframes = flipped.keyframes.map((keyframe: any) => {
        if (!keyframe) return keyframe;

        // Swap leftCurve and rightCurve
        const tempLeft = keyframe.leftCurve;
        const tempRight = keyframe.rightCurve;

        return {
          ...keyframe,
          leftCurve: tempRight ? [...tempRight].reverse() : tempRight,
          rightCurve: tempLeft ? [...tempLeft].reverse() : tempLeft,
        };
      });
    }

    setAnimationData(flipped);
  };

  const exportData = () => {
    if (!animationData) return;

    const dataStr = JSON.stringify(animationData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.json', '-flipped.json');
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Animation Flipper</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Import Animation Data</h2>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={handleButtonClick}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Choose File
          </button>
          {fileName && (
            <p className="mt-2 text-gray-600">Selected: {fileName}</p>
          )}
        </div>

        {animationData && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Animation Info</h2>
              <p className="text-gray-700 mb-2">
                <strong>File:</strong> {fileName}
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Keyframes:</strong> {animationData.keyframes?.filter((k: any) => k).length || 0}
              </p>
              <p className="text-gray-700 mb-4">
                <strong>FPS:</strong> {animationData.playbackFPS || 'N/A'}
              </p>

              <button
                onClick={flipAnimation}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition mr-4"
              >
                Flip Animation
              </button>

              <button
                onClick={exportData}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
              >
                Export Flipped Data
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Preview (First Keyframe)</h2>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96 text-gray-900">
                {JSON.stringify(animationData.keyframes?.[0] || animationData.keyframes?.find((k: any) => k), null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
