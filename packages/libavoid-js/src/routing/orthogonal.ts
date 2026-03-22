/*
 * libavoid-js - JavaScript port of libavoid orthogonal routing
 * Original C++ library: Copyright (C) 2009-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import {
  XDIM,
  YDIM,
  CHANNEL_MAX,
  Open,
  ConnPoint,
  Close,
  ConnDirNone,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  ConnType_Orthogonal,
  segmentPenalty,
  fixedSharedPathPenalty,
  idealNudgingDistance,
  nudgeOrthogonalSegmentsConnectedToShapes,
  nudgeOrthogonalTouchingColinearSegments,
  performUnifyingNudgingPreprocessingStep,
  nudgeSharedPathsWithCommonEndPoint,
  TransactionPhaseOrthogonalNudgingX,
  TransactionPhaseOrthogonalNudgingY,
  XL_EDGE,
  XL_CONN,
  XH_EDGE,
  XH_CONN,
  YL_EDGE,
  YL_CONN,
  YH_EDGE,
  YH_CONN,
  CROSSING_SHARES_PATH_AT_END,
} from '../core/constants';

import { Point } from '../core/geomtypes';
import { VertInf, dummyOrthogID, dummyOrthogShapeID } from '../graph/vertices';
import { EdgeInf } from '../graph/graph';
import { Variable, Constraint, IncSolver } from '../solver/vpsc';

import {
  ShiftSegment,
  Node,
  Event,
  compareEvents,
  buildOrthogonalChannelInfo,
  buildConnectorRouteCheckpointCache,
  clearConnectorRouteCheckpointCache,
} from './scanline';


// ===========================================================================
// Local Router interface to avoid circular dependency
// ===========================================================================

interface ConnRef {
  id(): number;
  routingType(): number;
  displayRoute(): DisplayRoute;
  router(): Router;
  set_route(route: DisplayRoute): void;
  hasFixedRoute?: () => boolean;
  constructor: ConnRefConstructor;
}

interface ConnRefConstructor {
  ConnectorCrossings?: CrossingsConstructor;
}

interface CrossingsConstructor {
  new(
    route2: DisplayRoute,
    flag: boolean,
    route: DisplayRoute,
    conn2: ConnRef,
    conn: ConnRef,
  ): ConnectorCrossings;
}

interface ConnectorCrossings {
  pointOrders: Map<string, PtOrder>;
  crossingCount: number;
  crossingFlags: number;
  countForSegment(i: number, finalSegment: boolean): void;
}

interface DisplayRoute {
  ps: Point[];
  size(): number;
  simplify(): DisplayRoute;
  checkpointsOnSegment(index: number, direction?: number): Point[];
  splitBranchingSegments?(flag: boolean, other: DisplayRoute): void;
}

interface PtOrder {
  positionFor(dimension: number, connRef: ConnRef): number;
}

interface Obstacle {
  isJunction: boolean;
  isShape: boolean;
  positionFixed?(): boolean;
  routingBox(): { min: Point; max: Point };
  polygon(): { offsetBoundingBox(dist: number): { min: Point; max: Point } };
  position(): Point;
}

interface VertexList {
  connsSize(): number;
  connsBegin(): VertInf | null;
  shapesBegin(): VertInf | null;
}

interface Router {
  m_obstacles: Obstacle[];
  vertices: VertexList;
  connRefs: ConnRef[];
  routingParameter(param: number): number;
  routingOption(option: number): boolean;
  performContinuationCheck?: (phase: string | number, current: number, total: number) => void;
  improveOrthogonalTopology?: () => void;
  ConnectorCrossings?: CrossingsConstructor;
}


// ===========================================================================
// Constants (file-local)
// ===========================================================================

const freeSegmentID: number  = 0;
const fixedSegmentID: number = 1;
const channelLeftID: number  = 2;
const channelRightID: number = 3;

const freeWeight: number     = 0.00001;
const strongWeight: number   = 0.001;
const strongerWeight: number = 1.0;
const fixedWeight: number    = 100000;


// ===========================================================================
// UnsignedPair
// ===========================================================================

class UnsignedPair {
  m_index1: number;
  m_index2: number;

  constructor(ind1: number, ind2: number) {
    this.m_index1 = Math.min(ind1, ind2);
    this.m_index2 = Math.max(ind1, ind2);
  }

  key(): string {
    return `${this.m_index1}:${this.m_index2}`;
  }

  lessThan(rhs: UnsignedPair): boolean {
    if (this.m_index1 !== rhs.m_index1) {
      return this.m_index1 < rhs.m_index1;
    }
    return this.m_index2 < rhs.m_index2;
  }
}


// ===========================================================================
// CmpIndexes  (used for sorting merged NudgingShiftSegment indexes)
// ===========================================================================

class CmpIndexes {
  connRef: ConnRef;
  dimension: number;

  constructor(connRef: ConnRef, dim: number) {
    this.connRef = connRef;
    this.dimension = dim;
  }

  compare(lhs: number, rhs: number): number {
    return this.connRef.displayRoute().ps[lhs].dim(this.dimension) -
           this.connRef.displayRoute().ps[rhs].dim(this.dimension);
  }
}


// ===========================================================================
// NudgingShiftSegment
// ===========================================================================

export class NudgingShiftSegment extends ShiftSegment {
  connRef: ConnRef;
  variable: Variable | null;
  fixed: boolean;
  finalSegment: boolean;
  endsInShape: boolean;
  singleConnectedSegment: boolean;
  _sBend: boolean;
  _zBend: boolean;
  indexes: number[];
  checkpoints: Point[];
  declare minSpaceLimit: number;
  declare maxSpaceLimit: number;

  constructor(
    conn: ConnRef,
    low: number,
    high: number,
    isSBendOrDim: boolean | number,
    isZBendOrUndef?: boolean,
    dim?: number,
    minLim?: number,
    maxLim?: number,
  ) {
    // Detect which constructor form is being used.
    if (dim === undefined) {
      // Fixed constructor: NudgingShiftSegment(conn, low, high, dim)
      // Here isSBendOrDim is actually the dimension.
      const fixedDim: number = isSBendOrDim as number;
      super(fixedDim);
      this.connRef = conn;
      this.variable = null;
      this.fixed = true;
      this.finalSegment = false;
      this.endsInShape = false;
      this.singleConnectedSegment = false;
      this._sBend = false;
      this._zBend = false;
      this.indexes = [low, high];
      this.checkpoints = [];
      // No space to shift.
      this.minSpaceLimit = this.lowPoint().dim(fixedDim);
      this.maxSpaceLimit = this.lowPoint().dim(fixedDim);
    } else {
      // Shiftable constructor
      super(dim);
      this.connRef = conn;
      this.variable = null;
      this.fixed = false;
      this.finalSegment = false;
      this.endsInShape = false;
      this.singleConnectedSegment = false;
      this._sBend = !!isSBendOrDim;
      this._zBend = !!isZBendOrUndef;
      this.indexes = [low, high];
      this.checkpoints = [];
      this.minSpaceLimit = minLim!;
      this.maxSpaceLimit = maxLim!;
    }
  }

  lowPoint(): Point {
    return this.connRef.displayRoute().ps[this.indexes[0]];
  }

  highPoint(): Point {
    return this.connRef.displayRoute().ps[this.indexes[this.indexes.length - 1]];
  }

  nudgeDistance(): number {
    return this.connRef.router().routingParameter(idealNudgingDistance);
  }

  immovable(): boolean {
    return !this.zigzag();
  }

  zigzag(): boolean {
    return this._sBend || this._zBend;
  }

  get sBend(): boolean { return this._sBend; }
  get zBend(): boolean { return this._zBend; }

  _lowC(): boolean {
    if (!this.finalSegment && !this.zigzag() && !this.fixed &&
        (this.minSpaceLimit === this.lowPoint().dim(this.dimension))) {
      return true;
    }
    return false;
  }

  _highC(): boolean {
    if (!this.finalSegment && !this.zigzag() && !this.fixed &&
        (this.maxSpaceLimit === this.lowPoint().dim(this.dimension))) {
      return true;
    }
    return false;
  }

  createSolverVariable(justUnifying: boolean): void {
    const nudgeFinalSegments: boolean = this.connRef.router().routingOption(
      nudgeOrthogonalSegmentsConnectedToShapes);
    let varID: number = freeSegmentID;
    let varPos: number = this.lowPoint().dim(this.dimension);
    let weight: number = freeWeight;

    if (nudgeFinalSegments && this.finalSegment) {
      weight = strongWeight;
      if (this.singleConnectedSegment && !justUnifying) {
        weight = strongerWeight;
      }
    } else if (this.checkpoints.length > 0) {
      weight = strongWeight;
    } else if (this.zigzag()) {
      console.assert(this.minSpaceLimit > -CHANNEL_MAX);
      console.assert(this.maxSpaceLimit < CHANNEL_MAX);
      varPos = this.minSpaceLimit + ((this.maxSpaceLimit - this.minSpaceLimit) / 2);
    } else if (this.fixed) {
      weight = fixedWeight;
      varID = fixedSegmentID;
    } else if (!this.finalSegment) {
      weight = strongWeight;
    }

    this.variable = new Variable(varID, varPos, weight);
  }

  updatePositionsFromSolver(_justUnifying: boolean): void {
    if (this.fixed) {
      return;
    }
    let newPos: number = this.variable!.finalPosition;

    // Clamp within limits.
    newPos = Math.max(newPos, this.minSpaceLimit);
    newPos = Math.min(newPos, this.maxSpaceLimit);

    for (let it = 0; it < this.indexes.length; ++it) {
      const index: number = this.indexes[it];
      this.connRef.displayRoute().ps[index].setDim(this.dimension, newPos);
    }
  }

  fixedOrder(): { order: number; isFixed: boolean } {
    const nudgeDist: number = this.nudgeDistance();
    const pos: number = this.lowPoint().dim(this.dimension);
    const minLimited: boolean = ((pos - this.minSpaceLimit) < nudgeDist);
    const maxLimited: boolean = ((this.maxSpaceLimit - pos) < nudgeDist);

    if (this.fixed || (minLimited && maxLimited)) {
      return { order: 0, isFixed: true };
    } else if (minLimited) {
      return { order: 1, isFixed: false };
    } else if (maxLimited) {
      return { order: -1, isFixed: false };
    }
    return { order: 0, isFixed: false };
  }

  order(): number {
    if (this._lowC()) {
      return -1;
    } else if (this._highC()) {
      return 1;
    }
    return 0;
  }

  overlapsWith(rhsSuper: ShiftSegment, dim: number): boolean {
    const rhs = rhsSuper as NudgingShiftSegment;
    const altDim: number = (dim + 1) % 2;
    const lowPt: Point = this.lowPoint();
    const highPt: Point = this.highPoint();
    const rhsLowPt: Point = rhs.lowPoint();
    const rhsHighPt: Point = rhs.highPoint();

    if ((lowPt.dim(altDim) < rhsHighPt.dim(altDim)) &&
        (rhsLowPt.dim(altDim) < highPt.dim(altDim))) {
      // The segments overlap.
      if ((this.minSpaceLimit <= rhs.maxSpaceLimit) &&
          (rhs.minSpaceLimit <= this.maxSpaceLimit)) {
        return true;
      }
    } else if ((lowPt.dim(altDim) === rhsHighPt.dim(altDim)) ||
               (rhsLowPt.dim(altDim) === highPt.dim(altDim))) {
      const nudgeColinearSegments: boolean = this.connRef.router().routingOption(
        nudgeOrthogonalTouchingColinearSegments);

      if ((this.minSpaceLimit <= rhs.maxSpaceLimit) &&
          (rhs.minSpaceLimit <= this.maxSpaceLimit)) {
        if (this.connRef.router().routingParameter(fixedSharedPathPenalty) > 0) {
          return true;
        } else if ((rhs._sBend && this._sBend) || (rhs._zBend && this._zBend)) {
          return nudgeColinearSegments;
        } else if ((rhs.finalSegment && this.finalSegment) &&
                   (rhs.connRef === this.connRef)) {
          return nudgeColinearSegments;
        }
      }
    }
    return false;
  }

  canAlignWith(rhs: NudgingShiftSegment, _dim: number): boolean {
    if (this.connRef !== rhs.connRef) {
      return false;
    }
    const hasCheckpoints: boolean = this.checkpoints.length > 0;
    const rhsHasCheckpoints: boolean = rhs.checkpoints.length > 0;
    if (hasCheckpoints || rhsHasCheckpoints) {
      return false;
    }
    return true;
  }

  shouldAlignWith(rhsSuper: ShiftSegment, dim: number): boolean {
    const rhs = rhsSuper as NudgingShiftSegment;
    if ((this.connRef === rhs.connRef) && this.finalSegment &&
        rhs.finalSegment && this.overlapsWith(rhs, dim)) {
      if ((this.endsInShape && rhs.endsInShape) ||
          (Math.abs(this.lowPoint().dim(dim) - rhs.lowPoint().dim(dim)) < 10)) {
        return true;
      }
    } else if ((this.connRef === rhs.connRef) &&
               (!(this.finalSegment && rhs.finalSegment))) {
      const hasCheckpoints: boolean = this.checkpoints.length > 0;
      const rhsHasCheckpoints: boolean = rhs.checkpoints.length > 0;

      if (hasCheckpoints !== rhsHasCheckpoints) {
        const altDim: number = (dim + 1) % 2;
        const space: number = Math.abs(this.lowPoint().dim(dim) - rhs.lowPoint().dim(dim));
        let touchPos: number = 0;
        let couldTouch: boolean = false;
        if (this.lowPoint().dim(altDim) === rhs.highPoint().dim(altDim)) {
          couldTouch = true;
          touchPos = this.lowPoint().dim(altDim);
        } else if (this.highPoint().dim(altDim) === rhs.lowPoint().dim(altDim)) {
          couldTouch = true;
          touchPos = this.highPoint().dim(altDim);
        }

        return couldTouch && (space <= 10) &&
          !this.hasCheckpointAtPosition(touchPos, altDim) &&
          !rhs.hasCheckpointAtPosition(touchPos, altDim);
      }
    }
    return false;
  }

  mergeWith(rhsSuper: ShiftSegment, dim: number): void {
    // Adjust limits.
    this.minSpaceLimit = Math.max(this.minSpaceLimit, rhsSuper.minSpaceLimit);
    this.maxSpaceLimit = Math.min(this.maxSpaceLimit, rhsSuper.maxSpaceLimit);

    // Find a new position for the segment.
    let segmentPos: number = this.lowPoint().dim(this.dimension);
    const segment2Pos: number = (rhsSuper as NudgingShiftSegment).lowPoint().dim(this.dimension);
    if (segment2Pos < segmentPos) {
      segmentPos -= ((segmentPos - segment2Pos) / 2.0);
    } else if (segment2Pos > segmentPos) {
      segmentPos += ((segment2Pos - segmentPos) / 2.0);
    }
    segmentPos = Math.max(this.minSpaceLimit, segmentPos);
    segmentPos = Math.min(this.maxSpaceLimit, segmentPos);

    // Merge the index lists and sort.
    const rhs = rhsSuper as NudgingShiftSegment;
    this.indexes = this.indexes.concat(rhs.indexes);
    const altDim: number = (dim + 1) % 2;
    const cmp = new CmpIndexes(this.connRef, altDim);
    this.indexes.sort((a: number, b: number) => cmp.compare(a, b));

    // Apply the new position to all points.
    for (let it = 0; it < this.indexes.length; ++it) {
      const index: number = this.indexes[it];
      this.connRef.displayRoute().ps[index].setDim(this.dimension, segmentPos);
    }
  }

  hasCheckpointAtPosition(position: number, dim: number): boolean {
    for (let cp = 0; cp < this.checkpoints.length; ++cp) {
      if (this.checkpoints[cp].dim(dim) === position) {
        return true;
      }
    }
    return false;
  }
}


// ===========================================================================
// ScanVisDirFlags
// ===========================================================================

const VisDirNone: number = 0;
const VisDirUp: number   = 1;
const VisDirDown: number = 2;

function getPosVertInfDirections(v: VertInf, dim: number): number {
  if (dim === XDIM) {
    const dirs: number = v.visDirections & (ConnDirLeft | ConnDirRight);
    if (dirs === (ConnDirLeft | ConnDirRight)) {
      return (VisDirDown | VisDirUp);
    } else if (dirs === ConnDirLeft) {
      return VisDirDown;
    } else if (dirs === ConnDirRight) {
      return VisDirUp;
    }
  } else if (dim === YDIM) {
    const dirs: number = v.visDirections & (ConnDirDown | ConnDirUp);
    if (dirs === (ConnDirDown | ConnDirUp)) {
      return (VisDirDown | VisDirUp);
    } else if (dirs === ConnDirDown) {
      return VisDirUp;
    } else if (dirs === ConnDirUp) {
      return VisDirDown;
    }
  }
  return VisDirNone;
}


// ===========================================================================
// PosVertInf
// ===========================================================================

class PosVertInf {
  pos: number;
  vert: VertInf;
  dirs: number;

  constructor(p: number, vI: VertInf, d: number = VisDirNone) {
    this.pos = p;
    this.vert = vI;
    this.dirs = d;
  }

  lessThan(rhs: PosVertInf): boolean {
    if (this.pos !== rhs.pos) {
      return this.pos < rhs.pos;
    }
    if (this.vert.id.equals(rhs.vert.id) && this.vert.id.equals(dummyOrthogID)) {
      return false;
    }
    if (!this.vert.id.equals(rhs.vert.id)) {
      return this.vert.id.lessThan(rhs.vert.id);
    }
    return this.dirs < rhs.dirs;
  }
}

function comparePosVertInf(a: PosVertInf, b: PosVertInf): number {
  if (a.pos !== b.pos) return a.pos - b.pos;
  if (a.vert.id.equals(b.vert.id) && a.vert.id.equals(dummyOrthogID)) return 0;
  if (!a.vert.id.equals(b.vert.id)) {
    return a.vert.id.lessThan(b.vert.id) ? -1 : 1;
  }
  return a.dirs - b.dirs;
}


// ===========================================================================
// CmpVertInf  (for VertSet -- sorted set of VertInf*)
// ===========================================================================

function compareVertInf(u: VertInf, v: VertInf): number {
  if (u.point.x !== v.point.x) {
    return u.point.x - v.point.x;
  }
  if (u.point.y !== v.point.y) {
    return u.point.y - v.point.y;
  }
  // Use VertInf identity as tiebreaker.
  if (u === v) return 0;
  return (u as any)._uid < (v as any)._uid ? -1 : 1;
}

// A sorted array acting as a set for VertInf pointers.
class VertSet {
  _arr: VertInf[];

  constructor() {
    this._arr = [];
  }

  insert(v: VertInf): void {
    let lo: number = 0;
    let hi: number = this._arr.length;
    while (lo < hi) {
      const mid: number = (lo + hi) >>> 1;
      if (compareVertInf(this._arr[mid], v) < 0) lo = mid + 1;
      else hi = mid;
    }
    if (lo < this._arr.length && this._arr[lo] === v) return; // already present
    this._arr.splice(lo, 0, v);
  }

  insertAll(other: VertSet): void {
    for (const v of other._arr) {
      this.insert(v);
    }
  }

  begin(): VertInf | null { return this._arr[0] || null; }
  rbegin(): VertInf | null { return this._arr[this._arr.length - 1] || null; }
  values(): VertInf[] { return this._arr; }
  empty(): boolean { return this._arr.length === 0; }
  size(): number { return this._arr.length; }

  [Symbol.iterator](): Iterator<VertInf> { return this._arr[Symbol.iterator](); }
}


// ===========================================================================
// BreakpointSet  (sorted set of PosVertInf)
// ===========================================================================

class BreakpointSet {
  _arr: PosVertInf[];

  constructor() {
    this._arr = [];
  }

  insert(pvi: PosVertInf): void {
    let lo: number = 0;
    let hi: number = this._arr.length;
    while (lo < hi) {
      const mid: number = (lo + hi) >>> 1;
      if (comparePosVertInf(this._arr[mid], pvi) < 0) lo = mid + 1;
      else hi = mid;
    }
    // Allow duplicates at same position if they are different vertInfs.
    this._arr.splice(lo, 0, pvi);
  }

  empty(): boolean { return this._arr.length === 0; }
  begin(): PosVertInf | null { return this._arr[0] || null; }
  rbegin(): PosVertInf | null { return this._arr[this._arr.length - 1] || null; }
  values(): PosVertInf[] { return this._arr; }
  size(): number { return this._arr.length; }

  [Symbol.iterator](): Iterator<PosVertInf> { return this._arr[Symbol.iterator](); }
}


// ===========================================================================
// LineSegment
// ===========================================================================

export class LineSegment {
  begin: number;
  finish: number;
  pos: number;
  shapeSide: boolean;
  vertInfs: VertSet;
  breakPoints: BreakpointSet;

  constructor(
    beginOrBf: number,
    finishOrPos: number,
    pos?: number,
    shapeSide?: boolean | VertInf,
    bvi?: VertInf | null,
    fvi?: VertInf | null,
  ) {
    if (pos === undefined) {
      // Single-point constructor: LineSegment(bf, pos, bfvi)
      this.begin = beginOrBf;
      this.finish = beginOrBf;
      this.pos = finishOrPos;
      this.shapeSide = false;
      this.vertInfs = new VertSet();
      this.breakPoints = new BreakpointSet();
      // finishOrPos is actually pos; shapeSide is bfvi
      if (shapeSide && shapeSide instanceof Object && (shapeSide as VertInf).point) {
        this.vertInfs.insert(shapeSide as VertInf);
      }
    } else {
      // Range constructor: LineSegment(begin, finish, pos, shapeSide, bvi, fvi)
      this.begin = beginOrBf;
      this.finish = finishOrPos;
      this.pos = pos;
      this.shapeSide = !!shapeSide;
      this.vertInfs = new VertSet();
      this.breakPoints = new BreakpointSet();
      if (bvi) this.vertInfs.insert(bvi);
      if (fvi) this.vertInfs.insert(fvi);
      console.assert(this.begin < this.finish || this.begin === this.finish);
    }
  }

  compareTo(rhs: LineSegment): number {
    if (this.begin !== rhs.begin) return this.begin - rhs.begin;
    if (this.pos !== rhs.pos) return this.pos - rhs.pos;
    if (this.finish !== rhs.finish) return this.finish - rhs.finish;
    return 0;
  }

  overlaps(rhs: LineSegment): boolean {
    if ((this.begin === rhs.begin) && (this.pos === rhs.pos) &&
        (this.finish === rhs.finish)) {
      return true;
    }
    if (this.pos === rhs.pos) {
      if (((this.begin >= rhs.begin) && (this.begin <= rhs.finish)) ||
          ((rhs.begin >= this.begin) && (rhs.begin <= this.finish))) {
        return true;
      }
    }
    return false;
  }

  mergeVertInfs(segment: LineSegment): void {
    this.begin = Math.min(this.begin, segment.begin);
    this.finish = Math.max(this.finish, segment.finish);
    this.vertInfs.insertAll(segment.vertInfs);
  }

  beginVertInf(): VertInf | null {
    if (this.vertInfs.empty()) return null;
    const inf: VertInf = this.vertInfs.begin()!;
    if (((inf.point.y === this.begin) && (inf.point.x === this.pos)) ||
        ((inf.point.x === this.begin) && (inf.point.y === this.pos))) {
      return inf;
    }
    return null;
  }

  finishVertInf(): VertInf | null {
    if (this.vertInfs.empty()) return null;
    const inf: VertInf = this.vertInfs.rbegin()!;
    if (((inf.point.y === this.finish) && (inf.point.x === this.pos)) ||
        ((inf.point.x === this.finish) && (inf.point.y === this.pos))) {
      return inf;
    }
    return null;
  }

  commitPositionX(router: Router, posX: number): VertInf {
    let found: VertInf | null = null;
    for (const v of this.vertInfs) {
      if (v.point.x === posX) {
        found = v;
        break;
      }
    }
    if (!found) {
      found = new VertInf(router as any, dummyOrthogID, new Point(posX, this.pos));
      this.vertInfs.insert(found);
    }
    return found;
  }

  horiCommitBegin(router: Router, vert: VertInf | null = null): void {
    if (vert) {
      this.vertInfs.insert(vert);
    }
    if (this.vertInfs.empty() ||
        (this.vertInfs.begin()!.point.x !== this.begin)) {
      if (this.begin !== -Number.MAX_VALUE) {
        this.vertInfs.insert(
          new VertInf(router as any, dummyOrthogID, new Point(this.begin, this.pos)));
      }
    }
  }

  horiCommitFinish(router: Router, vert: VertInf | null = null): void {
    if (vert) {
      this.vertInfs.insert(vert);
    }
    if (this.vertInfs.empty() ||
        (this.vertInfs.rbegin()!.point.x !== this.finish)) {
      if (this.finish !== Number.MAX_VALUE) {
        this.vertInfs.insert(
          new VertInf(router as any, dummyOrthogID, new Point(this.finish, this.pos)));
      }
    }
  }

  addSegmentsUpTo(finishPos: number): number {
    let firstIntersectionIdx: number = -1;
    const verts: VertInf[] = this.vertInfs.values();
    for (let i = 0; i < verts.length; i++) {
      const v: VertInf = verts[i];
      if (v.point.x > finishPos) {
        break;
      }
      this.breakPoints.insert(new PosVertInf(v.point.x, v,
        getPosVertInfDirections(v, XDIM)));

      if ((firstIntersectionIdx === -1) && (v.point.x === finishPos)) {
        firstIntersectionIdx = i;
      }
    }
    return firstIntersectionIdx;
  }

  addEdgeHorizontal(router: Router): void {
    this.horiCommitBegin(router);
    this.horiCommitFinish(router);
    this.addSegmentsUpTo(this.finish);
  }

  setLongRangeVisibilityFlags(dim: number): void {
    const bps: PosVertInf[] = this.breakPoints.values();

    // Forward pass.
    let seenConnPt: boolean = false;
    let seenShapeEdge: boolean = false;
    for (let i = 0; i < bps.length; i++) {
      let mask: number = 0;
      if (dim === XDIM) {
        if (seenConnPt) mask |= XL_CONN;
        if (seenShapeEdge) mask |= XL_EDGE;
      } else {
        if (seenConnPt) mask |= YL_CONN;
        if (seenShapeEdge) mask |= YL_EDGE;
      }
      bps[i].vert.orthogVisPropFlags |= mask;

      if (bps[i].vert.id.isConnPt()) seenConnPt = true;
      if (bps[i].vert.id.isOrthShapeEdge()) seenShapeEdge = true;
    }

    // Reverse pass.
    seenConnPt = false;
    seenShapeEdge = false;
    for (let i = bps.length - 1; i >= 0; i--) {
      let mask: number = 0;
      if (dim === XDIM) {
        if (seenConnPt) mask |= XH_CONN;
        if (seenShapeEdge) mask |= XH_EDGE;
      } else {
        if (seenConnPt) mask |= YH_CONN;
        if (seenShapeEdge) mask |= YH_EDGE;
      }
      bps[i].vert.orthogVisPropFlags |= mask;

      if (bps[i].vert.id.isConnPt()) seenConnPt = true;
      if (bps[i].vert.id.isOrthShapeEdge()) seenShapeEdge = true;
    }
  }

  addEdgeHorizontalTillIntersection(router: Router, vertLine: LineSegment): VertSet {
    const intersectionSet = new VertSet();

    this.horiCommitBegin(router);
    this.commitPositionX(router, vertLine.pos);

    const restBeginIdx: number = this.addSegmentsUpTo(vertLine.pos);

    // Collect intersection points.
    const verts: VertInf[] = this.vertInfs.values();
    if (restBeginIdx >= 0) {
      let i: number = restBeginIdx;
      while (i < verts.length && verts[i].point.x === vertLine.pos) {
        intersectionSet.insert(verts[i]);
        i++;
      }
    }

    // Adjust segment to remove processed portion.
    this.begin = vertLine.pos;
    // Remove vertices before restBeginIdx.
    if (restBeginIdx > 0) {
      this.vertInfs._arr.splice(0, restBeginIdx);
    }

    return intersectionSet;
  }

  insertBreakpointsBegin(router: Router, vertLine: LineSegment): void {
    let vert: VertInf | null = null;
    if (this.pos === vertLine.begin && vertLine.beginVertInf()) {
      vert = vertLine.beginVertInf();
    } else if (this.pos === vertLine.finish && vertLine.finishVertInf()) {
      vert = vertLine.finishVertInf();
    }
    this.horiCommitBegin(router, vert);

    for (const v of this.vertInfs) {
      if (v.point.x === this.begin) {
        vertLine.breakPoints.insert(new PosVertInf(this.pos, v,
          getPosVertInfDirections(v, YDIM)));
      }
    }
  }

  insertBreakpointsFinish(router: Router, vertLine: LineSegment): void {
    let vert: VertInf | null = null;
    if (this.pos === vertLine.begin && vertLine.beginVertInf()) {
      vert = vertLine.beginVertInf();
    } else if (this.pos === vertLine.finish && vertLine.finishVertInf()) {
      vert = vertLine.finishVertInf();
    }
    this.horiCommitFinish(router, vert);

    for (const v of this.vertInfs) {
      if (v.point.x === this.finish) {
        vertLine.breakPoints.insert(new PosVertInf(this.pos, v,
          getPosVertInfDirections(v, YDIM)));
      }
    }
  }

  generateVisibilityEdgesFromBreakpointSet(router: Router, dim: number): void {
    const bps: BreakpointSet = this.breakPoints;

    if (bps.empty() || (bps.begin()!.pos > this.begin)) {
      if (this.begin === -Number.MAX_VALUE) {
        if (!bps.empty()) {
          this.begin = bps.begin()!.pos;
        }
      } else {
        const point = new Point(this.pos, this.pos);
        point.setDim(dim, this.begin);
        const vert = new VertInf(router as any, dummyOrthogID, point);
        bps.insert(new PosVertInf(this.begin, vert));
      }
    }

    if (bps.empty() || (bps.rbegin()!.pos < this.finish)) {
      if (this.finish === Number.MAX_VALUE) {
        if (!bps.empty()) {
          this.finish = bps.rbegin()!.pos;
        }
      } else {
        const point = new Point(this.pos, this.pos);
        point.setDim(dim, this.finish);
        const vert = new VertInf(router as any, dummyOrthogID, point);
        bps.insert(new PosVertInf(this.finish, vert));
      }
    }

    // Set flags for orthogonal routing optimisation.
    this.setLongRangeVisibilityFlags(dim);

    const orthogonal: boolean = true;
    const allBps: PosVertInf[] = bps.values();

    let lastIdx: number = 0;
    let vertIdx: number = 0;

    for (vertIdx = 0, lastIdx = 0; vertIdx < allBps.length;) {
      const firstPrevIdx: number = lastIdx;

      while (allBps[lastIdx].vert.point.dim(dim) !== allBps[vertIdx].vert.point.dim(dim)) {
        console.assert(vertIdx !== lastIdx);

        if (allBps[vertIdx].vert.id.isConnPt() && allBps[lastIdx].vert.id.isConnPt()) {
          // Give vert visibility back to the first non-connector endpoint vertex.
          let sideIdx: number = lastIdx;
          while (allBps[sideIdx].vert.id.isConnPt()) {
            if (sideIdx === 0) break;
            sideIdx--;
          }
          const canSeeDown: number = (allBps[vertIdx].dirs & VisDirDown);
          if (canSeeDown && !allBps[sideIdx].vert.id.isConnPt()) {
            const edge = new EdgeInf(allBps[sideIdx].vert, allBps[vertIdx].vert, orthogonal);
            edge.setDist(allBps[vertIdx].vert.point.dim(dim) -
              allBps[sideIdx].vert.point.dim(dim));
          }

          // Give last visibility back to the first non-connector endpoint vertex.
          let sideIdx2: number = vertIdx;
          while (sideIdx2 < allBps.length && allBps[sideIdx2].vert.id.isConnPt()) {
            sideIdx2++;
          }
          const canSeeUp: number = (allBps[lastIdx].dirs & VisDirUp);
          if (canSeeUp && (sideIdx2 < allBps.length)) {
            const edge = new EdgeInf(allBps[lastIdx].vert, allBps[sideIdx2].vert, orthogonal);
            edge.setDist(allBps[sideIdx2].vert.point.dim(dim) -
              allBps[lastIdx].vert.point.dim(dim));
          }
        }

        // The normal case.
        let generateEdge: boolean = true;
        if (allBps[lastIdx].vert.id.isConnPt() && !(allBps[lastIdx].dirs & VisDirUp)) {
          generateEdge = false;
        } else if (allBps[vertIdx].vert.id.isConnPt() && !(allBps[vertIdx].dirs & VisDirDown)) {
          generateEdge = false;
        }
        if (generateEdge) {
          const edge = new EdgeInf(allBps[lastIdx].vert, allBps[vertIdx].vert, orthogonal);
          edge.setDist(allBps[vertIdx].vert.point.dim(dim) -
            allBps[lastIdx].vert.point.dim(dim));
        }

        lastIdx++;
      }

      vertIdx++;

      if ((vertIdx < allBps.length) &&
          (allBps[lastIdx].vert.point.dim(dim) === allBps[vertIdx].vert.point.dim(dim))) {
        lastIdx = firstPrevIdx;
      }
    }
  }
}


// ===========================================================================
// SegmentListWrapper
// ===========================================================================

class SegmentListWrapper {
  _list: LineSegment[];

  constructor() {
    this._list = [];
  }

  insert(segment: LineSegment): LineSegment {
    let foundIdx: number = -1;
    for (let i = 0; i < this._list.length; i++) {
      if (this._list[i].overlaps(segment)) {
        if (foundIdx !== -1) {
          // Not the first overlapping segment -- merge and remove.
          this._list[i].mergeVertInfs(this._list[foundIdx]);
          this._list.splice(foundIdx, 1);
          // Adjust index.
          foundIdx = (i > foundIdx) ? i - 1 : i;
        } else {
          this._list[i].mergeVertInfs(segment);
          foundIdx = i;
        }
      }
    }
    if (foundIdx === -1) {
      this._list.push(segment);
      return this._list[this._list.length - 1];
    }
    return this._list[foundIdx];
  }

  list(): LineSegment[] { return this._list; }
}


// ===========================================================================
// ScanlineNodeSet for visibility graph (same as in scanline.js but with
// different insert/erase semantics matching processEventVert/Hori)
// ===========================================================================

let _nodeUidCtr: number = 100000;

class VisNodeSet {
  _arr: Node[];

  constructor() {
    this._arr = [];
  }

  size(): number { return this._arr.length; }

  _cmp(u: Node, v: Node): number {
    if (u.pos !== v.pos) return u.pos < v.pos ? -1 : 1;
    const up: number = u.v ? 1 : (u.c ? 2 : 3);
    const vp: number = v.v ? 1 : (v.c ? 2 : 3);
    if (up !== vp) return up - vp;
    return ((u as any)._uid || 0) - ((v as any)._uid || 0);
  }

  insert(node: Node): { index: number; inserted: boolean } {
    if (!(node as any)._uid) (node as any)._uid = _nodeUidCtr++;
    let lo: number = 0;
    let hi: number = this._arr.length;
    while (lo < hi) {
      const mid: number = (lo + hi) >>> 1;
      if (this._cmp(this._arr[mid], node) < 0) lo = mid + 1;
      else hi = mid;
    }
    this._arr.splice(lo, 0, node);
    (node as any)._setIndex = lo;
    for (let i: number = lo + 1; i < this._arr.length; i++) {
      (this._arr[i] as any)._setIndex = i;
    }
    return { index: lo, inserted: true };
  }

  erase(node: Node): number {
    const idx: number = this._arr.indexOf(node);
    if (idx === -1) return 0;
    this._arr.splice(idx, 1);
    for (let i: number = idx; i < this._arr.length; i++) {
      (this._arr[i] as any)._setIndex = i;
    }
    return 1;
  }

  prevNode(node: Node): Node | null {
    const idx: number = this._arr.indexOf(node);
    return idx > 0 ? this._arr[idx - 1] : null;
  }

  nextNode(node: Node): Node | null {
    const idx: number = this._arr.indexOf(node);
    return (idx >= 0 && idx < this._arr.length - 1) ? this._arr[idx + 1] : null;
  }
}


// ===========================================================================
// intersectSegments
// ===========================================================================

function intersectSegments(router: Router, segments: LineSegment[], vertLine: LineSegment): void {
  console.assert(segments.length > 0);

  for (let i = 0; i < segments.length;) {
    const horiLine: LineSegment = segments[i];

    const inVertSegRegion: boolean = ((vertLine.begin <= horiLine.pos) &&
                             (vertLine.finish >= horiLine.pos));

    if (vertLine.pos < horiLine.begin) {
      i++;
      continue;
    } else if (vertLine.pos === horiLine.begin) {
      if (inVertSegRegion) {
        horiLine.insertBreakpointsBegin(router, vertLine);
      }
    } else if (vertLine.pos === horiLine.finish) {
      if (inVertSegRegion) {
        horiLine.addEdgeHorizontal(router);
        horiLine.insertBreakpointsFinish(router, vertLine);
        horiLine.generateVisibilityEdgesFromBreakpointSet(router, XDIM);
        segments.splice(i, 1);
        continue;
      }
    } else if (vertLine.pos > horiLine.finish) {
      horiLine.addEdgeHorizontal(router);
      horiLine.generateVisibilityEdgesFromBreakpointSet(router, XDIM);
      segments.splice(i, 1);
      continue;
    } else {
      // vertLine.pos > horiLine.begin && vertLine.pos < horiLine.finish
      if (inVertSegRegion) {
        const intersectionVerts: VertSet =
          horiLine.addEdgeHorizontalTillIntersection(router, vertLine);
        for (const v of intersectionVerts) {
          vertLine.breakPoints.insert(new PosVertInf(horiLine.pos, v,
            getPosVertInfDirections(v, YDIM)));
        }
      }
    }
    i++;
  }

  vertLine.generateVisibilityEdgesFromBreakpointSet(router, YDIM);
}


// ===========================================================================
// processEventVert
// ===========================================================================

function processEventVert(
  router: Router,
  scanline: VisNodeSet,
  segments: SegmentListWrapper,
  e: Event,
  pass: number,
): void {
  const v: Node = e.v;

  if (((pass === 1) && (e.type === Open)) ||
      ((pass === 2) && (e.type === ConnPoint))) {
    scanline.insert(v);

    const above: Node | null = scanline.prevNode(v);
    if (above) {
      v.firstAbove = above;
      above.firstBelow = v;
    }
    const below: Node | null = scanline.nextNode(v);
    if (below) {
      v.firstBelow = below;
      below.firstAbove = v;
    }
  }

  if (pass === 2) {
    if ((e.type === Open) || (e.type === Close)) {
      const lineY: number = (e.type === Open) ? v.min[YDIM] : v.max[YDIM];

      const minShape: number = v.min[XDIM];
      const maxShape: number = v.max[XDIM];

      const { firstAbovePos: minLimit, firstBelowPos: maxLimit,
              lastAbovePos: minLimitMax, lastBelowPos: maxLimitMin } =
        v.findFirstPointAboveAndBelow(XDIM, lineY);

      if (minLimitMax >= maxLimitMin) {
        const vI1: VertInf = new VertInf(router as any, dummyOrthogShapeID,
          new Point(minShape, lineY));
        const vI2: VertInf = new VertInf(router as any, dummyOrthogShapeID,
          new Point(maxShape, lineY));

        if (minLimit < minShape) {
          segments.insert(new LineSegment(minLimit, minShape, lineY,
            true, null, vI1));
        }
        segments.insert(new LineSegment(minShape, maxShape, lineY,
          true, vI1, vI2));
        if (maxShape < maxLimit) {
          segments.insert(new LineSegment(maxShape, maxLimit, lineY,
            true, vI2, null));
        }
      } else {
        if ((minLimitMax > minLimit) && (minLimitMax >= minShape)) {
          const line: LineSegment = segments.insert(
            new LineSegment(minLimit, minLimitMax, lineY, true));
          const vI1: VertInf = new VertInf(router as any, dummyOrthogShapeID,
            new Point(minShape, lineY));
          line.vertInfs.insert(vI1);
        }
        if ((maxLimitMin < maxLimit) && (maxLimitMin <= maxShape)) {
          const line: LineSegment = segments.insert(
            new LineSegment(maxLimitMin, maxLimit, lineY, true));
          const vI2: VertInf = new VertInf(router as any, dummyOrthogShapeID,
            new Point(maxShape, lineY));
          line.vertInfs.insert(vI2);
        }
      }
    } else if (e.type === ConnPoint) {
      const centreVert: VertInf = e.v.c;
      const cp: Point = centreVert.point;

      const minLimit: number = v.firstPointAbove(XDIM);
      const maxLimit: number = v.firstPointBelow(XDIM);
      const inShape: boolean = v.isInsideShape(XDIM);

      let line1: LineSegment | null = null;
      let line2: LineSegment | null = null;
      if ((centreVert.visDirections & ConnDirLeft) && (minLimit < cp.x)) {
        line1 = segments.insert(new LineSegment(minLimit, cp.x, e.pos,
          true, null, centreVert));
      }
      if ((centreVert.visDirections & ConnDirRight) && (cp.x < maxLimit)) {
        line2 = segments.insert(new LineSegment(cp.x, maxLimit, e.pos,
          true, centreVert, null));
        line1 = null;
      }
      if (!line1 && !line2) {
        segments.insert(new LineSegment(cp.x, e.pos, undefined, centreVert));
      }

      if (!inShape) {
        if (line1 || line2) {
          const cent: VertInf = new VertInf(router as any, dummyOrthogID, cp);
          if (line1) line1.vertInfs.insert(cent);
          if (line2) line2.vertInfs.insert(cent);
        }
      }
    }
  }

  if (((pass === 3) && (e.type === Close)) ||
      ((pass === 2) && (e.type === ConnPoint))) {
    const l: Node | null = v.firstAbove;
    const r: Node | null = v.firstBelow;
    if (l !== null) l.firstBelow = v.firstBelow;
    if (r !== null) r.firstAbove = v.firstAbove;

    scanline.erase(v);
  }
}


// ===========================================================================
// processEventHori
// ===========================================================================

function processEventHori(
  router: Router,
  scanline: VisNodeSet,
  segments: SegmentListWrapper,
  e: Event,
  pass: number,
): void {
  const v: Node = e.v;

  if (((pass === 1) && (e.type === Open)) ||
      ((pass === 2) && (e.type === ConnPoint))) {
    scanline.insert(v);

    const above: Node | null = scanline.prevNode(v);
    if (above) {
      v.firstAbove = above;
      above.firstBelow = v;
    }
    const below: Node | null = scanline.nextNode(v);
    if (below) {
      v.firstBelow = below;
      below.firstAbove = v;
    }
  }

  if (pass === 2) {
    if ((e.type === Open) || (e.type === Close)) {
      const lineX: number = (e.type === Open) ? v.min[XDIM] : v.max[XDIM];

      const minShape: number = v.min[YDIM];
      const maxShape: number = v.max[YDIM];

      const { firstAbovePos: minLimit, firstBelowPos: maxLimit,
              lastAbovePos: minLimitMax, lastBelowPos: maxLimitMin } =
        v.findFirstPointAboveAndBelow(YDIM, lineX);

      if (minLimitMax >= maxLimitMin) {
        const line: LineSegment = segments.insert(
          new LineSegment(minLimit, maxLimit, lineX));
        const vI1: VertInf = new VertInf(router as any, dummyOrthogShapeID,
          new Point(lineX, minShape));
        const vI2: VertInf = new VertInf(router as any, dummyOrthogShapeID,
          new Point(lineX, maxShape));
        line.vertInfs.insert(vI1);
        line.vertInfs.insert(vI2);
      } else {
        if ((minLimitMax > minLimit) && (minLimitMax >= minShape)) {
          const line: LineSegment = segments.insert(
            new LineSegment(minLimit, minLimitMax, lineX));
          const vI1: VertInf = new VertInf(router as any, dummyOrthogShapeID,
            new Point(lineX, minShape));
          line.vertInfs.insert(vI1);
        }
        if ((maxLimitMin < maxLimit) && (maxLimitMin <= maxShape)) {
          const line: LineSegment = segments.insert(
            new LineSegment(maxLimitMin, maxLimit, lineX));
          const vI2: VertInf = new VertInf(router as any, dummyOrthogShapeID,
            new Point(lineX, maxShape));
          line.vertInfs.insert(vI2);
        }
      }
    } else if (e.type === ConnPoint) {
      const centreVert: VertInf = e.v.c;
      const cp: Point = centreVert.point;

      const minLimit: number = v.firstPointAbove(YDIM);
      const maxLimit: number = v.firstPointBelow(YDIM);

      if ((centreVert.visDirections & ConnDirUp) && (minLimit < cp.y)) {
        segments.insert(new LineSegment(minLimit, cp.y, e.pos));
      }
      if ((centreVert.visDirections & ConnDirDown) && (cp.y < maxLimit)) {
        segments.insert(new LineSegment(cp.y, maxLimit, e.pos));
      }
    }
  }

  if (((pass === 3) && (e.type === Close)) ||
      ((pass === 2) && (e.type === ConnPoint))) {
    const l: Node | null = v.firstAbove;
    const r: Node | null = v.firstBelow;
    if (l !== null) l.firstBelow = v.firstBelow;
    if (r !== null) r.firstAbove = v.firstAbove;

    scanline.erase(v);
  }
}


// ===========================================================================
// fixConnectionPointVisibilityOnOutsideOfVisibilityGraph
// ===========================================================================

function fixConnectionPointVisibilityOnOutsideOfVisibilityGraph(
  events: Event[],
  totalEvents: number,
  addedVisibility: number,
): void {
  if (totalEvents > 0) {
    const firstPos: number = events[0].pos;
    let index: number = 0;
    while (index < totalEvents) {
      if (events[index].pos > firstPos) break;
      if (events[index].v.c) {
        events[index].v.c.visDirections |= addedVisibility;
      }
      index++;
    }
    index = 0;
    const lastPos: number = events[totalEvents - 1].pos;
    while (index < totalEvents) {
      const revIndex: number = totalEvents - 1 - index;
      if (events[revIndex].pos < lastPos) break;
      if (events[revIndex].v.c) {
        events[revIndex].v.c.visDirections |= addedVisibility;
      }
      index++;
    }
  }
}


// ===========================================================================
// generateStaticOrthogonalVisGraph
// ===========================================================================

export function generateStaticOrthogonalVisGraph(router: Router): void {
  const obstacles: Obstacle[] = router.m_obstacles;
  const n: number = obstacles.length;

  // Set up the events for the vertical sweep.
  const events: Event[] = [];

  for (let i = 0; i < n; i++) {
    const obstacle: Obstacle = obstacles[i];
    if (obstacle.isJunction && !obstacle.positionFixed!()) {
      continue;
    }
    const bbox = obstacle.routingBox();
    const midX: number = bbox.min.x + ((bbox.max.x - bbox.min.x) / 2);
    const v: Node = Node.fromObstacle(obstacle, midX);
    events.push(new Event(Open, v, bbox.min.y));
    events.push(new Event(Close, v, bbox.max.y));
  }

  for (let curr: VertInf | null = router.vertices.connsBegin();
       curr && curr !== router.vertices.shapesBegin();
       curr = curr.lstNext) {
    if (curr.visDirections === ConnDirNone) {
      continue;
    }
    const point: Point = curr.point;
    const v: Node = Node.fromVertInf(curr, point.x);
    events.push(new Event(ConnPoint, v, point.y));
  }

  let totalEvents: number = events.length;
  events.sort(compareEvents);

  fixConnectionPointVisibilityOnOutsideOfVisibilityGraph(events, totalEvents,
    (ConnDirLeft | ConnDirRight));

  // Process the vertical sweep -- creating candidate horizontal edges.
  const segments = new SegmentListWrapper();
  const scanline = new VisNodeSet();
  let thisPos: number = (totalEvents > 0) ? events[0].pos : 0;
  let posStartIndex: number = 0;
  let posFinishIndex: number = 0;

  for (let i = 0; i <= totalEvents; ++i) {
    if (router.performContinuationCheck) {
      router.performContinuationCheck('OrthogonalVisibilityGraphScanX', i, totalEvents);
    }

    if ((i === totalEvents) || (events[i].pos !== thisPos)) {
      posFinishIndex = i;
      for (let pass = 2; pass <= 3; ++pass) {
        for (let j: number = posStartIndex; j < posFinishIndex; ++j) {
          processEventVert(router, scanline, segments, events[j], pass);
        }
      }

      if (i === totalEvents) break;

      thisPos = events[i].pos;
      posStartIndex = i;
    }

    processEventVert(router, scanline, segments, events[i], 1);
  }
  console.assert(scanline.size() === 0);

  segments.list().sort((a: LineSegment, b: LineSegment) => a.compareTo(b));

  // Set up the events for the horizontal sweep.
  const vertSegments = new SegmentListWrapper();
  const events2: Event[] = [];

  for (let i = 0; i < n; i++) {
    const obstacle: Obstacle = obstacles[i];
    if (obstacle.isJunction && !obstacle.positionFixed!()) {
      continue;
    }
    const bbox = obstacle.routingBox();
    const midY: number = bbox.min.y + ((bbox.max.y - bbox.min.y) / 2);
    const v: Node = Node.fromObstacle(obstacle, midY);
    events2.push(new Event(Open, v, bbox.min.x));
    events2.push(new Event(Close, v, bbox.max.x));
  }

  for (let curr: VertInf | null = router.vertices.connsBegin();
       curr && curr !== router.vertices.shapesBegin();
       curr = curr.lstNext) {
    if (curr.visDirections === ConnDirNone) {
      continue;
    }
    const point: Point = curr.point;
    const v: Node = Node.fromVertInf(curr, point.y);
    events2.push(new Event(ConnPoint, v, point.x));
  }

  totalEvents = events2.length;
  events2.sort(compareEvents);

  fixConnectionPointVisibilityOnOutsideOfVisibilityGraph(events2, totalEvents,
    (ConnDirUp | ConnDirDown));

  // Process the horizontal sweep -- creating vertical visibility edges.
  const scanline2 = new VisNodeSet();
  thisPos = (totalEvents > 0) ? events2[0].pos : 0;
  posStartIndex = 0;

  for (let i = 0; i <= totalEvents; ++i) {
    if (router.performContinuationCheck) {
      router.performContinuationCheck('OrthogonalVisibilityGraphScanY', i, totalEvents);
    }

    if ((i === totalEvents) || (events2[i].pos !== thisPos)) {
      posFinishIndex = i;
      for (let pass = 2; pass <= 3; ++pass) {
        for (let j: number = posStartIndex; j < posFinishIndex; ++j) {
          processEventHori(router, scanline2, vertSegments, events2[j], pass);
        }
      }

      // Process the merged line segments.
      vertSegments.list().sort((a: LineSegment, b: LineSegment) => a.compareTo(b));
      for (const curr of vertSegments.list()) {
        intersectSegments(router, segments.list(), curr);
      }
      vertSegments._list = [];

      if (i === totalEvents) break;

      thisPos = events2[i].pos;
      posStartIndex = i;
    }

    processEventHori(router, scanline2, vertSegments, events2[i], 1);
  }
  console.assert(scanline2.size() === 0);

  // Add portions of horizontal lines that are after the final vertical position.
  const segList: LineSegment[] = segments.list();
  for (let i = 0; i < segList.length; i++) {
    const horiLine: LineSegment = segList[i];
    horiLine.addEdgeHorizontal(router);
    horiLine.generateVisibilityEdgesFromBreakpointSet(router, XDIM);
  }
  segments._list = [];
}


// ===========================================================================
// Path Adjustment (Nudging) code
// ===========================================================================

function insideRectBounds(point: Point, rectBounds: [Point, Point]): boolean {
  const zero = new Point(0, 0);
  if (rectBounds[0].eq(zero) && rectBounds[1].eq(zero)) {
    return false;
  }
  for (let i = 0; i < 2; ++i) {
    if (point.dim(i) < rectBounds[0].dim(i)) return false;
    if (point.dim(i) > rectBounds[1].dim(i)) return false;
  }
  return true;
}


// ===========================================================================
// buildOrthogonalNudgingSegments
// ===========================================================================

function buildOrthogonalNudgingSegments(
  router: Router,
  dim: number,
  segmentList: NudgingShiftSegment[],
): void {
  if (router.routingParameter(segmentPenalty) === 0) {
    return;
  }

  const nudgeFinalSegments: boolean =
    router.routingOption(nudgeOrthogonalSegmentsConnectedToShapes);
  let shapeLimits: ([Point, Point] | null)[] = [];
  if (nudgeFinalSegments) {
    const obstacles: Obstacle[] = router.m_obstacles;
    const numObs: number = obstacles.length;
    shapeLimits = new Array(numObs);
    const zeroBufferDist: number = 0.0;

    for (let i = 0; i < numObs; i++) {
      const obs: Obstacle = obstacles[i];
      if (obs.isShape) {
        const bBox = obs.polygon().offsetBoundingBox(zeroBufferDist);
        shapeLimits[i] = [bBox.min, bBox.max];
      } else if (obs.isJunction) {
        const pos: Point = obs.position();
        shapeLimits[i] = [pos, pos];
      } else {
        shapeLimits[i] = [new Point(0, 0), new Point(0, 0)];
      }
    }
  }

  const altDim: number = (dim + 1) % 2;

  for (const conn of router.connRefs) {
    if (conn.routingType() !== ConnType_Orthogonal) {
      continue;
    }
    const displayRoute: DisplayRoute = conn.displayRoute();

    for (let i = 1; i < displayRoute.size(); ++i) {
      if (displayRoute.ps[i - 1].dim(dim) === displayRoute.ps[i].dim(dim)) {
        let indexLow: number = i - 1;
        let indexHigh: number = i;

        if (displayRoute.ps[i - 1].dim(altDim) === displayRoute.ps[i].dim(altDim)) {
          continue; // zero length segment
        } else if (displayRoute.ps[i - 1].dim(altDim) > displayRoute.ps[i].dim(altDim)) {
          indexLow = i;
          indexHigh = i - 1;
        }

        const checkpoints: Point[] = displayRoute.checkpointsOnSegment(i - 1);
        const prevCheckpoints: Point[] = displayRoute.checkpointsOnSegment(i - 2, -1);
        const nextCheckpoints: Point[] = displayRoute.checkpointsOnSegment(i, +1);
        const hasCheckpoints: boolean = (checkpoints.length > 0);

        if (hasCheckpoints && !nudgeFinalSegments) {
          segmentList.push(new NudgingShiftSegment(conn, indexLow, indexHigh, dim));
          continue;
        }

        const thisPos: number = displayRoute.ps[i].dim(dim);

        if ((i === 1) || ((i + 1) === displayRoute.size())) {
          // First or last segment of route.
          if (nudgeFinalSegments) {
            let minLim: number = -CHANNEL_MAX;
            let maxLim: number = CHANNEL_MAX;

            let endsInShapes: number = 0;
            for (let k = 0; k < shapeLimits.length; ++k) {
              if (!shapeLimits[k]) continue;
              const shapeMin: number = shapeLimits[k]![0].dim(dim);
              const shapeMax: number = shapeLimits[k]![1].dim(dim);
              if (insideRectBounds(displayRoute.ps[i - 1], shapeLimits[k]!)) {
                minLim = Math.max(minLim, shapeMin);
                maxLim = Math.min(maxLim, shapeMax);
                endsInShapes |= 0x01;
              }
              if (insideRectBounds(displayRoute.ps[i], shapeLimits[k]!)) {
                minLim = Math.max(minLim, shapeMin);
                maxLim = Math.min(maxLim, shapeMax);
                endsInShapes |= 0x10;
              }
            }

            if (endsInShapes === 0) {
              const pos: number = displayRoute.ps[i - 1].dim(dim);
              const freeConnBuffer: number = 15;
              minLim = Math.max(minLim, pos - freeConnBuffer);
              maxLim = Math.min(maxLim, pos + freeConnBuffer);
            }

            if ((minLim === maxLim) || (conn.hasFixedRoute && conn.hasFixedRoute())) {
              segmentList.push(new NudgingShiftSegment(conn, indexLow, indexHigh, dim));
            } else {
              const segment = new NudgingShiftSegment(
                conn, indexLow, indexHigh, false, false, dim, minLim, maxLim);
              segment.finalSegment = true;
              segment.endsInShape = (endsInShapes > 0);
              if ((displayRoute.size() === 2) && (endsInShapes === 0x11)) {
                segment.singleConnectedSegment = true;
              }
              segmentList.push(segment);
            }
          } else {
            segmentList.push(new NudgingShiftSegment(conn, indexLow, indexHigh, dim));
          }
          continue;
        }

        // The segment probably has space to be shifted.
        let minLim: number = -CHANNEL_MAX;
        let maxLim: number = CHANNEL_MAX;

        // Constrain by checkpoints on adjoining segments.
        for (let cp = 0; cp < nextCheckpoints.length; ++cp) {
          if (nextCheckpoints[cp].dim(dim) < thisPos) {
            minLim = Math.max(minLim, nextCheckpoints[cp].dim(dim));
          } else if (nextCheckpoints[cp].dim(dim) > thisPos) {
            maxLim = Math.min(maxLim, nextCheckpoints[cp].dim(dim));
          }
        }
        for (let cp = 0; cp < prevCheckpoints.length; ++cp) {
          if (prevCheckpoints[cp].dim(dim) < thisPos) {
            minLim = Math.max(minLim, prevCheckpoints[cp].dim(dim));
          } else if (prevCheckpoints[cp].dim(dim) > thisPos) {
            maxLim = Math.min(maxLim, prevCheckpoints[cp].dim(dim));
          }
        }

        let isSBend: boolean = false;
        let isZBend: boolean = false;

        if (checkpoints.length === 0) {
          const prevPos: number = displayRoute.ps[i - 2].dim(dim);
          const nextPos: number = displayRoute.ps[i + 1].dim(dim);
          if (((prevPos < thisPos) && (nextPos > thisPos)) ||
              ((prevPos > thisPos) && (nextPos < thisPos))) {
            if ((prevPos < thisPos) && (nextPos > thisPos)) {
              minLim = Math.max(minLim, prevPos);
              maxLim = Math.min(maxLim, nextPos);
              isZBend = true;
            } else {
              minLim = Math.max(minLim, nextPos);
              maxLim = Math.min(maxLim, prevPos);
              isSBend = true;
            }
          }
        }

        const nss = new NudgingShiftSegment(conn,
          indexLow, indexHigh, isSBend, isZBend, dim, minLim, maxLim);
        nss.checkpoints = checkpoints;
        segmentList.push(nss);
      }
    }
  }
}


// ===========================================================================
// CmpLineOrder
// ===========================================================================

class CmpLineOrder {
  orders: Map<string, PtOrder>;
  dimension: number;

  constructor(orders: Map<string, PtOrder>, dim: number) {
    this.orders = orders;
    this.dimension = dim;
  }

  compare(
    lhsSuper: NudgingShiftSegment,
    rhsSuper: NudgingShiftSegment,
    returnComparable: true,
  ): { lessThan: boolean; comparable: boolean };
  compare(
    lhsSuper: NudgingShiftSegment,
    rhsSuper: NudgingShiftSegment,
    returnComparable?: false,
  ): boolean;
  compare(
    lhsSuper: NudgingShiftSegment,
    rhsSuper: NudgingShiftSegment,
    returnComparable?: boolean,
  ): boolean | { lessThan: boolean; comparable: boolean } {
    const lhs: NudgingShiftSegment = lhsSuper;
    const rhs: NudgingShiftSegment = rhsSuper;
    const lhsLow: Point = lhs.lowPoint();
    const rhsLow: Point = rhs.lowPoint();
    const altDim: number = (this.dimension + 1) % 2;

    if (lhsLow.dim(this.dimension) !== rhsLow.dim(this.dimension)) {
      const result: boolean = lhsLow.dim(this.dimension) < rhsLow.dim(this.dimension);
      if (returnComparable) return { lessThan: result, comparable: true };
      return result;
    }

    let oneIsFixed: boolean = false;
    const lhsFO = lhs.fixedOrder();
    const rhsFO = rhs.fixedOrder();
    oneIsFixed = lhsFO.isFixed || rhsFO.isFixed;
    if (oneIsFixed && (lhsFO.order !== rhsFO.order)) {
      const result: boolean = lhsFO.order < rhsFO.order;
      if (returnComparable) return { lessThan: result, comparable: true };
      return result;
    }

    const lhsOrder: number = lhs.order();
    const rhsOrder: number = rhs.order();
    if (lhsOrder !== rhsOrder) {
      const result: boolean = lhsOrder < rhsOrder;
      if (returnComparable) return { lessThan: result, comparable: true };
      return result;
    }

    // Need to index using the original point into the map.
    const unchanged: Point = (lhsLow.dim(altDim) > rhsLow.dim(altDim)) ? lhsLow : rhsLow;
    const key: string = `${unchanged.x},${unchanged.y}`;
    const lowOrder: PtOrder | undefined = this.orders.get(key);

    if (!lowOrder) {
      if (returnComparable) return { lessThan: lhsLow.dim(altDim) < rhsLow.dim(altDim), comparable: false };
      return lhsLow.dim(altDim) < rhsLow.dim(altDim);
    }

    const lhsPos: number = lowOrder.positionFor(this.dimension, lhs.connRef);
    const rhsPos: number = lowOrder.positionFor(this.dimension, rhs.connRef);

    if ((lhsPos === -1) || (rhsPos === -1)) {
      if (returnComparable) return { lessThan: lhsLow.dim(altDim) < rhsLow.dim(altDim), comparable: false };
      return lhsLow.dim(altDim) < rhsLow.dim(altDim);
    }

    const result: boolean = lhsPos < rhsPos;
    if (returnComparable) return { lessThan: result, comparable: true };
    return result;
  }
}


// ===========================================================================
// linesort
// ===========================================================================

function linesort(
  nudgeFinalSegments: boolean,
  origList: NudgingShiftSegment[],
  comparison: CmpLineOrder,
): NudgingShiftSegment[] {
  // Merge end segments that should line up with other segments.
  if (nudgeFinalSegments) {
    for (let ci = 0; ci < origList.length; ci++) {
      for (let oi = 0; oi < origList.length;) {
        const currSeg: NudgingShiftSegment = origList[ci];
        const otherSeg: NudgingShiftSegment = origList[oi];
        if ((ci !== oi) && currSeg && otherSeg &&
            currSeg.shouldAlignWith(otherSeg, comparison.dimension)) {
          currSeg.mergeWith(otherSeg, comparison.dimension);
          origList.splice(oi, 1);
          if (oi < ci) ci--;
        } else {
          oi++;
        }
      }
    }
  }

  const resultList: NudgingShiftSegment[] = [];
  let origListSize: number = origList.length;
  let deferredN: number = 0;

  while (origList.length > 0) {
    const segment: NudgingShiftSegment = origList.shift()!;

    let allComparable: boolean = true;
    let insertIdx: number = resultList.length; // default: end

    for (let c = 0; c < resultList.length; c++) {
      const { lessThan, comparable } = comparison.compare(segment, resultList[c], true);
      allComparable = allComparable && comparable;
      if (comparable && lessThan) {
        insertIdx = c;
        break;
      }
    }

    if (resultList.length === 0 || allComparable || (deferredN >= origListSize)) {
      resultList.splice(insertIdx, 0, segment);
      deferredN = 0;
      origListSize = origList.length;
    } else {
      origList.push(segment);
      deferredN++;
    }
  }

  return resultList;
}


// ===========================================================================
// PotentialSegmentConstraint
// ===========================================================================

class PotentialSegmentConstraint {
  index1: number;
  index2: number;
  vs: Variable[];

  constructor(index1: number, index2: number, vs: Variable[]) {
    this.index1 = index1;
    this.index2 = index2;
    this.vs = vs;
  }

  sepDistance(): number {
    if (!this.stillValid()) return 0;
    return Math.abs(this.vs[this.index1].finalPosition -
                    this.vs[this.index2].finalPosition);
  }

  stillValid(): boolean {
    return (this.index1 !== this.index2);
  }

  rewriteIndex(oldIndex: number, newIndex: number): void {
    if (this.index1 === oldIndex) this.index1 = newIndex;
    if (this.index2 === oldIndex) this.index2 = newIndex;
  }
}


// ===========================================================================
// ImproveOrthogonalRoutes
// ===========================================================================

class ImproveOrthogonalRoutes {
  m_router: Router;
  m_point_orders: Map<string, PtOrder>;
  m_shared_path_connectors_with_common_endpoints: Set<string>;
  m_segment_list: NudgingShiftSegment[];

  constructor(router: Router) {
    this.m_router = router;
    this.m_point_orders = new Map();
    this.m_shared_path_connectors_with_common_endpoints = new Set();
    this.m_segment_list = [];
  }

  execute(): void {
    this.m_shared_path_connectors_with_common_endpoints.clear();

    // Simplify routes.
    this.simplifyOrthogonalRoutes();

    // Build checkpoint cache.
    buildConnectorRouteCheckpointCache(this.m_router);

    // Do Unifying first.
    if (this.m_router.routingOption(performUnifyingNudgingPreprocessingStep) &&
        (this.m_router.routingParameter(fixedSharedPathPenalty) === 0)) {
      for (let dimension = 0; dimension < 2; ++dimension) {
        const justUnifying: boolean = true;
        this.m_segment_list = [];
        buildOrthogonalNudgingSegments(this.m_router, dimension, this.m_segment_list);
        buildOrthogonalChannelInfo(this.m_router, dimension, this.m_segment_list);
        this.nudgeOrthogonalRoutes(dimension, justUnifying);
      }
    }

    // Do the Nudging and centring.
    for (let dimension = 0; dimension < 2; ++dimension) {
      this.m_point_orders.clear();
      this.buildOrthogonalNudgingOrderInfo();

      this.m_segment_list = [];
      buildOrthogonalNudgingSegments(this.m_router, dimension, this.m_segment_list);
      buildOrthogonalChannelInfo(this.m_router, dimension, this.m_segment_list);
      this.nudgeOrthogonalRoutes(dimension);
    }

    // Resimplify.
    this.simplifyOrthogonalRoutes();

    if (this.m_router.improveOrthogonalTopology) {
      this.m_router.improveOrthogonalTopology();
    }

    // Clear the segment-checkpoint cache.
    clearConnectorRouteCheckpointCache(this.m_router);
  }

  nudgeOrthogonalRoutes(dimension: number, justUnifying: boolean = false): void {
    const nudgeFinalSegments: boolean = this.m_router.routingOption(
      nudgeOrthogonalSegmentsConnectedToShapes);
    const nudgeSharedPathsWithCommonEnd: boolean = this.m_router.routingOption(
      nudgeSharedPathsWithCommonEndPoint);
    const baseSepDist: number = this.m_router.routingParameter(idealNudgingDistance);
    console.assert(baseSepDist >= 0);
    const reductionSteps: number = 10.0;

    const totalSegmentsToShift: number = this.m_segment_list.length;

    while (this.m_segment_list.length > 0) {
      if (this.m_router.performContinuationCheck) {
        const numShifted: number = totalSegmentsToShift - this.m_segment_list.length;
        this.m_router.performContinuationCheck(
          (dimension === XDIM) ? TransactionPhaseOrthogonalNudgingX :
                                  TransactionPhaseOrthogonalNudgingY,
          numShifted, totalSegmentsToShift);
      }

      // Take a reference segment and find all overlapping segments.
      const currentSegment: NudgingShiftSegment = this.m_segment_list[0];
      const currentRegion: NudgingShiftSegment[] = [currentSegment];
      this.m_segment_list.splice(0, 1);

      for (let ci = 0; ci < this.m_segment_list.length;) {
        let overlaps: boolean = false;
        for (const existing of currentRegion) {
          if (this.m_segment_list[ci].overlapsWith(existing, dimension)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) {
          currentRegion.push(this.m_segment_list[ci]);
          this.m_segment_list.splice(ci, 1);
          ci = 0; // restart from beginning
        } else {
          ci++;
        }
      }

      let sortedRegion: NudgingShiftSegment[] = currentRegion;
      if (!justUnifying) {
        const lineSortComp = new CmpLineOrder(this.m_point_orders, dimension);
        sortedRegion = linesort(nudgeFinalSegments, currentRegion, lineSortComp);
      }

      if (sortedRegion.length === 1) {
        if (sortedRegion[0].immovable() || justUnifying) {
          continue;
        }
      }

      // Process these segments.
      const freeIndexes: number[] = [];
      const vs: Variable[] = [];
      const cs: Constraint[] = [];
      const gapcs: Constraint[] = [];
      const prevVars: NudgingShiftSegment[] = [];
      let sepDist: number = baseSepDist;

      for (let si = 0; si < sortedRegion.length; si++) {
        const currSegment: NudgingShiftSegment = sortedRegion[si];

        currSegment.createSolverVariable(justUnifying);
        vs.push(currSegment.variable!);
        const index: number = vs.length - 1;

        if (justUnifying) {
          if (currSegment.variable!.weight === freeWeight) {
            freeIndexes.push(index);
          }
          prevVars.push(currSegment);
          continue;
        }

        // Constrain to channel boundary (left).
        if (!currSegment.fixed) {
          if (currSegment.minSpaceLimit > -CHANNEL_MAX) {
            vs.push(new Variable(channelLeftID, currSegment.minSpaceLimit, fixedWeight));
            cs.push(new Constraint(vs[vs.length - 1], vs[index], 0.0));
          }
        }

        // Constrain against previously seen segments.
        for (const prevSeg of prevVars) {
          const prevVar: Variable = prevSeg.variable!;

          if (currSegment.overlapsWith(prevSeg, dimension) &&
              (!(currSegment.fixed) || !(prevSeg.fixed))) {
            let thisSepDist: number = sepDist;
            let equality: boolean = false;

            if (currSegment.shouldAlignWith(prevSeg, dimension)) {
              thisSepDist = 0;
              equality = true;
            } else if (currSegment.canAlignWith(prevSeg, dimension)) {
              thisSepDist = 0;
            } else if (!nudgeSharedPathsWithCommonEnd) {
              const pairKey: string = new UnsignedPair(currSegment.connRef.id(), prevSeg.connRef.id()).key();
              if (this.m_shared_path_connectors_with_common_endpoints.has(pairKey)) {
                thisSepDist = 0;
                equality = true;
              }
            }

            const constraint = new Constraint(prevVar, vs[index], thisSepDist, equality);
            cs.push(constraint);
            if (thisSepDist) {
              gapcs.push(constraint);
            }
          }
        }

        // Constrain to channel boundary (right).
        if (!currSegment.fixed) {
          if (currSegment.maxSpaceLimit < CHANNEL_MAX) {
            vs.push(new Variable(channelRightID, currSegment.maxSpaceLimit, fixedWeight));
            cs.push(new Constraint(vs[index], vs[vs.length - 1], 0.0));
          }
        }

        prevVars.push(currSegment);
      }

      // Build potential constraints for unifying.
      let potentialConstraints: PotentialSegmentConstraint[] = [];
      if (justUnifying) {
        for (let ci = 0; ci < freeIndexes.length; ci++) {
          for (let cj: number = ci + 1; cj < freeIndexes.length; cj++) {
            potentialConstraints.push(
              new PotentialSegmentConstraint(freeIndexes[ci], freeIndexes[cj], vs));
          }
        }
      }

      // Solve iteratively.
      let justAddedConstraint: boolean = false;
      let satisfied: boolean;
      let unsatisfiedRanges: [number, number][] = [];

      do {
        const f = new IncSolver(vs, cs);
        f.solve();

        // Check if satisfied.
        satisfied = true;
        unsatisfiedRanges = [];

        for (let i = 0; i < vs.length; ++i) {
          if (vs[i].id !== freeSegmentID) {
            if (Math.abs(vs[i].finalPosition - vs[i].desiredPosition) > 0.0001) {
              satisfied = false;

              if (vs[i].id === channelLeftID) {
                if (unsatisfiedRanges.length === 0 ||
                    (unsatisfiedRanges[unsatisfiedRanges.length - 1][0] !==
                     unsatisfiedRanges[unsatisfiedRanges.length - 1][1])) {
                  unsatisfiedRanges.push([i, i + 1]);
                }
              } else if (vs[i].id === channelRightID) {
                if (unsatisfiedRanges.length === 0) {
                  console.assert(i > 0);
                  unsatisfiedRanges.push([i - 1, i]);
                } else {
                  unsatisfiedRanges[unsatisfiedRanges.length - 1][1] = i;
                }
              } else if (vs[i].id === fixedSegmentID) {
                if (unsatisfiedRanges.length === 0) {
                  unsatisfiedRanges.push([i, i]);
                } else {
                  unsatisfiedRanges[unsatisfiedRanges.length - 1][1] = i;
                }
              }
            }
          }
        }

        if (justUnifying) {
          if (justAddedConstraint) {
            console.assert(potentialConstraints.length > 0);
            if (!satisfied) {
              potentialConstraints.shift();
              cs.pop();
            } else {
              const pc: PotentialSegmentConstraint = potentialConstraints[0];
              for (const it of potentialConstraints) {
                it.rewriteIndex(pc.index1, pc.index2);
              }
              potentialConstraints.shift();
            }
          }

          potentialConstraints.sort((a: PotentialSegmentConstraint, b: PotentialSegmentConstraint) =>
            a.sepDistance() - b.sepDistance());
          justAddedConstraint = false;

          while (potentialConstraints.length > 0 &&
                 !potentialConstraints[0].stillValid()) {
            potentialConstraints.shift();
          }

          if (potentialConstraints.length > 0) {
            const pc: PotentialSegmentConstraint = potentialConstraints[0];
            console.assert(pc.index1 !== pc.index2);
            cs.push(new Constraint(vs[pc.index1], vs[pc.index2], 0, true));
            satisfied = false;
            justAddedConstraint = true;
          }
        } else {
          if (!satisfied) {
            console.assert(unsatisfiedRanges.length > 0);
            sepDist -= (baseSepDist / reductionSteps);

            // Rewrite gap constraints in unsatisfied ranges.
            let withinUnsatisfiedGroup: boolean = false;
            let rangeIdx: number = 0;
            for (const constraint of cs) {
              if (rangeIdx >= unsatisfiedRanges.length) break;
              const range: [number, number] = unsatisfiedRanges[rangeIdx];

              if (constraint.left === vs[range[0]]) {
                withinUnsatisfiedGroup = true;
              }
              if (withinUnsatisfiedGroup && (constraint.gap > 0)) {
                constraint.gap = sepDist;
              }
              if (constraint.right === vs[range[1]]) {
                withinUnsatisfiedGroup = false;
                rangeIdx++;
              }
            }
          }
        }
      } while (!satisfied && (sepDist > 0.0001));

      if (satisfied) {
        for (const seg of sortedRegion) {
          seg.updatePositionsFromSolver(justUnifying);
        }
      }
    }
  }

  simplifyOrthogonalRoutes(): void {
    for (const conn of this.m_router.connRefs) {
      if (conn.routingType() !== ConnType_Orthogonal) {
        continue;
      }
      conn.set_route(conn.displayRoute().simplify());
    }
  }

  buildOrthogonalNudgingOrderInfo(): void {
    this.simplifyOrthogonalRoutes();

    let buildSharedPathInfo: boolean = false;
    if (!this.m_router.routingOption(nudgeSharedPathsWithCommonEndPoint) &&
        this.m_shared_path_connectors_with_common_endpoints.size === 0) {
      buildSharedPathInfo = true;
    }

    const connRefs: ConnRef[] = [...this.m_router.connRefs];
    const connRoutes: DisplayRoute[] = connRefs.map((c: ConnRef) => c.displayRoute());

    // Do segment splitting.
    for (let ind1 = 0; ind1 < connRefs.length; ++ind1) {
      const conn: ConnRef = connRefs[ind1];
      if (conn.routingType() !== ConnType_Orthogonal) continue;

      for (let ind2 = 0; ind2 < connRefs.length; ++ind2) {
        if (ind1 === ind2) continue;
        const conn2: ConnRef = connRefs[ind2];
        if (conn2.routingType() !== ConnType_Orthogonal) continue;

        if (connRoutes[ind2].splitBranchingSegments) {
          connRoutes[ind2].splitBranchingSegments(true, connRoutes[ind1]);
        }
      }
    }

    for (let ind1 = 0; ind1 < connRefs.length; ++ind1) {
      const conn: ConnRef = connRefs[ind1];
      if (conn.routingType() !== ConnType_Orthogonal) continue;

      for (let ind2: number = ind1 + 1; ind2 < connRefs.length; ++ind2) {
        const conn2: ConnRef = connRefs[ind2];
        if (conn2.routingType() !== ConnType_Orthogonal) continue;

        const route: DisplayRoute = connRoutes[ind1];
        const route2: DisplayRoute = connRoutes[ind2];

        // ConnectorCrossings analysis.
        if ((conn as any).constructor.ConnectorCrossings || this.m_router.ConnectorCrossings) {
          const CrossingsClass: CrossingsConstructor =
            (conn as any).constructor.ConnectorCrossings || this.m_router.ConnectorCrossings!;
          const cross: ConnectorCrossings = new CrossingsClass(route2, true, route, conn2, conn);
          cross.pointOrders = this.m_point_orders;
          let crossings: number = 0;
          let crossingFlags: number = 0;

          for (let i = 1; i < route.size(); ++i) {
            const finalSegment: boolean = ((i + 1) === route.size());
            cross.countForSegment(i, finalSegment);
            crossings += cross.crossingCount;
            crossingFlags |= cross.crossingFlags;
          }

          if (buildSharedPathInfo &&
              (crossingFlags & CROSSING_SHARES_PATH_AT_END)) {
            const pairKey: string = new UnsignedPair(conn.id(), conn2.id()).key();
            this.m_shared_path_connectors_with_common_endpoints.add(pairKey);
          }
        }
      }
    }
  }
}


// ===========================================================================
// improveOrthogonalRoutes  (main entry point)
// ===========================================================================

export function improveOrthogonalRoutes(router: Router): void {
  const improver = new ImproveOrthogonalRoutes(router);
  improver.execute();
}
