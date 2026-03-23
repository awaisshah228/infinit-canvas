// ─── Core Types ──────────────────────────────────────────────────

export type XYPosition = { x: number; y: number };
export type Dimensions = { width: number; height: number };
export type Rect = XYPosition & Dimensions;
export type Transform = [number, number, number]; // [tx, ty, scale]
export type SnapGrid = [number, number];
export type CoordinateExtent = [[number, number], [number, number]];

export type Position = 'top' | 'bottom' | 'left' | 'right';
export declare const Position: {
  readonly Top: 'top';
  readonly Bottom: 'bottom';
  readonly Left: 'left';
  readonly Right: 'right';
};

export type MarkerType = 'arrow' | 'arrowclosed';
export declare const MarkerType: {
  readonly Arrow: 'arrow';
  readonly ArrowClosed: 'arrowclosed';
};
export type HandleType = 'source' | 'target';
export type ConnectionMode = 'strict' | 'loose';
export type SelectionMode = 'full' | 'partial';
export type PanOnScrollMode = 'free' | 'horizontal' | 'vertical';
export type ColorMode = 'light' | 'dark' | 'system';
export type BackgroundVariant = 'lines' | 'dots' | 'cross';
export type PanelPosition =
  | 'top-left' | 'top-right' | 'top-center'
  | 'bottom-left' | 'bottom-right' | 'bottom-center';

// ─── Node Types ──────────────────────────────────────────────────

export interface NodeHandle {
  id?: string;
  type: HandleType;
  position?: Position;
  x?: number;
  y?: number;
}

export interface Node<T = Record<string, unknown>, TType extends string = string> {
  id: string;
  position: XYPosition;
  data: T;
  type?: TType;
  width?: number;
  height?: number;
  selected?: boolean;
  hidden?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  dragging?: boolean;
  handles?: NodeHandle[];
  parentId?: string;
  extent?: 'parent' | CoordinateExtent;
  expandParent?: boolean;
  zIndex?: number;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  measured?: { width?: number; height?: number };
}

// ─── Edge Types ──────────────────────────────────────────────────

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep';

export interface Edge<T = Record<string, unknown>, TType extends string = string> {
  id: string;
  source: string;
  target: string;
  type?: TType;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: T;
  label?: string;
  animated?: boolean;
  selected?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  selectable?: boolean;
  zIndex?: number;
  ariaLabel?: string;
  style?: React.CSSProperties;
  className?: string;
}

export interface Connection {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface DefaultEdgeOptions extends Partial<Omit<Edge, 'id' | 'source' | 'target'>> {}

// ─── Change Types ────────────────────────────────────────────────

export interface NodePositionChange {
  id: string;
  type: 'position';
  position?: XYPosition;
  dragging?: boolean;
}

export interface NodeSelectionChange {
  id: string;
  type: 'select';
  selected: boolean;
}

export interface NodeRemoveChange {
  id: string;
  type: 'remove';
}

export interface NodeAddChange<NodeType extends Node = Node> {
  type: 'add';
  item: NodeType;
  index?: number;
}

export interface NodeReplaceChange<NodeType extends Node = Node> {
  id: string;
  type: 'replace';
  item: NodeType;
}

export interface NodeDimensionChange {
  id: string;
  type: 'dimensions';
  dimensions?: Dimensions;
  setAttributes?: boolean | 'width' | 'height';
  resizing?: boolean;
}

export type NodeChange<NodeType extends Node = Node> =
  | NodePositionChange
  | NodeSelectionChange
  | NodeRemoveChange
  | NodeAddChange<NodeType>
  | NodeReplaceChange<NodeType>
  | NodeDimensionChange;

export interface EdgeSelectionChange {
  id: string;
  type: 'select';
  selected: boolean;
}

export interface EdgeRemoveChange {
  id: string;
  type: 'remove';
}

export interface EdgeAddChange<EdgeType extends Edge = Edge> {
  type: 'add';
  item: EdgeType;
  index?: number;
}

export interface EdgeReplaceChange<EdgeType extends Edge = Edge> {
  id: string;
  type: 'replace';
  item: EdgeType;
}

export type EdgeChange<EdgeType extends Edge = Edge> =
  | EdgeSelectionChange
  | EdgeRemoveChange
  | EdgeAddChange<EdgeType>
  | EdgeReplaceChange<EdgeType>;

// ─── Callback Types ──────────────────────────────────────────────

export type OnNodesChange<NodeType extends Node = Node> = (changes: NodeChange<NodeType>[]) => void;
export type OnEdgesChange<EdgeType extends Edge = Edge> = (changes: EdgeChange<EdgeType>[]) => void;
export type OnConnect = (connection: Connection) => void;
export type OnConnectStart = (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string; handleId: string | null; handleType: HandleType }) => void;
export type OnConnectEnd = (event: MouseEvent | TouchEvent) => void;
export type IsValidConnection = (connection: Connection) => boolean;

