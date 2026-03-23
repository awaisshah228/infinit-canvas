import { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useStore } from './store';
import { useDebouncedValue } from './useDebouncedValue';

export default function Preview() {
  const [status, setStatus] = useState('loading');
  const htmlPreviewUrl = usePreviewUrl();
  const containerRef = useRef<HTMLIFrameElement>(null);

  const downloadImage = async () => {
    const image = await fetch(htmlPreviewUrl);
    const imageBlog = await image.blob();
    const imageURL = URL.createObjectURL(imageBlog);

    const link = document.createElement('a');
    link.href = imageURL;
    link.download = 'react-flow-output.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="preview">
      <div className="image-container">
        <img
          src={htmlPreviewUrl}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
        {status === 'loading' && (
          <div className="image-status">Loading image…</div>
        )}
        {status === 'error' && (
          <div className="image-status" style={{ color: '#ff5555' }}>
            Could not load image!
          </div>
        )}
      </div>
      <button onClick={downloadImage} className="xy-theme__button">
        Download Image
      </button>
    </div>
  );
}

function usePreviewUrl() {
  const nodes = useStore(useShallow((s) => s.nodes));
  const edges = useStore(useShallow((s) => s.edges));

  const debouncedNodes = useDebouncedValue(nodes, 150);
  const debouncedEdges = useDebouncedValue(edges, 150);

  return useMemo(() => {
    const json = JSON.stringify(
      {
        nodes: debouncedNodes,
        edges: debouncedEdges,
        width: 300,
        height: 300,
        type: 'png',
      },
      null,
      0
    );
    const query = new URLSearchParams({ json }).toString();

    return `${import.meta.env.VITE_API_ENDPOINT}?${query}`;
  }, [debouncedNodes, debouncedEdges]);
}
