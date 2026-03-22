/*
 * libavoid-js - JavaScript port of libavoid makepath
 * Original C++ library: Copyright (C) 2004-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 *
 * Core A* pathfinding algorithm for connector routing.
 */

import {
  ConnType_Orthogonal,
  ConnType_PolyLine,
  anglePenalty,
  segmentPenalty,
  clusterCrossingPenalty,
  crossingPenalty,
  fixedSharedPathPenalty,
  reverseDirectionPenalty,
  penaliseOrthogonalSharedPathsAtConnEnds,
  CostDirectionN,
  CostDirectionE,
  CostDirectionS,
  CostDirectionW,
  XDIM,
  YDIM,
  XL_EDGE,
  XH_EDGE,
  YL_EDGE,
  YH_EDGE,
  CROSSING_SHARES_PATH,
  CROSSING_SHARES_FIXED_SEGMENT,
  CROSSING_SHARES_PATH_AT_END,
  PROP_ConnPoint,
} from '../core/constants';

import { Point, Polygon } from '../core/geomtypes';
import { vecDir, euclideanDist, manhattanDist } from '../core/geometry';
import { ConnectorCrossings } from '../connectors/connector';

// ---------------------------------------------------------------------------
// Local interfaces to avoid circular dependency imports.
// These describe only the subset of methods/fields used in this module.
// ---------------------------------------------------------------------------

interface IVertID {
  objID: number;
  vn: number;
  props: number;
  isConnPt(): boolean;
  isConnectionPin(): boolean;
  isConnCheckpoint(): boolean;
  isDummyPinHelper(): boolean;
}

interface IEdgeInf {
  otherVert(v: IVertInf): IVertInf;
  isOrthogonal(): boolean;
  isDisabled(): boolean;
  isDummyConnection(): boolean;
  getDist(): number;
  rotationLessThan(lastV: IVertInf | null, rhs: IEdgeInf): boolean;
}

interface IVertInf {
  _router: IRouter;
  id: IVertID;
  point: Point;
  visList: IEdgeInf[];
  orthogVisList: IEdgeInf[];
  pathNext: IVertInf | null;
  aStarDoneNodes: ANode[];
  aStarPendingNodes: ANode[];
  orthogVisPropFlags: number;
  lstNext: IVertInf | null;
  hasNeighbour(target: IVertInf, orthogonal: boolean): IEdgeInf | null;
}

interface IVertInfList {
  connsBegin(): IVertInf;
  end(): IVertInf;
  getVertexByID(vid: { objId: number; vn: number; props: number }): IVertInf;
  addVertex(v: IVertInf): void;
}

interface IClusterRef {
  rectangularPolygon(): Polygon;
  polygon(): Polygon;
}

interface IConnRef {
  id(): number;
  routingType(): number;
  src(): IVertInf;
  dst(): IVertInf;
  router(): IRouter;
  route(): Polygon;
  displayRoute(): Polygon;
  possibleDstPinPoints(): Point[];
}

interface IRouter {
  routingParameter(param: number): number;
  routingOption(option: number): boolean;
  isInCrossingPenaltyReroutingStage(): boolean;
  ClusteredRouting: boolean;
  RubberBandRouting: boolean;
  clusterRefs: IClusterRef[];
  connRefs: IConnRef[];
  vertices: IVertInfList;
}

// Forward-declare validateBendPoint (may or may not exist at runtime).
declare function validateBendPoint(
  a: IVertInf | null,
  b: IVertInf,
  c: IVertInf
): boolean;

// ---------------------------------------------------------------------------
// ANode: A* search node
// ---------------------------------------------------------------------------

class ANode {
  inf: IVertInf | null;
  g: number;
  h: number;
  f: number;
  prevNode: ANode | null;
  timeStamp: number;

  constructor(vinf: IVertInf | null = null, time: number = -1) {
    this.inf = vinf;
    this.g = 0;
    this.h = 0;
    this.f = 0;
    this.prevNode = null;
    this.timeStamp = time;
  }

  copyFrom(other: ANode): void {
    this.inf = other.inf;
    this.g = other.g;
    this.h = other.h;
    this.f = other.f;
    this.prevNode = other.prevNode;
    this.timeStamp = other.timeStamp;
  }
}