export type NodeMouseHandler<NodeType extends Node = Node> = (event: React.MouseEvent, node: NodeType) => void;
export type EdgeMouseHandler<EdgeType extends Edge = Edge> = (event: React.MouseEvent, edge: EdgeType) => void;
export type OnNodeDrag<NodeType extends Node = Node> = (event: React.MouseEvent, node: NodeType, nodes: NodeType[]) => void;

export type OnSelectionChangeParams = { nodes: Node[]; edges: Edge[] };
export type OnSelectionChangeFunc = (params: OnSelectionChangeParams) => void;

export type OnMove = (event: MouseEvent | TouchEvent | null, viewport: Viewport) => void;
export type OnMoveStart = OnMove;
export type OnMoveEnd = OnMove;

export type OnDelete = (params: { nodes: Node[]; edges: Edge[] }) => void;
export type OnBeforeDelete = (params: { nodes: Node[]; edges: Edge[] }) => Promise<boolean>;
export type OnError = (id: string, message: string) => void;
export type OnInit = (instance: ReactFlowInstance) => void;

// ─── Viewport Types ──────────────────────────────────────────────

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface FitViewOptions {
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
  nodes?: { id: string }[];
  duration?: number;
}

// ─── HUD Types ───────────────────────────────────────────────────

export interface HudData {
  wx: number;
  wy: number;
  zoom: string;
  renderMs: string;
  fps: number;
  visible: number;
  nodeCount: number;
  visibleNodes: number;
  edgeCount: number;
}

// ─── Card Types (Legacy) ─────────────────────────────────────────

export interface Card {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  body: string;
}

// ─── Component Props ─────────────────────────────────────────────

export interface InfiniteCanvasProps {
  // Data
  cards?: Card[];
  nodes?: Node[];
  edges?: Edge[];

  // Custom types
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;

  // Appearance
  dark?: boolean;
  colorMode?: ColorMode;
  gridSize?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;

  // Zoom
  zoomMin?: number;
  zoomMax?: number;

  // Camera
  initialCamera?: Viewport;
  fitView?: boolean;
  fitViewOptions?: FitViewOptions;

  // Node/Edge callbacks
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  onConnectStart?: OnConnectStart;
  onConnectEnd?: OnConnectEnd;
  onNodeClick?: NodeMouseHandler;
  onNodeDoubleClick?: NodeMouseHandler;
  onNodeMouseEnter?: NodeMouseHandler;
  onNodeMouseMove?: NodeMouseHandler;
  onNodeMouseLeave?: NodeMouseHandler;
  onNodeContextMenu?: NodeMouseHandler;
  onNodeDragStart?: OnNodeDrag;
  onNodeDrag?: OnNodeDrag;
  onNodeDragStop?: OnNodeDrag;
  onEdgeClick?: EdgeMouseHandler;
  onEdgeDoubleClick?: EdgeMouseHandler;
  onEdgeMouseEnter?: EdgeMouseHandler;
  onEdgeMouseMove?: EdgeMouseHandler;
  onEdgeMouseLeave?: EdgeMouseHandler;
  onEdgeContextMenu?: EdgeMouseHandler;
  onPaneClick?: (event: React.MouseEvent) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onPaneMouseEnter?: (event: React.MouseEvent) => void;
  onPaneMouseMove?: (event: React.MouseEvent) => void;
  onPaneMouseLeave?: (event: React.MouseEvent) => void;
  onSelectionChange?: OnSelectionChangeFunc;
  onInit?: OnInit;
  onMoveStart?: OnMoveStart;
  onMove?: OnMove;
  onMoveEnd?: OnMoveEnd;
  onDelete?: OnDelete;
  onBeforeDelete?: OnBeforeDelete;
  onError?: OnError;

