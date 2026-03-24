'use client';
import { useState, useCallback, useEffect } from 'react';
import {
  InfiniteCanvas, useNodesState, useEdgesState,
  useReactFlow, Background, Panel,
} from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const slides = [
  { title: 'Welcome', content: 'This is a slideshow built with Infinite Canvas. Use the arrows to navigate.' },
  { title: 'Nodes', content: 'Nodes are the building blocks. They can be default, input, output, or fully custom React components.' },
  { title: 'Edges', content: 'Edges connect nodes. Choose from bezier, straight, smoothstep, or create custom edges.' },
  { title: 'Handles', content: 'Handles are connection points. Place them on any side of a node with source/target types.' },
  { title: 'Thank You', content: 'Start building with @infinit-canvas/react today!' },
];

function SlideNode({ data }) {
  return (
    <div style={{
      width: 380,
      height: 240,
      background: data.bg || '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 30,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#1a192b' }}>{data.title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.5 }}>{data.content}</p>
    </div>
  );
}

const nodeTypes = { slide: SlideNode };

const bgs = ['#eff6ff', '#f0fdf4', '#fffbeb', '#fdf2f8', '#eef2ff'];

const initialNodes = slides.map((s, i) => ({
  id: `slide-${i}`,
  type: 'slide',
  position: { x: i * 500, y: 0 },
  data: { ...s, bg: bgs[i] },
  draggable: false,
}));

function SlideNavigator({ current, onGoTo }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    fitView({ padding: 0.3, duration: 500, nodes: [{ id: `slide-${current}` }] });
  }, [current, fitView]);

  return (
    <Panel position="bottom-center">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#fff', border: '1px solid #ddd', borderRadius: 8,
        padding: '6px 16px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <button
          onClick={() => onGoTo(current - 1)}
          disabled={current === 0}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, opacity: current === 0 ? 0.3 : 1 }}
        >
          ←
        </button>
        <span>{current + 1} / {slides.length}</span>
        <button
          onClick={() => onGoTo(current + 1)}
          disabled={current === slides.length - 1}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, opacity: current === slides.length - 1 ? 0.3 : 1 }}
        >
          →
        </button>
      </div>
    </Panel>
  );
}

export default function SlideshowExample() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState([]);
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index) => {
    if (index < 0 || index >= slides.length) return;
    setCurrent(index);
  }, []);

  return (
    <InfiniteCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      zoomOnScroll={false}
      panOnScroll={false}
      nodesDraggable={false}
      showHud={false}
      showHint={false}
      height="380px"
    >
      <Background variant="dots" />
      <SlideNavigator current={current} onGoTo={goTo} />
    </InfiniteCanvas>
  );
}
