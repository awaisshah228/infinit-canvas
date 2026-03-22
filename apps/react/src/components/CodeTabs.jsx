import { useState } from 'react';

const TABS = [
  {
    label: 'How it works',
    code: `// The core idea: never move content — move a camera
ctx.save();
ctx.translate(camera.x, camera.y);   // pan offset
ctx.scale(camera.zoom, camera.zoom); // zoom level
drawEverything();   // all content drawn in world space
ctx.restore();`,
  },
  {
    label: 'Pan',
    code: `// Pan: accumulate pointer delta into camera offset
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  camera.x += e.movementX;
  camera.y += e.movementY;
  // No content moves — only the transform changes
  worker.postMessage({ type: 'camera', data: camera });
});`,
  },
  {
    label: 'Zoom',
    code: `// Zoom: scale around the cursor position
canvas.addEventListener('wheel', e => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  // Translate so cursor stays fixed in world space:
  camera.x = e.offsetX - (e.offsetX - camera.x) * delta;
  camera.y = e.offsetY - (e.offsetY - camera.y) * delta;
  camera.zoom *= delta;
  worker.postMessage({ type: 'camera', data: camera });
});`,
  },
  {
    label: 'Worker',
    code: `// Rendering runs in a Web Worker via OffscreenCanvas
// Main thread only handles events — never blocked by draws
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('canvas.worker.js');
worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

// Worker receives camera updates and renders independently
self.onmessage = ({ data }) => {
  camera = data.camera;
  requestAnimationFrame(render);
};`,
  },
];

export default function CodeTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="ic-step">
      <div className="ic-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            className={`ic-tab${i === active ? ' active' : ''}`}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <pre className="ic-code">{TABS[active].code}</pre>
    </div>
  );
}