  // Behavior
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  elementsSelectable?: boolean;
  multiSelectionKeyCode?: string;
  selectionOnDrag?: boolean;
  selectionMode?: SelectionMode;
  connectOnClick?: boolean;
  connectionMode?: ConnectionMode;
  connectionRadius?: number;
  isValidConnection?: IsValidConnection;
  snapToGrid?: boolean;
  snapGrid?: SnapGrid;
  deleteKeyCode?: string | string[];
  panActivationKeyCode?: string;
  panOnScroll?: boolean;
  panOnScrollMode?: PanOnScrollMode;
  panOnScrollSpeed?: number;
  zoomOnScroll?: boolean;
  zoomOnPinch?: boolean;
  zoomOnDoubleClick?: boolean;
  preventScrolling?: boolean;
  translateExtent?: CoordinateExtent;
  nodeExtent?: CoordinateExtent;
  defaultEdgeOptions?: DefaultEdgeOptions;
  autoPanOnNodeDrag?: boolean;
  autoPanOnConnect?: boolean;
  autoPanSpeed?: number;
  edgesReconnectable?: boolean;
  elevateNodesOnSelect?: boolean;
  elevateEdgesOnSelect?: boolean;

  // DOM event passthrough
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;

  // React Flow compatibility
  proOptions?: ProOptions;
  nodeOrigin?: NodeOrigin;
  defaultViewport?: Viewport;
  selectNodesOnDrag?: boolean;
  onSelectionDragStart?: SelectionDragHandler;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onNodeDragStart?: OnNodeDrag;

  // Legacy
  onHudUpdate?: (data: HudData) => void;
  showHud?: boolean;
  showHint?: boolean;
  hintText?: string;

  // Children
  children?: React.ReactNode;

  // Allow additional props
  [key: string]: any;
}

export interface ControlsProps {
  showZoom?: boolean;
  showFitView?: boolean;
  showInteractive?: boolean;
  position?: PanelPosition;
  style?: React.CSSProperties;
  className?: string;
}

