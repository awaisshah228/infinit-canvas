// ── Entry point ─────────────────────────────────────────────────────
// Wires up the worker, event handlers, and UI controls.

import { initWorker } from './worker-bridge.js';
import { setupEvents } from './events.js';
import { resetView, addCard, showTab } from './controls.js';

const canvas = document.getElementById('ic-canvas');
const wrap = document.getElementById('ic-wrap');
const info = document.getElementById('ic-info');

// Initialize the OffscreenCanvas worker
initWorker(canvas, wrap, info);

// Set up pan/zoom input handlers
setupEvents(wrap);

// Expose UI actions to onclick handlers in HTML
window.resetView = resetView;
window.addCard = () => addCard(wrap);
window.showTab = showTab;
