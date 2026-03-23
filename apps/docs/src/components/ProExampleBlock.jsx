'use client';
import { useState } from 'react';

export default function ProExampleBlock({ title, description, preview, files = [], readme }) {
  const [tab, setTab] = useState(preview ? 'preview' : 'code'); // 'preview' | 'code' | 'readme'
  const [activeFile, setActiveFile] = useState(0);

  // Build file tree from flat file list
  const fileTree = buildFileTree(files);

  return (
    <div className="pro-example">
      <div className="pro-example-header">
        <div>
          <h1 className="pro-example-title">{title}</h1>
          {description && <p className="pro-example-desc">{description}</p>}
        </div>
      </div>

      <div className="pro-example-tabs">
        <button
          className={`pro-tab${tab === 'preview' ? ' active' : ''}`}
          onClick={() => setTab('preview')}
        >
          <PreviewIcon /> Preview
        </button>
        <button
          className={`pro-tab${tab === 'code' ? ' active' : ''}`}
          onClick={() => setTab('code')}
        >
          <CodeIcon /> Code
        </button>
        {readme && (
          <button
            className={`pro-tab${tab === 'readme' ? ' active' : ''}`}
            onClick={() => setTab('readme')}
          >
            <ReadmeIcon /> Readme
          </button>
        )}
      </div>

      <div className="pro-example-body">
        {tab === 'preview' && (
          <div className="pro-preview">
            {preview}
          </div>
        )}

        {tab === 'code' && (
          <div className="pro-code-layout">
            <div className="pro-file-tree">
              <div className="pro-file-tree-header">src</div>
              {fileTree.map((node, i) => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  activeIndex={activeFile}
                  files={files}
                  onSelect={setActiveFile}
                />
              ))}
            </div>
            <div className="pro-code-viewer">
              <div className="pro-code-filename">{files[activeFile]?.name}</div>
              <div className="pro-code-content">
                <pre><code>{files[activeFile]?.code}</code></pre>
              </div>
            </div>
          </div>
        )}

        {tab === 'readme' && readme && (
          <div className="pro-readme">
            <div className="pro-readme-content" dangerouslySetInnerHTML={{ __html: readme }} />
          </div>
        )}
      </div>
    </div>
  );
}

function FileTreeNode({ node, activeIndex, files, onSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);

  if (node.children) {
    return (
      <div className="pro-tree-folder">
        <button
          className="pro-tree-item pro-tree-folder-name"
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="pro-tree-arrow">{expanded ? '▾' : '▸'}</span>
          <FolderIcon open={expanded} />
          {node.name}
        </button>
        {expanded && node.children.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            activeIndex={activeIndex}
            files={files}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  const fileIndex = files.findIndex((f) => f.name === node.path);
  const isActive = fileIndex === activeIndex;

  return (
    <button
      className={`pro-tree-item pro-tree-file${isActive ? ' active' : ''}`}
      style={{ paddingLeft: 12 + depth * 16 }}
      onClick={() => onSelect(fileIndex)}
    >
      <FileIcon name={node.name} />
      {node.name}
    </button>
  );
}

function buildFileTree(files) {
  // For simplicity, just return flat file list as tree nodes
  return files.map((f) => ({
    name: f.name,
    path: f.name,
  }));
}

function PreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ReadmeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function FolderIcon({ open }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function FileIcon({ name }) {
  const ext = name.split('.').pop();
  const color = ext === 'jsx' || ext === 'tsx' ? '#61dafb'
    : ext === 'css' ? '#264de4'
    : ext === 'js' || ext === 'ts' ? '#f7df1e'
    : 'var(--text-secondary)';

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
