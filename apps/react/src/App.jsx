import { useState, useEffect } from 'react';
import { InfiniteCanvas } from 'react-infinite-canvas';
import 'react-infinite-canvas/styles.css';
import CodeTabs from './components/CodeTabs';
import StressTest from './StressTest';
import './App.css';

const INITIAL_CARDS = [
  { x: 60, y: 80, w: 160, h: 90, title: 'Note A', body: 'Pan and zoom me!' },
  { x: 320, y: 140, w: 160, h: 90, title: 'Note B', body: 'I live in world space' },
  { x: -160, y: 200, w: 160, h: 90, title: 'Note C', body: 'Scroll to find me' },
  { x: 500, y: -60, w: 160, h: 90, title: 'Note D', body: 'Try zooming out!' },
];

export default function App() {
  const [page, setPage] = useState(location.hash === '#stress' ? 'stress' : 'demo');

  useEffect(() => {
    const onHash = () => setPage(location.hash === '#stress' ? 'stress' : 'demo');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (page === 'stress') {
    return (
      <div>
        <div style={{ padding: '10px 20px 0' }}>
          <a href="#demo" style={{ fontSize: 12, color: '#888' }}>&larr; Back to demo</a>
        </div>
        <StressTest />
      </div>
    );
  }

  return (
    <div className="app">
      <InfiniteCanvas
        cards={INITIAL_CARDS}
        height="420px"
      />

      <div id="ic-controls">
        <span className="ic-hint-text">
          Try panning &amp; zooming — grid extends forever
        </span>
        <a href="#stress" style={{ fontSize: 12, marginLeft: 'auto', color: '#888' }}>
          Stress Test (2000 cards) &rarr;
        </a>
      </div>

      <CodeTabs />
    </div>
  );
}
