import { useState, useCallback, useMemo } from 'react';
import { InfiniteCanvas } from '@infinit-canvas/react';
import '@infinit-canvas/react/styles.css';

const COLS = 50;
const CARD_W = 160;
const CARD_H = 90;
const GAP_X = 40;
const GAP_Y = 40;

function generateCards(count) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    cards.push({
      x: col * (CARD_W + GAP_X),
      y: row * (CARD_H + GAP_Y),
      w: CARD_W,
      h: CARD_H,
      title: 'Card ' + (i + 1),
      body: 'Row ' + (row + 1) + ' Col ' + (col + 1),
    });
  }
  return cards;
}

export default function StressTest() {
  const [cardCount, setCardCount] = useState(2000);
  const [hud, setHud] = useState({ wx: 0, wy: 0, zoom: '1.00', renderMs: '0', fps: 0 });

  const cards = useMemo(() => generateCards(cardCount), [cardCount]);

  const onHudUpdate = useCallback((data) => setHud(data), []);

  return (
    <div style={{ padding: 20 }}>
      <InfiniteCanvas
        cards={cards}
        height="calc(100vh - 100px)"
        zoomMin={0.02}
        onHudUpdate={onHudUpdate}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
        <button onClick={() => setCardCount(c => c + 100)} style={btnStyle}>
          Add 100 more
        </button>
        <button onClick={() => setCardCount(5000)} style={btnStyle}>
          5000 cards
        </button>
        <button onClick={() => setCardCount(10000)} style={btnStyle}>
          10000 cards
        </button>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#888', marginLeft: 8 }}>
          {cardCount} cards | visible: {hud.visible || '?'} | world: ({hud.wx}, {hud.wy}) | zoom: {hud.zoom}x
          {hud.renderMs ? ' | render: ' + hud.renderMs + 'ms' : ''}
          {hud.fps ? ' | fps: ' + hud.fps : ''}
        </span>
      </div>
    </div>
  );
}

const btnStyle = {
  fontSize: 12,
  padding: '6px 14px',
  borderRadius: 6,
  border: '0.5px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
  color: '#333',
};
