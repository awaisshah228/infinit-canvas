/*
 * libavoid-js - JavaScript port of libavoid
 * Original C++ library: Copyright (C) 2004-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

// Dimensions
export const XDIM = 0 as const;
export const YDIM = 1 as const;

// Vertex number constants
export const kUnassignedVertexNumber = 8 as const;
export const kShapeConnectionPin = 9 as const;

// VertID source/target
export const VertID_src = 0 as const;
export const VertID_tar = 1 as const;

// VertID property flags
export const PROP_ConnPoint = 1 as const;
export const PROP_OrthShapeEdge = 2 as const;
export const PROP_ConnectionPin = 4 as const;
export const PROP_ConnCheckpoint = 8 as const;
export const PROP_DummyPinHelper = 16 as const;

// Connection direction flags
export const ConnDirNone = 0 as const;
export const ConnDirUp = 1 as const;
export const ConnDirDown = 2 as const;
export const ConnDirLeft = 4 as const;
export const ConnDirRight = 8 as const;
export const ConnDirAll = 15 as const;

// Connection end types
export const ConnEndPoint = 0 as const;
export const ConnEndShapePin = 1 as const;
export const ConnEndJunction = 2 as const;
export const ConnEndEmpty = 3 as const;

// Connector types
export const ConnType_None = 0 as const;
export const ConnType_PolyLine = 1 as const;
export const ConnType_Orthogonal = 2 as const;

// Router flags
export const PolyLineRouting = 1 as const;
export const OrthogonalRouting = 2 as const;

// Routing parameters
export const segmentPenalty = 0 as const;
export const anglePenalty = 1 as const;
export const crossingPenalty = 2 as const;
export const clusterCrossingPenalty = 3 as const;
export const fixedSharedPathPenalty = 4 as const;
export const portDirectionPenalty = 5 as const;
export const shapeBufferDistance = 6 as const;
export const idealNudgingDistance = 7 as const;
export const reverseDirectionPenalty = 8 as const;
export const lastRoutingParameterMarker = 9 as const;

// Routing options
export const nudgeOrthogonalSegmentsConnectedToShapes = 0 as const;
export const improveHyperedgeRoutesMovingJunctions = 1 as const;
export const penaliseOrthogonalSharedPathsAtConnEnds = 2 as const;
export const nudgeOrthogonalTouchingColinearSegments = 3 as const;
export const performUnifyingNudgingPreprocessingStep = 4 as const;
export const improveHyperedgeRoutesMovingAddingAndDeletingJunctions = 5 as const;
export const nudgeSharedPathsWithCommonEndPoint = 6 as const;
export const lastRoutingOptionMarker = 7 as const;

// Action types
export const ShapeMove = 0 as const;
export const ShapeAdd = 1 as const;
export const ShapeRemove = 2 as const;
export const JunctionMove = 3 as const;
export const JunctionAdd = 4 as const;
export const JunctionRemove = 5 as const;
export const ConnChange = 6 as const;
export const ConnectionPinChange = 7 as const;

// Segment intersection result codes
export const DONT_INTERSECT = 0 as const;
export const DO_INTERSECT = 1 as const;
export const PARALLEL = 3 as const;

// Transaction phases
export const TransactionPhaseRouteSearch = 0 as const;
export const TransactionPhaseOrthogonalNudgingX = 1 as const;
export const TransactionPhaseOrthogonalNudgingY = 2 as const;
export const TransactionPhaseCompleted = 3 as const;

// Orthogonal visibility property flags
export const XL_EDGE = 1 as const;
export const XL_CONN = 2 as const;
export const XH_EDGE = 4 as const;
export const XH_CONN = 8 as const;
export const YL_EDGE = 16 as const;
export const YL_CONN = 32 as const;
export const YH_EDGE = 64 as const;
export const YH_CONN = 128 as const;

// Connection attachment
export const runningTo = 1 as const;
export const runningFrom = 2 as const;

// Shape transformation types
export const TransformationType_CW90 = 0 as const;
export const TransformationType_CW180 = 1 as const;
export const TransformationType_CW270 = 2 as const;
export const TransformationType_FlipX = 3 as const;
export const TransformationType_FlipY = 4 as const;

// Crossing flags
export const CROSSING_NONE = 0 as const;
export const CROSSING_SHARES_PATH = 1 as const;
export const CROSSING_SHARES_FIXED_SEGMENT = 2 as const;
export const CROSSING_SHARES_PATH_AT_END = 4 as const;
export const CROSSING_TOUCHES = 8 as const;

// Sweep direction constants
export const AHEAD = 1 as const;
export const BEHIND = -1 as const;

// Scanline event types
export const Open = 0 as const;
export const SegOpen = 1 as const;
export const ConnPoint = 2 as const;
export const SegClose = 3 as const;
export const Close = 4 as const;

// Channel max
export const CHANNEL_MAX: number = 100000000;

// ATTACH_POS constants for ShapeConnectionPin
export const ATTACH_POS_TOP = 0 as const;
export const ATTACH_POS_LEFT = 0 as const;
export const ATTACH_POS_CENTRE = 0.5 as const;
export const ATTACH_POS_BOTTOM = 1 as const;
export const ATTACH_POS_RIGHT = 1 as const;

// Cost direction bitflags (for A* search)
export const CostDirectionN = 1 as const;
export const CostDirectionE = 2 as const;
export const CostDirectionS = 4 as const;
export const CostDirectionW = 8 as const;