// ---------------------------------------------------------------------------
// aNodeCmpLess: comparator for the priority queue (min-heap by f value)
// ---------------------------------------------------------------------------
// Returns true if a should come BEFORE b in the heap (i.e., a has lower cost).
// This gives us a min-heap where the lowest f is at the top.

function aNodeCmpLess(a: ANode, b: ANode): boolean {
  if (Math.abs(a.f - b.f) > 0.0000001) {
    return a.f < b.f;
  }
  if (a.timeStamp !== b.timeStamp) {
    return a.timeStamp > b.timeStamp;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Simple binary min-heap priority queue
// ---------------------------------------------------------------------------

class MinHeap {
  _data: ANode[];

  constructor() {
    this._data = [];
  }

  get length(): number {
    return this._data.length;
  }

  empty(): boolean {
    return this._data.length === 0;
  }

  push(node: ANode): void {
    this._data.push(node);
    this._bubbleUp(this._data.length - 1);
  }

  pop(): ANode {
    const data: ANode[] = this._data;
    const top: ANode = data[0];
    const last: ANode | undefined = data.pop();
    if (data.length > 0 && last !== undefined) {
      data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  front(): ANode {
    return this._data[0];
  }

  rebuild(): void {
    const data: ANode[] = this._data;
    const n: number = data.length;
    for (let i: number = (n >> 1) - 1; i >= 0; i--) {
      this._sinkDown(i);
    }
  }

  _bubbleUp(i: number): void {
    const data: ANode[] = this._data;
    while (i > 0) {
      const parent: number = (i - 1) >> 1;
      if (aNodeCmpLess(data[i], data[parent])) {
        const tmp: ANode = data[i];
        data[i] = data[parent];
        data[parent] = tmp;
        i = parent;
      } else {
        break;
      }
    }
  }

  _sinkDown(i: number): void {
    const data: ANode[] = this._data;
    const n: number = data.length;
    while (true) {
      let smallest: number = i;
      const left: number = 2 * i + 1;
      const right: number = 2 * i + 2;
      if (left < n && aNodeCmpLess(data[left], data[smallest])) {
        smallest = left;
      }
      if (right < n && aNodeCmpLess(data[right], data[smallest])) {
        smallest = right;
      }
      if (smallest !== i) {
        const tmp: ANode = data[i];
        data[i] = data[smallest];
        data[smallest] = tmp;
        i = smallest;
      } else {
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helper math
// ---------------------------------------------------------------------------

function dot(l: Point, r: Point): number {
  return (l.x * r.x) + (l.y * r.y);
}

function crossLength(l: Point, r: Point): number {
  return (l.x * r.y) - (l.y * r.x);
}

function angleBetween(p1: Point, p2: Point, p3: Point): number {
  if ((p1.x === p2.x && p1.y === p2.y) ||
      (p2.x === p3.x && p2.y === p3.y)) {
    return Math.PI;
  }

  const v1: Point = new Point(p1.x - p2.x, p1.y - p2.y);
  const v2: Point = new Point(p3.x - p2.x, p3.y - p2.y);

  return Math.abs(Math.atan2(crossLength(v1, v2), dot(v1, v2)));
}

// ---------------------------------------------------------------------------
// constructPolygonPath
// ---------------------------------------------------------------------------
// Construct a temporary Polygon path given several VertInf's for a connector.

function constructPolygonPath(
  connRoute: Polygon,
  inf2: IVertInf,
  inf3: IVertInf,
  inf1Node: ANode | null
): void {
  const simplified: boolean = true;

  let routeSize: number = 2;
  for (let curr: ANode | null = inf1Node; curr !== null; curr = curr.prevNode) {
    routeSize += 1;
  }

  connRoute.ps = new Array<Point>(routeSize);
  const arraySize: number = routeSize;
  connRoute.ps[routeSize - 1] = inf3.point;
  connRoute.ps[routeSize - 2] = inf2.point;
  routeSize -= 3;

  for (let curr: ANode | null = inf1Node; curr !== null; curr = curr.prevNode) {
    const isConnectionPin: boolean = curr.inf!.id.isConnectionPin();

    if (!simplified) {
      connRoute.ps[routeSize] = curr.inf!.point;
      routeSize -= 1;

      if (isConnectionPin) {
        break;
      }
      continue;
    }

    if ((curr === inf1Node) ||
        vecDir(curr.inf!.point, connRoute.ps[routeSize + 1],
               connRoute.ps[routeSize + 2]) !== 0) {
      connRoute.ps[routeSize] = curr.inf!.point;
      routeSize -= 1;
    } else {
      connRoute.ps[routeSize + 1] = curr.inf!.point;
    }

    if (isConnectionPin) {
      break;
    }
  }

  const diff: number = routeSize + 1;
  if (diff > 0) {
    for (let i: number = diff; i < arraySize; ++i) {
      connRoute.ps[i - diff] = connRoute.ps[i];
    }
    connRoute.ps.length = connRoute.size() - diff;
  }
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

function dimDirection(difference: number): number {
  if (difference > 0) return 1;
  if (difference < 0) return -1;
  return 0;
}

function orthogonalDirectionsCount(directions: number): number {
  let count: number = 0;
  if (directions & CostDirectionN) ++count;
  if (directions & CostDirectionE) ++count;
  if (directions & CostDirectionS) ++count;
  if (directions & CostDirectionW) ++count;
  return count;
}

function orthogonalDirection(a: Point, b: Point): number {
  let result: number = 0;
  if (b.y > a.y) result |= CostDirectionS;
  else if (b.y < a.y) result |= CostDirectionN;
  if (b.x > a.x) result |= CostDirectionE;
  else if (b.x < a.x) result |= CostDirectionW;
  return result;
}

function dirRight(direction: number): number {
  if (direction === CostDirectionN) return CostDirectionE;
  if (direction === CostDirectionE) return CostDirectionS;
  if (direction === CostDirectionS) return CostDirectionW;
  if (direction === CostDirectionW) return CostDirectionN;
  return direction;
}

function dirLeft(direction: number): number {
  if (direction === CostDirectionN) return CostDirectionW;
  if (direction === CostDirectionE) return CostDirectionN;
  if (direction === CostDirectionS) return CostDirectionE;
  if (direction === CostDirectionW) return CostDirectionS;
  return direction;
}

function dirReverse(direction: number): number {
  if (direction === CostDirectionN) return CostDirectionS;
  if (direction === CostDirectionE) return CostDirectionW;
  if (direction === CostDirectionS) return CostDirectionN;
  if (direction === CostDirectionW) return CostDirectionE;
  return direction;
}

// ---------------------------------------------------------------------------
// bends()
// ---------------------------------------------------------------------------
// Given Point curr with direction currDir, returns the minimum number of
// bends to reach Point dest with entry direction destDir.

function bends(curr: Point, currDir: number, dest: Point, destDir: number): number {
  const currToDestDir: number = orthogonalDirection(curr, dest);
  const reverseDestDir: number = dirReverse(destDir);
  const currDirPerpendicularToDestDir: boolean =
    (currDir === dirLeft(destDir)) || (currDir === dirRight(destDir));

  if ((currDir === destDir) && (currToDestDir === currDir)) {
    return 0;
  }
  else if (currDirPerpendicularToDestDir &&
           (currToDestDir === (destDir | currDir))) {
    return 1;
  }
  else if (currDirPerpendicularToDestDir &&
           (currToDestDir === currDir)) {
    return 1;
  }
  else if (currDirPerpendicularToDestDir &&
           (currToDestDir === destDir)) {
    return 1;
  }
  else if ((currDir === destDir) &&
           (currToDestDir !== currDir) &&
           !(currToDestDir & reverseDestDir)) {
    return 2;
  }
  else if ((currDir === reverseDestDir) &&
           (currToDestDir !== destDir) &&
           (currToDestDir !== currDir)) {
    return 2;
  }
  else if (currDirPerpendicularToDestDir &&
           (currToDestDir !== (destDir | currDir)) &&
           (currToDestDir !== currDir)) {
    return 3;
  }
  else if ((currDir === reverseDestDir) &&
           ((currToDestDir === destDir) || (currToDestDir === currDir))) {
    return 4;
  }
  else if ((currDir === destDir) &&
           (currToDestDir & reverseDestDir)) {
    return 4;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// cost()
// ---------------------------------------------------------------------------
// Given the two points for a new segment of a path (inf2 & inf3) as well as
// the distance between them (dist), and possibly the previous point (inf1)
// [from inf1--inf2], return a cost associated with this route.

function cost(
  lineRef: IConnRef,
  dist: number,
  inf2: IVertInf,
  inf3: IVertInf,
  inf1Node: ANode | null
): number {
  const isOrthogonal: boolean = (lineRef.routingType() === ConnType_Orthogonal);
  const inf1: IVertInf | null = inf1Node ? inf1Node.inf : null;
  let result: number = dist;
  let connRoute: Polygon = new Polygon();

  const router: IRouter = inf2._router;
  if (inf1 !== null) {
    const angle_penalty: number = router.routingParameter(anglePenalty);
    const segmt_penalty: number = router.routingParameter(segmentPenalty);

    if ((angle_penalty > 0) || (segmt_penalty > 0)) {
      const p1: Point = inf1.point;
      const p2: Point = inf2.point;
      const p3: Point = inf3.point;

      const rad: number = Math.PI - angleBetween(p1, p2, p3);

      if ((rad > 0) && !isOrthogonal) {
        const xval: number = rad * 10 / Math.PI;
        const yval: number = xval * Math.log10(xval + 1) / 10.5;
        result += (angle_penalty * yval);
      }

      if (rad === Math.PI) {
        result += (2 * segmt_penalty);
      } else if (rad > 0) {
        result += segmt_penalty;
      }
    }
  }

  const cluster_crossing_penalty: number =
    router.routingParameter(clusterCrossingPenalty);
  if (router.ClusteredRouting && router.clusterRefs.length > 0 &&
      (cluster_crossing_penalty > 0)) {
    if (connRoute.empty()) {
      constructPolygonPath(connRoute, inf2, inf3, inf1Node);
    }
    for (let ci: number = 0; ci < router.clusterRefs.length; ci++) {
      const cl: IClusterRef = router.clusterRefs[ci];
      const cBoundary: Polygon = isOrthogonal ?
        cl.rectangularPolygon() : cl.polygon();
      if (cBoundary.size() <= 2) {
        continue;
      }

      const isConn: boolean = false;
      const dynamicConnRoute: Polygon = new Polygon();
      dynamicConnRoute.ps = connRoute.ps.slice();
      const finalSegment: boolean = (inf3 === lineRef.dst());
      const cross: ConnectorCrossings = new ConnectorCrossings(
        cBoundary, isConn, dynamicConnRoute);
      cross.checkForBranchingSegments = true;
      cross.countForSegment(connRoute.size() - 1, finalSegment);

      result += (cross.crossingCount * cluster_crossing_penalty);
    }
  }

  const reversePenalty: number = router.routingParameter(reverseDirectionPenalty);
  if (reversePenalty) {
    const srcPoint: Point = lineRef.src().point;
    const dstPoint: Point = lineRef.dst().point;
    const xDir: number = dimDirection(dstPoint.x - srcPoint.x);
    const yDir: number = dimDirection(dstPoint.y - srcPoint.y);

    let doesReverse: boolean = false;

    if ((xDir !== 0) &&
        (-xDir === dimDirection(inf3.point.x - inf2.point.x))) {
      doesReverse = true;
    }

    if ((yDir !== 0) &&
        (-yDir === dimDirection(inf3.point.y - inf2.point.y))) {
      doesReverse = true;
    }

    if (doesReverse) {
      result += reversePenalty;
    }
  }

  if (!router.isInCrossingPenaltyReroutingStage()) {
    return result;
  }

  const crossing_penalty: number = router.routingParameter(crossingPenalty);
  const shared_path_penalty: number =
    router.routingParameter(fixedSharedPathPenalty);
  if ((shared_path_penalty > 0) || (crossing_penalty > 0)) {
    if (connRoute.empty()) {
      constructPolygonPath(connRoute, inf2, inf3, inf1Node);
    }
    for (let ci: number = 0; ci < router.connRefs.length; ci++) {
      const connRef: IConnRef = router.connRefs[ci];

      if (connRef.id() === lineRef.id()) {
        continue;
      }
      const route2: Polygon = connRef.displayRoute();

      const isConn: boolean = true;
      const dynamicRoute2: Polygon = new Polygon();
      dynamicRoute2.ps = route2.ps.slice();
      const dynamicConnRoute: Polygon = new Polygon();
      dynamicConnRoute.ps = connRoute.ps.slice();
      const finalSegment: boolean = (inf3.point.eq(lineRef.dst().point));
      const cross: ConnectorCrossings = new ConnectorCrossings(
        dynamicRoute2, isConn, dynamicConnRoute, connRef as any, lineRef as any);
      cross.checkForBranchingSegments = true;
      cross.countForSegment(connRoute.size() - 1, finalSegment);

      if ((cross.crossingFlags & CROSSING_SHARES_PATH) &&
          (cross.crossingFlags & CROSSING_SHARES_FIXED_SEGMENT) &&
          (router.routingOption(penaliseOrthogonalSharedPathsAtConnEnds) ||
           !(cross.crossingFlags & CROSSING_SHARES_PATH_AT_END))) {
        result += shared_path_penalty;
      }
      result += (cross.crossingCount * crossing_penalty);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// estimatedCostSpecific()
// ---------------------------------------------------------------------------

function estimatedCostSpecific(
  lineRef: IConnRef,
  last: Point | null,
  curr: Point,
  costTar: IVertInf,
  costTarDirs: number
): number {
  const costTarPoint: Point = costTar.point;

  if (lineRef.routingType() === ConnType_PolyLine) {
    return euclideanDist(curr, costTarPoint);
  }

  let dist: number = manhattanDist(curr, costTarPoint);

  let bendCount: number = 0;
  const xmove: number = costTarPoint.x - curr.x;
  const ymove: number = costTarPoint.y - curr.y;

  if (last === null) {
    if ((xmove !== 0) && (ymove !== 0)) {
      bendCount += 1;
    }
  } else if (dist > 0) {
    const currDir: number = orthogonalDirection(last, curr);
    if ((currDir > 0) && (orthogonalDirectionsCount(currDir) === 1)) {
      bendCount = 10;

      if (costTarDirs & CostDirectionN) {
        bendCount = Math.min(bendCount,
          bends(curr, currDir, costTarPoint, CostDirectionN));
      }
      if (costTarDirs & CostDirectionE) {
        bendCount = Math.min(bendCount,
          bends(curr, currDir, costTarPoint, CostDirectionE));
      }
      if (costTarDirs & CostDirectionS) {
        bendCount = Math.min(bendCount,
          bends(curr, currDir, costTarPoint, CostDirectionS));
      }
      if (costTarDirs & CostDirectionW) {
        bendCount = Math.min(bendCount,
          bends(curr, currDir, costTarPoint, CostDirectionW));
      }
    }
  }

  const penalty: number = bendCount *
    lineRef.router().routingParameter(segmentPenalty);

  return dist + penalty;
}

// ---------------------------------------------------------------------------
// cmpVisEdgeRotation: comparator for sorting edges by rotation
// ---------------------------------------------------------------------------

function cmpVisEdgeRotation(
  lastPt: IVertInf | null,
  u: IEdgeInf,
  v: IEdgeInf
): number {
  if (u.isOrthogonal() && v.isOrthogonal()) {
    return u.rotationLessThan(lastPt, v) ? -1 : 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// pointAlignedWithOneOf
// ---------------------------------------------------------------------------

function pointAlignedWithOneOf(point: Point, points: Point[], dim: number): boolean {
  for (let i: number = 0; i < points.length; i++) {
    if (point.dim(dim) === points[i].dim(dim)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// AStarPathPrivate
// ---------------------------------------------------------------------------

class AStarPathPrivate {
  private _costTargets: IVertInf[];
  private _costTargetsDirections: number[];
  private _costTargetsDisplacements: number[];

  constructor() {
    this._costTargets = [];
    this._costTargetsDirections = [];
    this._costTargetsDisplacements = [];
  }

  newANode(node: ANode, addToPending: boolean = true): ANode {
    const newNode: ANode = new ANode();
    newNode.copyFrom(node);
    if (addToPending) {
      node.inf!.aStarPendingNodes.push(newNode);
    }
    return newNode;
  }

  estimatedCost(lineRef: IConnRef, last: Point | null, curr: Point): number {
    let estimate: number = Number.MAX_VALUE;

    for (let i: number = 0; i < this._costTargets.length; i++) {
      let iEstimate: number = estimatedCostSpecific(
        lineRef, last, curr,
        this._costTargets[i],
        this._costTargetsDirections[i]);

      iEstimate += this._costTargetsDisplacements[i];

      estimate = Math.min(estimate, iEstimate);
    }
    return estimate;
  }

  determineEndPointLocation(
    _dist: number,
    _start: IVertInf,
    target: IVertInf,
    other: IVertInf,
    _level: number
  ): void {
    const otherPoint: Point = other.point;
    const thisDirs: number = orthogonalDirection(otherPoint, target.point);
    const displacement: number = manhattanDist(otherPoint, target.point);

    this._costTargets.push(other);
    this._costTargetsDirections.push(thisDirs);
    this._costTargetsDisplacements.push(displacement);
  }

  // -------------------------------------------------------------------
  // The main A* search algorithm.
  // -------------------------------------------------------------------
  search(lineRef: IConnRef, src: IVertInf, tar: IVertInf, start: IVertInf | null): void {
    const isOrthogonal: boolean = (lineRef.routingType() === ConnType_Orthogonal);

    if (start === null || start === undefined) {
      start = src;
    }

    // Find target points for orthogonal cost estimation.
    if (isOrthogonal && tar.id.isConnPt() && !tar.id.isConnCheckpoint()) {
      const dist: number = manhattanDist(start.point, tar.point);
      const orthogVisList: IEdgeInf[] = tar.orthogVisList;
      for (let it: number = 0; it < orthogVisList.length; it++) {
        const edge: IEdgeInf = orthogVisList[it];
        const other: IVertInf = edge.otherVert(tar);
        if (other.id.isConnectionPin()) {
          const replacementTar: IVertInf = other;
          const innerList: IEdgeInf[] = replacementTar.orthogVisList;
          for (let jt: number = 0; jt < innerList.length; jt++) {
            const innerEdge: IEdgeInf = innerList[jt];
            const innerOther: IVertInf = innerEdge.otherVert(replacementTar);
            if ((innerOther === tar) ||
                (innerOther.point.eq(tar.point))) {
              continue;
            }
            this.determineEndPointLocation(
              dist, start, replacementTar, innerOther, 2);
          }
          continue;
        }

        this.determineEndPointLocation(dist, start, tar, other, 1);
      }
    }

    if (this._costTargets.length === 0) {
      this._costTargets.push(tar);
      this._costTargetsDirections.push(
        CostDirectionN | CostDirectionE | CostDirectionS | CostDirectionW);
      this._costTargetsDisplacements.push(0.0);
    }

    const distFn: (a: Point, b: Point) => number = isOrthogonal ? manhattanDist : euclideanDist;

    let endPoints: Point[] = [];
    if (isOrthogonal) {
      endPoints = lineRef.possibleDstPinPoints();
    }
    endPoints.push(tar.point);

    const PENDING: MinHeap = new MinHeap();

    let exploredCount: number = 0;
    let node: ANode;
    let ati: ANode;
    let bestNode: ANode | null = null;
    let bNodeFound: boolean = false;
    let timestamp: number = 1;

    const router: IRouter = lineRef.router();

    if (router.RubberBandRouting && (start !== src)) {
      const currRoute: Polygon = lineRef.route();
      let last: IVertInf | null = null;
      let rIndx: number = 0;
      while (last !== start) {
        const pnt: Point = currRoute.at(rIndx);
        const props: number = (rIndx > 0) ? 0 : PROP_ConnPoint;
        const vID: { objId: number; vn: number; props: number } = {
          objId: pnt.id, vn: pnt.vn, props: props
        };

        const curr: IVertInf = router.vertices.getVertexByID(vID);

        node = new ANode(curr, timestamp++);
        if (!last) {
          node.inf = src;
          node.g = 0;
          node.h = this.estimatedCost(lineRef, null, node.inf!.point);
          node.f = node.g + node.h;
        } else {
          const edgeDist: number = distFn(bestNode!.inf!.point, curr.point);
          node.g = bestNode!.g + cost(lineRef, edgeDist, bestNode!.inf!,
            node.inf!, bestNode!.prevNode);
          node.h = this.estimatedCost(lineRef, bestNode!.inf!.point,
            node.inf!.point);
          node.f = node.g + node.h;
          node.prevNode = bestNode;
        }

        if (curr !== start) {
          const addToPending: boolean = false;
          bestNode = this.newANode(node, addToPending);
          bestNode.inf!.aStarDoneNodes.push(bestNode);
          ++exploredCount;
        } else {
          const newNode: ANode = this.newANode(node);
          PENDING.push(newNode);
        }

        rIndx++;
        last = curr;
      }
    } else {
      if (start.pathNext) {
        const addToPending: boolean = false;
        bestNode = this.newANode(
          new ANode(start.pathNext, timestamp++), addToPending);
        bestNode.inf!.aStarDoneNodes.push(bestNode);
        ++exploredCount;
      }

      node = new ANode(src, timestamp++);
      node.g = 0;
      node.h = this.estimatedCost(lineRef, null, node.inf!.point);
      node.f = node.g + node.h;
      node.prevNode = bestNode;

      const newNode: ANode = this.newANode(node);
      PENDING.push(newNode);
    }

    tar.pathNext = null;

    // Main A* loop.
    while (!PENDING.empty()) {
      bestNode = PENDING.pop();
      const bestNodeInf: IVertInf = bestNode!.inf!;

      const pendingList: ANode[] = bestNodeInf.aStarPendingNodes;
      const pendingIdx: number = pendingList.indexOf(bestNode!);
      if (pendingIdx !== -1) {
        pendingList.splice(pendingIdx, 1);
      }

      bestNodeInf.aStarDoneNodes.push(bestNode!);
      ++exploredCount;

      const prevInf: IVertInf | null = bestNode!.prevNode ? bestNode!.prevNode.inf : null;

      if (bestNodeInf === tar) {
        for (let curr: ANode | null = bestNode; curr!.prevNode; curr = curr!.prevNode) {
          curr!.inf!.pathNext = curr!.prevNode!.inf;
        }
        break;
      }

      let visList: IEdgeInf[] = (!isOrthogonal) ?
        bestNodeInf.visList : bestNodeInf.orthogVisList;

      if (isOrthogonal) {
        visList.sort((u: IEdgeInf, v: IEdgeInf) => cmpVisEdgeRotation(prevInf, u, v));
      }

      for (let ei: number = 0; ei < visList.length; ei++) {
        const edgeRef: IEdgeInf = visList[ei];

        if (edgeRef.isDisabled()) {
          continue;
        }

        node = new ANode(edgeRef.otherVert(bestNodeInf), timestamp++);
        node.prevNode = bestNode;

        const prevInf2: IVertInf | null = bestNode!.prevNode ?
          bestNode!.prevNode.inf : null;

        if (prevInf2 && (prevInf2 === node.inf)) {
          continue;
        }

        if (node.inf!.id.isConnectionPin() &&
            !node.inf!.id.isConnCheckpoint()) {
          if (!(bestNodeInf === lineRef.src() &&
                lineRef.src().id.isDummyPinHelper()) &&
              !(node.inf!.hasNeighbour(lineRef.dst(), isOrthogonal) &&
                lineRef.dst().id.isDummyPinHelper())) {
            continue;
          }
        } else if (node.inf!.id.isConnPt()) {
          if (node.inf !== tar) {
            continue;
          }
        }

        if (isOrthogonal && !edgeRef.isDummyConnection()) {
          const bestPt: Point = bestNodeInf.point;
          const nextPt: Point = node.inf!.point;

          const notInlineX: boolean = !!prevInf2 && (prevInf2.point.x !== bestPt.x);
          const notInlineY: boolean = !!prevInf2 && (prevInf2.point.y !== bestPt.y);

          if ((bestPt.x === nextPt.x) && notInlineX && !notInlineY &&
              (bestPt.dim(YDIM) !== src.point.dim(YDIM))) {
            if (nextPt.y < bestPt.y) {
              if (!(bestNodeInf.orthogVisPropFlags & YL_EDGE) &&
                  !pointAlignedWithOneOf(bestPt, endPoints, XDIM)) {
                continue;
              }
            } else if (nextPt.y > bestPt.y) {
              if (!(bestNodeInf.orthogVisPropFlags & YH_EDGE) &&
                  !pointAlignedWithOneOf(bestPt, endPoints, XDIM)) {
                continue;
              }
            }
          }
          if ((bestPt.y === nextPt.y) && notInlineY && !notInlineX &&
              (bestPt.dim(XDIM) !== src.point.dim(XDIM))) {
            if (nextPt.x < bestPt.x) {
              if (!(bestNodeInf.orthogVisPropFlags & XL_EDGE) &&
                  !pointAlignedWithOneOf(bestPt, endPoints, YDIM)) {
                continue;
              }
            } else if (nextPt.x > bestPt.x) {
              if (!(bestNodeInf.orthogVisPropFlags & XH_EDGE) &&
                  !pointAlignedWithOneOf(bestPt, endPoints, YDIM)) {
                continue;
              }
            }
          }
        }

        const edgeDist: number = edgeRef.getDist();

        if (edgeDist === 0) {
          continue;
        }

        if (!isOrthogonal &&
            (!router.RubberBandRouting || (start === src)) &&
            (typeof validateBendPoint === 'function') &&
            (validateBendPoint(prevInf2, bestNodeInf, node.inf!) === false)) {
          continue;
        }

        let atCostTarget: boolean = false;
        for (let i: number = 0; i < this._costTargets.length; i++) {
          if (bestNode!.inf === this._costTargets[i]) {
            atCostTarget = true;
            break;
          }
        }

        if (atCostTarget &&
            (node.inf!.id.isConnectionPin() || (node.inf === tar))) {
          node.g = bestNode!.g;
          node.h = 0;
        } else {
          if (node.inf === tar) {
            node.h = 0;
          } else {
            node.h = this.estimatedCost(lineRef, bestNodeInf.point,
              node.inf!.point);
          }

          if (node.inf!.id.isDummyPinHelper()) {
            node.g = bestNode!.g;
          } else {
            node.g = bestNode!.g + cost(lineRef, edgeDist, bestNodeInf,
              node.inf!, bestNode!.prevNode);
          }
        }

        node.f = node.g + node.h;

        bNodeFound = false;

        const pendingNodes: ANode[] = node.inf!.aStarPendingNodes;
        for (let ci: number = 0; ci < pendingNodes.length; ci++) {
          ati = pendingNodes[ci];
          if ((node.inf === ati.inf) &&
              ((node.prevNode === ati.prevNode) ||
               (node.prevNode!.inf === ati.prevNode!.inf))) {
            if (node.g < ati.g) {
              ati.copyFrom(node);
              PENDING.rebuild();
            }
            bNodeFound = true;
            break;
          }
        }

        if (!bNodeFound) {
          const doneNodes: ANode[] = node.inf!.aStarDoneNodes;
          for (let ci: number = 0; ci < doneNodes.length; ci++) {
            ati = doneNodes[ci];
            if ((node.inf === ati.inf) && ati.prevNode &&
                ((node.prevNode === ati.prevNode) ||
                 (node.prevNode!.inf === ati.prevNode!.inf))) {
              bNodeFound = true;
              break;
            }
          }
        }

        if (!bNodeFound) {
          const newNode: ANode = this.newANode(node);
          PENDING.push(newNode);
        }
      }
    }

    // Cleanup: clear Done and Pending lists on all vertices.
    const endVert: IVertInf = router.vertices.end();
    for (let k: IVertInf | null = router.vertices.connsBegin(); k !== endVert; k = k!.lstNext) {
      k!.aStarDoneNodes = [];
      k!.aStarPendingNodes = [];
    }
  }
}

// ---------------------------------------------------------------------------
// AStarPath: public interface
// ---------------------------------------------------------------------------

export class AStarPath {
  private _private: AStarPathPrivate;

  constructor() {
    this._private = new AStarPathPrivate();
  }

  search(lineRef: IConnRef, src: IVertInf, tar: IVertInf, start: IVertInf | null): void {
    this._private.search(lineRef, src, tar, start);
  }
}

// Also export helpers that may be needed by other modules.
export {
  ANode,
  angleBetween,
  constructPolygonPath,
  dimDirection,
  orthogonalDirection,
  orthogonalDirectionsCount,
  dirRight,
  dirLeft,
  dirReverse,
  bends,
  estimatedCostSpecific,
  pointAlignedWithOneOf,
  cmpVisEdgeRotation,
  cost,
};

// Export local interfaces so consumers can use them without circular deps.
export type {
  IVertID,
  IVertInf,
  IEdgeInf,
  IConnRef,
  IRouter,
  IClusterRef,
  IVertInfList,
};
