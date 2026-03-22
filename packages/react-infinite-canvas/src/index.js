// ─── Core ────────────────────────────────────────────────────────
export { default as InfiniteCanvas } from './InfiniteCanvas.jsx';
export { InfiniteCanvasProvider } from './InfiniteCanvas.jsx';
export { default as useInfiniteCanvas } from './useInfiniteCanvas.js';

// ─── Hooks ───────────────────────────────────────────────────────
// State management (like React Flow's useState wrappers)
export { default as useNodesState } from './hooks/useNodesState.js';
export { default as useEdgesState } from './hooks/useEdgesState.js';

// Canvas instance & data access
export {
  useReactFlow,           // Imperative API: fitView, zoomIn, getNodes, setNodes, etc.
  useNodes,               // Read current nodes array
  useEdges,               // Read current edges array
  useViewport,            // Read current viewport { x, y, zoom }
  useConnection,          // Connection state while dragging a new edge
  useNodesData,           // Read data for specific node IDs
  useNodeConnections,     // Get edges connected to a node
  useHandleConnections,   // Get edges connected to a specific handle
  useOnViewportChange,    // Subscribe to viewport changes
  useOnSelectionChange,   // Subscribe to selection changes
  useKeyPress,            // Track if a key is currently pressed
  useUpdateNodeInternals, // Force recalculate node internals
  useNodesInitialized,    // Check if nodes are initialized
  useInternalNode,        // Access internal node data
  useStore,               // Direct store access (selector pattern)
  useStoreApi,            // Imperative store access { getState() }
  useNodeId,              // Current node ID (stub — canvas-based)
} from './hooks/index.js';

// ─── Utilities ───────────────────────────────────────────────────
// Change helpers (apply incremental updates to node/edge arrays)
export { applyNodeChanges, applyEdgeChanges, addEdge } from './utils/changes.js';

// Graph traversal & geometry
export {
  isNode,               // Type guard: is this object a node?
  isEdge,               // Type guard: is this object an edge?
  getConnectedEdges,    // Get all edges touching a set of nodes
  getIncomers,          // Get nodes with edges pointing TO a node
  getOutgoers,          // Get nodes with edges pointing FROM a node
  getNodesBounds,       // Bounding box of a set of nodes
  getViewportForBounds, // Compute viewport to fit a bounding box
  snapPosition,         // Snap { x, y } to a grid
  clampPosition,        // Clamp { x, y } to an extent
  getNodeDimensions,    // Get node { width, height } with fallbacks
  getNodesInside,       // Filter nodes inside a rect
  rectToBox,            // Convert rect to box format
  boxToRect,            // Convert box to rect format
  getBoundsOfBoxes,     // Merge two bounding boxes
  getOverlappingArea,   // Overlap area of two rects
  nodeToRect,           // Convert node to rect
} from './utils/graph.js';

// Edge path generators
export {
  getBezierPath,          // Generate bezier curve SVG path
  getSimpleBezierPath,    // Simplified bezier path
  getSmoothStepPath,      // Smooth step (rounded orthogonal) path
  getStraightPath,        // Straight line path
  getBezierEdgeCenter,    // Center point of bezier edge
  getEdgeCenter,          // Center point of any edge
  reconnectEdge,          // Move edge source/target to a new node
} from './utils/paths.js';

// ─── Components ──────────────────────────────────────────────────
export { default as MiniMap } from './components/MiniMap/index.jsx';
export { default as Controls } from './components/Controls/index.jsx';
export { default as Background } from './components/Background/index.jsx';
export { default as Panel } from './components/Panel/index.jsx';
