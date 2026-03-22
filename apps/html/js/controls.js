// ── UI controls ─────────────────────────────────────────────────────
// Button handlers for reset view, add card, and tab switching.

import { camera, cards, resetCamera, incrementCardCount } from './state.js';
import { sendCamera, sendCards } from './worker-bridge.js';

// Reset camera to origin with default zoom
export function resetView() {
  resetCamera();
  // After resetCamera(), the module-level `camera` binding is stale
  // (it was reassigned). We need to import it fresh — but since we
  // imported by reference, we re-read from state.
  sendCamera({ x: 0, y: 0, zoom: 1 });
}

// Add a new card at the center of the current viewport
export function addCard(wrap) {
  const rect = wrap.getBoundingClientRect();
  const wx = Math.round(-camera.x / camera.zoom + (rect.width / 2) / camera.zoom);
  const wy = Math.round(-camera.y / camera.zoom + (rect.height / 2) / camera.zoom);
  const count = incrementCardCount();
  cards.push({
    x: wx - 80, y: wy - 45, w: 160, h: 90,
    title: `Note ${count}`, body: 'Added at viewport center',
  });
  sendCards(cards);
}

// Tab switcher for the code explainer section
export function showTab(i, btn) {
  document.querySelectorAll('.ic-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['tab0', 'tab1', 'tab2', 'tab3'].forEach((id, j) => {
    document.getElementById(id).style.display = j === i ? 'block' : 'none';
  });
}