export interface MiniMapProps {
  width?: number;
  height?: number;
  nodeColor?: string | ((node: Node) => string);
  nodeStrokeColor?: string;
  maskColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

export interface BackgroundProps {
  variant?: BackgroundVariant;
  gap?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

export interface PanelProps {
  position?: PanelPosition;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

// ─── Hook Return Types ───────────────────────────────────────────

export interface ViewportAnimationOptions {
  duration?: number;
}

export interface ReactFlowInstance {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  getNode: (id: string) => Node | undefined;
  getEdge: (id: string) => Edge | undefined;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  addNodes: (nodes: Node | Node[]) => void;
  addEdges: (edges: Edge | Edge[]) => void;
  deleteElements: (params: { nodes?: Node[]; edges?: Edge[] }) => void;
  getViewport: () => Viewport;
  setViewport: (viewport: Partial<Viewport>, options?: ViewportAnimationOptions) => void;
  getZoom: () => number;
  zoomIn: (options?: ViewportAnimationOptions) => void;
  zoomOut: (options?: ViewportAnimationOptions) => void;
  zoomTo: (zoom: number, options?: ViewportAnimationOptions) => void;
  fitView: (options?: FitViewOptions) => void;
  fitBounds: (bounds: Rect, options?: FitViewOptions) => void;
  setCenter: (x: number, y: number, options?: { zoom?: number; duration?: number }) => void;
  screenToFlowPosition: (position: XYPosition) => XYPosition;
  flowToScreenPosition: (position: XYPosition) => XYPosition;
  updateNodeData: (nodeId: string, dataUpdate: Partial<Node['data']> | ((node: Node) => Partial<Node['data']>)) => void;
  toObject: () => { nodes: Node[]; edges: Edge[]; viewport: Viewport };
}

export interface UseOnViewportChangeOptions {
  onChange?: (viewport: Viewport) => void;
  onStart?: (viewport: Viewport) => void;
  onEnd?: (viewport: Viewport) => void;
}

export interface UseOnSelectionChangeOptions {
  onChange: OnSelectionChangeFunc;
}

export interface UseHandleConnectionsOptions {
  nodeId?: string;
  type: HandleType;
  handleId?: string;
}

// ─── Function Declarations ───────────────────────────────────────

// Core
export declare function InfiniteCanvas(props: InfiniteCanvasProps): JSX.Element;
export declare function InfiniteCanvasProvider(props: { children: React.ReactNode; initialNodes?: Node[]; initialEdges?: Edge[] }): JSX.Element;
export declare function useInfiniteCanvas(options?: Partial<InfiniteCanvasProps>): {
  wrapRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  resetView: () => void;
  addCard: (card?: Card) => void;
  addNode: (node: Partial<Node>) => void;
  getCamera: () => Viewport;
  setCamera: (camera: Partial<Viewport>) => void;
  screenToFlowPosition: (position: XYPosition) => XYPosition;
  store: any;
};

// Hooks
export declare function useNodesState<NodeType extends Node = Node>(
  initialNodes: NodeType[]
): [NodeType[], React.Dispatch<React.SetStateAction<NodeType[]>>, OnNodesChange<NodeType>];

export declare function useEdgesState<EdgeType extends Edge = Edge>(
  initialEdges: EdgeType[]
): [EdgeType[], React.Dispatch<React.SetStateAction<EdgeType[]>>, OnEdgesChange<EdgeType>];

export declare function useReactFlow(): ReactFlowInstance;
export declare function useNodes<NodeType extends Node = Node>(): NodeType[];
export declare function useEdges<EdgeType extends Edge = Edge>(): EdgeType[];
export declare function useViewport(): Viewport;
export declare function useConnection(): Connection | null;
export declare function useNodesData(nodeIds: string | string[]): { id: string; type?: string; data: any }[];
export declare function useNodeConnections(nodeId: string): Edge[];
export declare function useHandleConnections(options: UseHandleConnectionsOptions): Edge[];
export declare function useOnViewportChange(options: UseOnViewportChangeOptions): void;
export declare function useOnSelectionChange(options: UseOnSelectionChangeOptions): void;
export declare function useKeyPress(keyOrKeys: string | string[]): boolean;
export declare function useUpdateNodeInternals(): (nodeId: string | string[]) => void;
export declare function useNodesInitialized(options?: { includeHiddenNodes?: boolean }): boolean;
export declare function useInternalNode(nodeId: string): Node | undefined;
export declare function useStore<T>(selector: (state: InfiniteCanvasState) => T): T;
export declare function useStoreApi(): { getState: () => InfiniteCanvasState; setState: (partial: Partial<InfiniteCanvasState>) => void; subscribe: (listener: (state: InfiniteCanvasState) => void) => () => void };

// Undo/Redo
export interface UseUndoRedoOptions {
  maxHistorySize?: number;
}
export interface UseUndoRedoReturn {
  undo: () => void;
  redo: () => void;
  takeSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
export declare function useUndoRedo(options?: UseUndoRedoOptions): UseUndoRedoReturn;

// Change middleware
export declare function useOnNodesChangeMiddleware<NodeType extends Node = Node>(
  middleware: (changes: NodeChange<NodeType>[]) => NodeChange<NodeType>[] | false | void
): (originalOnNodesChange: OnNodesChange<NodeType>) => OnNodesChange<NodeType>;

export declare function useOnEdgesChangeMiddleware<EdgeType extends Edge = Edge>(
  middleware: (changes: EdgeChange<EdgeType>[]) => EdgeChange<EdgeType>[] | false | void
): (originalOnEdgesChange: OnEdgesChange<EdgeType>) => OnEdgesChange<EdgeType>;

// Utilities
export declare function applyNodeChanges<NodeType extends Node = Node>(changes: NodeChange<NodeType>[], nodes: NodeType[]): NodeType[];
export declare function applyEdgeChanges<EdgeType extends Edge = Edge>(changes: EdgeChange<EdgeType>[], edges: EdgeType[]): EdgeType[];
export declare function addEdge<EdgeType extends Edge = Edge>(edgeParams: EdgeType | Connection, edges: EdgeType[]): EdgeType[];
export declare function isNode(element: any): element is Node;
export declare function isEdge(element: any): element is Edge;
export declare function getConnectedEdges(nodesOrId: Node[] | Node | string, edges: Edge[]): Edge[];
export declare function getIncomers(nodeOrId: Node | string, nodes: Node[], edges: Edge[]): Node[];
export declare function getOutgoers(nodeOrId: Node | string, nodes: Node[], edges: Edge[]): Node[];
export declare function getNodesBounds(nodes: Node[]): Rect;
export declare function getViewportForBounds(bounds: Rect, width: number, height: number, padding?: number): Viewport;
export declare function snapPosition(position: XYPosition, snapGrid: SnapGrid): XYPosition;
export declare function clampPosition(position: XYPosition, extent: CoordinateExtent): XYPosition;
export declare function getNodeDimensions(node: Node): Dimensions;
export declare function getNodesInside(nodes: Node[], rect: Rect, viewport: Viewport, partially?: boolean): Node[];

// Components
export declare function Controls(props: ControlsProps): JSX.Element;
export declare function MiniMap(props: MiniMapProps): JSX.Element;
export declare function Background(props: BackgroundProps): JSX.Element;
export declare function Panel(props: PanelProps): JSX.Element;
export declare function Handle(props: HandleProps): JSX.Element;
export declare function NodeResizer(props: NodeResizerProps): JSX.Element;
export declare function NodeToolbar(props: NodeToolbarProps): JSX.Element;
export declare function EdgeToolbar(props: { children?: React.ReactNode; style?: React.CSSProperties; className?: string }): JSX.Element;
export declare function EdgeLabelRenderer(props: { children?: React.ReactNode }): JSX.Element;
export declare function ViewportPortal(props: { children?: React.ReactNode }): JSX.Element;
export declare function ConnectionLine(props: ConnectionLineComponentProps): JSX.Element;
export declare function SelectionBox(props: { selectionKeyCode?: string; selectionMode?: SelectionMode }): JSX.Element;

// ─── React Flow Compatibility Types ─────────────────────────────

export interface Box {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

export declare function nodeToBox(node: Node): Box;

export interface InternalNode<NodeType extends Node = Node> extends NodeType {
  _absolutePosition: XYPosition;
  measured?: { width?: number; height?: number };
}

export type BuiltInNode = Node;

export interface NodeProps<NodeType extends Node = Node> {
  id: string;
  data: NodeType['data'];
  type: string;
  selected: boolean;
  dragging: boolean;
  width?: number;
  height?: number;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
  zIndex: number;
  isConnectable: boolean;
  sourcePosition?: Position;
  targetPosition?: Position;
  dragHandle?: string;
}

export interface EdgeProps<EdgeType extends Edge = Edge> {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  selected?: boolean;
  animated?: boolean;
  data?: EdgeType['data'];
  label?: string;
  type?: string;
  sourceHandleId?: string | null;
  targetHandleId?: string | null;
  sourcePosition: Position;
  targetPosition: Position;
  style?: React.CSSProperties;
  markerStart?: string;
  markerEnd?: string;
}

export interface HandleProps {
  type: HandleType;
  position: Position;
  id?: string;
  isConnectable?: boolean;
  isConnectableStart?: boolean;
  isConnectableEnd?: boolean;
  onConnect?: (connection: Connection) => void;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export interface NodeResizerProps {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  keepAspectRatio?: boolean;
  shouldResize?: (event: any) => boolean;
  onResizeStart?: (event: any, params: { width: number; height: number }) => void;
  onResize?: (event: any, params: { width: number; height: number }) => void;
  onResizeEnd?: (event: any, params: { width: number; height: number }) => void;
  color?: string;
  handleStyle?: React.CSSProperties;
  lineStyle?: React.CSSProperties;
  isVisible?: boolean;
}

export interface NodeToolbarProps {
  nodeId?: string | string[];
  isVisible?: boolean;
  position?: Position;
  offset?: number;
  align?: 'center' | 'start' | 'end';
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export interface ConnectionLineComponentProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromPosition: Position;
  toPosition: Position;
  fromNode?: Node;
  toNode?: Node;
  connectionLineType?: string;
  connectionLineStyle?: React.CSSProperties;
}

export interface MiniMapNodeProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  color?: string;
  style?: React.CSSProperties;
}

export type NodeTypes = Record<string, React.ComponentType<NodeProps<any>>>;
export type EdgeTypes = Record<string, React.ComponentType<EdgeProps<any>>>;

export type InfiniteCanvasInstance = ReactFlowInstance;
export type InfiniteCanvasState = {
  nodes: Node[];
  edges: Edge[];
  domNode: HTMLDivElement | null;
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
  [key: string]: unknown;
};

export type NodeOrigin = [number, number];

export interface ProOptions {
  account?: string;
  hideAttribution?: boolean;
}

export type SelectionDragHandler = (event: React.MouseEvent, nodes: Node[]) => void;
export type OnNodesDelete = (nodes: Node[]) => void;
export type OnEdgesDelete = (edges: Edge[]) => void;

export type useShallow = <T>(selector: (state: any) => T) => T;
