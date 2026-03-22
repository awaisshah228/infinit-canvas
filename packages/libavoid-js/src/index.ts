/*
 * libavoid-js - JavaScript port of libavoid
 * Fast, Incremental, Object-avoiding Line Router
 *
 * Original C++ library: Copyright (C) 2004-2015 Monash University
 * Original author: Michael Wybrow
 * Licensed under LGPL 2.1
 */

// === Core ===
export {
  XDIM, YDIM,
  kUnassignedVertexNumber, kShapeConnectionPin,
  VertID_src, VertID_tar,
  PROP_ConnPoint, PROP_OrthShapeEdge, PROP_ConnectionPin,
  PROP_ConnCheckpoint, PROP_DummyPinHelper,
  ConnDirNone, ConnDirUp, ConnDirDown, ConnDirLeft, ConnDirRight, ConnDirAll,
  ConnEndPoint, ConnEndShapePin, ConnEndJunction, ConnEndEmpty,
  ConnType_PolyLine, ConnType_Orthogonal,
  PolyLineRouting, OrthogonalRouting,
  segmentPenalty, anglePenalty, crossingPenalty,
  clusterCrossingPenalty, fixedSharedPathPenalty,
  portDirectionPenalty, shapeBufferDistance,
  idealNudgingDistance, reverseDirectionPenalty,
  nudgeOrthogonalSegmentsConnectedToShapes,
  improveHyperedgeRoutesMovingJunctions,
  penaliseOrthogonalSharedPathsAtConnEnds,
  nudgeOrthogonalTouchingColinearSegments,
  performUnifyingNudgingPreprocessingStep,
  improveHyperedgeRoutesMovingAddingAndDeletingJunctions,
  nudgeSharedPathsWithCommonEndPoint,
  TransactionPhaseRouteSearch, TransactionPhaseOrthogonalNudgingX,
  TransactionPhaseOrthogonalNudgingY, TransactionPhaseCompleted,
  TransformationType_CW90, TransformationType_CW180, TransformationType_CW270,
  TransformationType_FlipX, TransformationType_FlipY,
  ATTACH_POS_TOP, ATTACH_POS_LEFT, ATTACH_POS_CENTRE,
  ATTACH_POS_BOTTOM, ATTACH_POS_RIGHT,
} from './core/constants';

export { Point, Box, Edge, Polygon, Rectangle, ReferencingPolygon } from './core/geomtypes';
export type { PolygonInterface } from './core/geomtypes';

export {
  vecDir, projection, euclideanDist, manhattanDist, totalLength, angle,
  inBetween, colinear, pointOnLine, segmentIntersect, segmentShapeIntersect,
  inValidRegion, cornerSide, inPoly, inPolyGen,
  segmentIntersectPoint, rayIntersectPoint, rotationalAngle,
} from './core/geometry';

// === Graph ===
export { VertID, VertInf, VertInfList } from './graph/vertices';
export { EdgeInf, EdgeList } from './graph/graph';
export { vertexVisibility } from './graph/visibility';

// === Obstacles ===
export { Obstacle } from './obstacles/obstacle';
export { ShapeRef } from './obstacles/shape';
export { ClusterRef } from './obstacles/viscluster';

// === Connectors ===
export { ConnEnd } from './connectors/connend';
export { ShapeConnectionPin } from './connectors/connectionpin';
export { ConnRef, Checkpoint, ConnectorCrossings } from './connectors/connector';

// === Routing ===
export { AStarPath } from './routing/makepath';
export { ShiftSegment } from './routing/scanline';
export { generateStaticOrthogonalVisGraph, improveOrthogonalRoutes } from './routing/orthogonal';

// === Hyperedge ===
export { JunctionRef } from './hyperedge/junction';
export { HyperedgeRerouter } from './hyperedge/hyperedge';
export { HyperedgeTreeNode, HyperedgeTreeEdge } from './hyperedge/hyperedgetree';
export { HyperedgeImprover } from './hyperedge/hyperedgeimprover';

// === Solver ===
export { Variable, Constraint, IncSolver } from './solver/vpsc';
export { MinimumTerminalSpanningTree } from './solver/mtst';

// === Router (main entry point) ===
export { ActionInfo } from './actioninfo';
export type { ActionType, ActionObject, ConnEndUpdate } from './actioninfo';

export { Router, ConnRerouteFlagDelegate, TopologyAddonInterface } from './router';
