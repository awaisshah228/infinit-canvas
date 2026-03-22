'use client';
import { useState } from 'react';

export default function ExampleBlock({ preview, files }) {
  const [showCode, setShowCode] = useState(false);
  const [activeFile, setActiveFile] = useState(0);

  return (
    <div className="example-block">
      <div className="example-preview">
        {preview}
      </div>
      <div className="example-toolbar">
        <button
          className={showCode ? 'active' : ''}
          onClick={() => setShowCode(!showCode)}
        >
          <CodeIcon />
          {showCode ? 'Hide Code' : 'Show Code'}
        </button>
      </div>
      {showCode && (
        <div className="example-code-panel">
          {files.length > 1 && (
            <div className="code-file-tabs">
              {files.map((file, i) => (
                <button
                  key={file.name}
                  className={`code-file-tab${i === activeFile ? ' active' : ''}`}
                  onClick={() => setActiveFile(i)}
                >
                  {file.name}
                </button>
              ))}
            </div>
          )}
          <div className="code-file-content">
            <pre><code>{files[activeFile].code}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
