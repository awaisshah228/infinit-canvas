/*
 * libavoid-js - JavaScript port of libavoid graph
 * Original C++ library: Copyright (C) 2004-2011 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import { Point } from '../core/geomtypes';
import {
  vecDir,
  euclideanDist,
  inValidRegion,
  segmentShapeIntersect,
} from '../core/geometry';
import { VertInf, VertID, dummyOrthogID } from './vertices';

/**
 * Router interface — use `any` to avoid circular dependency with Router class.
 */
type Router = any;

/**
 * Connection flag wrapper object, used to notify connectors when an edge changes.
 */
interface ConnFlag {
  value: boolean;
}

/**
 * Wrapper for the seenIntersectionAtEndpoint out-parameter used by
 * segmentShapeIntersect.
 */
interface SeenIntersectionRef {
  seenIntersectionAtEndpoint: boolean;
}

// ---------------------------------------------------------------------------
// Helper: orthogTurnOrder
// ---------------------------------------------------------------------------
// Gives an order value between 0 and 3 for the point c, given the last
// segment was from a to b.  Returns the following value:
//    0 : Point c is directly backwards from point b.
//    1 : Point c is a left-hand 90 degree turn.
//    2 : Point c is a right-hand 90 degree turn.
//    3 : Point c is straight ahead (collinear).
//    4 : Point c is not orthogonally positioned.
//
export function orthogTurnOrder(a: Point, b: Point, c: Point): number {
  if (((c.x !== b.x) && (c.y !== b.y)) || ((a.x !== b.x) && (a.y !== b.y))) {
    // Not orthogonally positioned.
    return 4;
  }

  const direction: number = vecDir(a, b, c);

  if (direction > 0) {
    // Counterclockwise := left
    return 1;
  } else if (direction < 0) {
    // Clockwise := right
    return 2;
  }

  if (b.x === c.x) {
    if (((a.y < b.y) && (c.y < b.y)) ||
        ((a.y > b.y) && (c.y > b.y))) {
      // Behind.
      return 0;
    }
  } else {
    if (((a.x < b.x) && (c.x < b.x)) ||
        ((a.x > b.x) && (c.x > b.x))) {
      // Behind.
      return 0;
    }
  }

  // Ahead.
  return 3;
}

// ---------------------------------------------------------------------------
// EdgeInf -- an edge in the visibility / routing graph
// ---------------------------------------------------------------------------
export class EdgeInf {
  public lstPrev: EdgeInf | null;
  public lstNext: EdgeInf | null;

  public _router: Router;
  public _blocker: number;
  public _added: boolean;
  public _visible: boolean;
  public _orthogonal: boolean;
  public _isHyperedgeSegment: boolean;
  public _disabled: boolean;
  public _vert1: VertInf;
  public _vert2: VertInf;
  // In the C++ code, m_pos1/m_pos2 are iterators into the per-vertex
  // EdgeInfList (std::list).  In JavaScript we store the index into the
  // vertex's array so we can splice-remove later.
  public _pos1: number;
  public _pos2: number;
  public _conns: ConnFlag[];
  public _dist: number;
  public _mtst_dist: number;

  constructor(v1: VertInf, v2: VertInf, orthogonal: boolean = false) {
    this.lstPrev = null;
    this.lstNext = null;

    this._router = null;
    this._blocker = 0;
    this._added = false;
    this._visible = false;
    this._orthogonal = orthogonal;
    this._isHyperedgeSegment = false;
    this._disabled = false;
    this._vert1 = v1;
    this._vert2 = v2;
    this._pos1 = -1;
    this._pos2 = -1;
    this._conns = [];
    this._dist = -1;
    this._mtst_dist = 0;

    // Not passed null values.
    console.assert(v1 != null && v2 != null);

    // We are in the same instance.
    console.assert(v1._router === v2._router);
    this._router = v1._router;
  }

  // Destructor equivalent -- call explicitly when removing an edge.
  destroy(): void {
    if (this._added) {
      this.makeInactive();
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  getDist(): number {
    return this._dist;
  }

  setDist(dist: number): void {
    if (this._added && !this._visible) {
      this.makeInactive();
      console.assert(!this._added);
    }
    if (!this._added) {
      this._visible = true;
      this.makeActive();
    }
    this._dist = dist;
    this._blocker = 0;
  }

  alertConns(): void {
    for (let i = 0; i < this._conns.length; i++) {
      this._conns[i].value = true;
    }
    this._conns = [];
  }

  addConn(flagObj: ConnFlag): void {
    this._conns.push(flagObj);
  }

  addCycleBlocker(): void {
    // Needs to be in invisibility graph.
    this.addBlocker(-1);
  }

  addBlocker(b: number): void {
    console.assert(this._router.InvisibilityGrph);

    if (this._added && this._visible) {
      this.makeInactive();
      console.assert(!this._added);
    }
    if (!this._added) {
      this._visible = false;
      this.makeActive();
    }
    this._dist = 0;
    this._blocker = b;
  }

  added(): boolean {
    return this._added;
  }

  isOrthogonal(): boolean {
    return ((this._vert1.point.x === this._vert2.point.x) ||
            (this._vert1.point.y === this._vert2.point.y));
  }

  isDummyConnection(): boolean {
    // This is a dummy edge from a shape centre to
    // a set of its ShapeConnectionPins.
    return ((this._vert1.id.isConnectionPin() && this._vert2.id.isConnPt()) ||
            (this._vert2.id.isConnectionPin() && this._vert1.id.isConnPt()));
  }

  isDisabled(): boolean {
    return this._disabled;
  }

  setDisabled(disabled: boolean): void {
    this._disabled = disabled;
  }

  isHyperedgeSegment(): boolean {
    return this._isHyperedgeSegment;
  }

  setHyperedgeSegment(hyperedge: boolean): void {
    this._isHyperedgeSegment = hyperedge;
  }

  mtstDist(): number {
    return this._mtst_dist;
  }

  setMtstDist(joinCost: number): void {
    this._mtst_dist = joinCost;
  }

  blocker(): number {
    return this._blocker;
  }

  // Returns a less-than operation for a set exploration order for orthogonal
  // searching.  Forward, then left, then right.  Or if there is no previous
  // point, then the order is north, east, south, then west.
  // Note: This method assumes the two Edges share a common point.
  rotationLessThan(lastV: VertInf | null, rhs: EdgeInf): boolean {
    if ((this._vert1 === rhs._vert1) && (this._vert2 === rhs._vert2)) {
      // Effectively the same visibility edge, so they are equal.
      return false;
    }

    let lhsV: VertInf | null = null;
    let rhsV: VertInf | null = null;
    let commonV: VertInf | null = null;

    // Determine common Point and the comparison point on the left- and
    // the right-hand-side.
    if (this._vert1 === rhs._vert1) {
      commonV = this._vert1;
      lhsV = this._vert2;
      rhsV = rhs._vert2;
    } else if (this._vert1 === rhs._vert2) {
      commonV = this._vert1;
      lhsV = this._vert2;
      rhsV = rhs._vert1;
    } else if (this._vert2 === rhs._vert1) {
      commonV = this._vert2;
      lhsV = this._vert1;
      rhsV = rhs._vert2;
    } else if (this._vert2 === rhs._vert2) {
      commonV = this._vert2;
      lhsV = this._vert1;
      rhsV = rhs._vert1;
    }

    const lhsPt: Point = lhsV!.point;
    const rhsPt: Point = rhsV!.point;
    const commonPt: Point = commonV!.point;

    // If no lastPt, use one directly to the left.
    const lastPt: Point = lastV ? lastV.point : new Point(commonPt.x - 10, commonPt.y);

    const lhsVal: number = orthogTurnOrder(lastPt, commonPt, lhsPt);
    const rhsVal: number = orthogTurnOrder(lastPt, commonPt, rhsPt);

    return lhsVal < rhsVal;
  }

  ids(): [VertID, VertID] {
    return [this._vert1.id, this._vert2.id];
  }

  points(): [Point, Point] {
    return [this._vert1.point, this._vert2.point];
  }

  db_print(): void {
    const id1: VertID = this._vert1.id;
    const id2: VertID = this._vert2.id;
    console.log(`Edge(${id1.objID}-${id1.vn}, ${id2.objID}-${id2.vn})`);
  }

  checkVis(): void {
    if (this._added && !this._visible) {
      // Checking visibility for existing invisibility edge.
      this.db_print();
    } else if (this._added && this._visible) {
      // Checking visibility for existing visibility edge.
      this.db_print();
    }

    let blocker: number = 0;
    let cone1: boolean = true;
    let cone2: boolean = true;

    const i: VertInf = this._vert1;
    const j: VertInf = this._vert2;
    const iID: VertID = i.id;
    const jID: VertID = j.id;
    const iPoint: Point = i.point;
    const jPoint: Point = j.point;

    this._router.st_checked_edges++;

    if (!(iID.isConnPt())) {
      cone1 = inValidRegion(this._router.IgnoreRegions, i.shPrev!.point,
        iPoint, i.shNext!.point, jPoint);
    } else if (this._router.IgnoreRegions === false) {
      // If ignoring regions then this case is already caught by
      // the invalid regions, so only check it when not ignoring regions.
      const ss: Set<number> = this._router.contains.get(iID.toString()) || new Set();

      if (!(jID.isConnPt()) && ss.has(jID.objID)) {
        // Don't even check this edge, it should be zero,
        // since a point in a shape can't see its corners.
        cone1 = false;
      }
    }

    if (cone1) {
      // If outside the first cone, don't even bother checking.
      if (!(jID.isConnPt())) {
        cone2 = inValidRegion(this._router.IgnoreRegions, j.shPrev!.point,
          jPoint, j.shNext!.point, iPoint);
      } else if (this._router.IgnoreRegions === false) {
        const ss: Set<number> = this._router.contains.get(jID.toString()) || new Set();

        if (!(iID.isConnPt()) && ss.has(iID.objID)) {
          cone2 = false;
        }
      }
    }

    if (cone1 && cone2 && ((blocker = this.firstBlocker()) === 0)) {
      // if i and j see each other, add edge
      const d: number = euclideanDist(iPoint, jPoint);
      this.setDist(d);
    } else if (this._router.InvisibilityGrph) {
      // if i and j can't see each other, add blank edge
      this.addBlocker(blocker);
    }
  }

  otherVert(vert: VertInf): VertInf {
    console.assert((vert === this._vert1) || (vert === this._vert2));
    return (vert === this._vert1) ? this._vert2 : this._vert1;
  }

  // -----------------------------------------------------------------------
  // Static methods
  // -----------------------------------------------------------------------

  static checkEdgeVisibility(i: VertInf, j: VertInf, knownNew: boolean = false): EdgeInf | null {
    // This is for polyline routing, so check we're not
    // considering orthogonal vertices.
    console.assert(!i.id.equals(dummyOrthogID));
    console.assert(!j.id.equals(dummyOrthogID));

    const router: Router = i._router;
    let edge: EdgeInf | null = null;

    if (knownNew) {
      console.assert(EdgeInf.existingEdge(i, j) === null);
      edge = new EdgeInf(i, j);
    } else {
      edge = EdgeInf.existingEdge(i, j);
      if (edge === null) {
        edge = new EdgeInf(i, j);
      }
    }
    edge.checkVis();
    if (!(edge._added) && !(router.InvisibilityGrph)) {
      // In JS we don't have real destructors; call destroy() for cleanup.
      edge.destroy();
      edge = null;
    }

    return edge;
  }

  static existingEdge(i: VertInf, j: VertInf): EdgeInf | null {
    let selected: VertInf;

    // Look through poly-line visibility edges.
    selected = (i.visListSize <= j.visListSize) ? i : j;
    const visList: EdgeInf[] = selected.visList;
    for (let idx = 0; idx < visList.length; idx++) {
      if (visList[idx].isBetween(i, j)) {
        return visList[idx];
      }
    }

    // Look through orthogonal visibility edges.
    selected = (i.orthogVisListSize <= j.orthogVisListSize) ? i : j;
    const orthogVisList: EdgeInf[] = selected.orthogVisList;
    for (let idx = 0; idx < orthogVisList.length; idx++) {
      if (orthogVisList[idx].isBetween(i, j)) {
        return orthogVisList[idx];
      }
    }

    // Look through poly-line invisibility edges.
    selected = (i.invisListSize <= j.invisListSize) ? i : j;
    const invisList: EdgeInf[] = selected.invisList;
    for (let idx = 0; idx < invisList.length; idx++) {
      if (invisList[idx].isBetween(i, j)) {
        return invisList[idx];
      }
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Private / internal methods
  // -----------------------------------------------------------------------

  makeActive(): void {
    console.assert(this._added === false);

    if (this._orthogonal) {
      console.assert(this._visible);
      this._router.visOrthogGraph.addEdge(this);
      this._vert1.orthogVisList.unshift(this);
      this._pos1 = 0;
      this._vert1.orthogVisListSize++;
      this._vert2.orthogVisList.unshift(this);
      this._pos2 = 0;
      this._vert2.orthogVisListSize++;
    } else {
      if (this._visible) {
        this._router.visGraph.addEdge(this);
        this._vert1.visList.unshift(this);
        this._pos1 = 0;
        this._vert1.visListSize++;
        this._vert2.visList.unshift(this);
        this._pos2 = 0;
        this._vert2.visListSize++;
      } else {
        // invisible
        this._router.invisGraph.addEdge(this);
        this._vert1.invisList.unshift(this);
        this._pos1 = 0;
        this._vert1.invisListSize++;
        this._vert2.invisList.unshift(this);
        this._pos2 = 0;
        this._vert2.invisListSize++;
      }
    }
    this._added = true;
  }

  makeInactive(): void {
    console.assert(this._added === true);

    if (this._orthogonal) {
      console.assert(this._visible);
      this._router.visOrthogGraph.removeEdge(this);
      _removeFromArray(this._vert1.orthogVisList, this);
      this._vert1.orthogVisListSize--;
      _removeFromArray(this._vert2.orthogVisList, this);
      this._vert2.orthogVisListSize--;
    } else {
      if (this._visible) {
        this._router.visGraph.removeEdge(this);
        _removeFromArray(this._vert1.visList, this);
        this._vert1.visListSize--;
        _removeFromArray(this._vert2.visList, this);
        this._vert2.visListSize--;
      } else {
        // invisible
        this._router.invisGraph.removeEdge(this);
        _removeFromArray(this._vert1.invisList, this);
        this._vert1.invisListSize--;
        _removeFromArray(this._vert2.invisList, this);
        this._vert2.invisListSize--;
      }
    }
    this._blocker = 0;
    this._conns = [];
    this._added = false;
  }

  firstBlocker(): number {
    const ss: Set<number> = new Set();

    const pti: Point = this._vert1.point;
    const ptj: Point = this._vert2.point;
    const iID: VertID = this._vert1.id;
    const jID: VertID = this._vert2.id;

    const contains: Map<string, Set<number>> = this._router.contains;
    if (iID.isConnPt()) {
      const s: Set<number> | undefined = contains.get(iID.toString());
      if (s) {
        for (const v of s) ss.add(v);
      }
    }
    if (jID.isConnPt()) {
      const s: Set<number> | undefined = contains.get(jID.toString());
      if (s) {
        for (const v of s) ss.add(v);
      }
    }

    const last: VertInf | null = this._router.vertices.end();
    let lastId: number = 0;
    let seenIntersectionAtEndpoint: SeenIntersectionRef = { seenIntersectionAtEndpoint: false };
    for (let k: VertInf | null = this._router.vertices.shapesBegin(); k !== last; ) {
      const kID: VertID = k!.id;
      if (kID.equals(dummyOrthogID)) {
        // Don't include orthogonal dummy vertices.
        k = k!.lstNext;
        continue;
      }
      if (kID.objID !== lastId) {
        if (ss.has(kID.objID)) {
          const shapeID: number = kID.objID;
          // One of the endpoints is inside this shape so ignore it.
          while ((k !== last) && (k!.id.objID === shapeID)) {
            // And skip the other vertices from this shape.
            k = k!.lstNext;
          }
          continue;
        }
        seenIntersectionAtEndpoint = { seenIntersectionAtEndpoint: false };
        lastId = kID.objID;
      }
      const kPoint: Point = k!.point;
      const kPrevPoint: Point = k!.shPrev!.point;
      if (segmentShapeIntersect(pti, ptj, kPrevPoint, kPoint,
            seenIntersectionAtEndpoint)) {
        return kID.objID;
      }
      k = k!.lstNext;
    }
    return 0;
  }

  isBetween(i: VertInf, j: VertInf): boolean {
    if (((i === this._vert1) && (j === this._vert2)) ||
        ((i === this._vert2) && (j === this._vert1))) {
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper to remove an element from an array by reference (replaces
// std::list::erase with an iterator).
// ---------------------------------------------------------------------------
function _removeFromArray<T>(arr: T[], item: T): void {
  const idx: number = arr.indexOf(item);
  if (idx !== -1) {
    arr.splice(idx, 1);
  }
}

// ---------------------------------------------------------------------------
// EdgeList -- doubly-linked list of EdgeInf
// ---------------------------------------------------------------------------
export class EdgeList {
  public _orthogonal: boolean;
  public _first_edge: EdgeInf | null;
  public _last_edge: EdgeInf | null;
  public _count: number;

  constructor(orthogonal: boolean = false) {
    this._orthogonal = orthogonal;
    this._first_edge = null;
    this._last_edge = null;
    this._count = 0;
  }

  // Destructor equivalent.
  destroy(): void {
    this.clear();
  }

  clear(): void {
    while (this._first_edge) {
      // The Edge destroy() results in removeEdge() being called
      // for this edge and _first_edge being updated to the subsequent edge
      // in the EdgeList.
      const edge: EdgeInf = this._first_edge;
      edge.destroy();
    }
    console.assert(this._count === 0);
    this._last_edge = null;
  }

  begin(): EdgeInf | null {
    return this._first_edge;
  }

  end(): EdgeInf | null {
    return null;
  }

  size(): number {
    return this._count;
  }

  addEdge(edge: EdgeInf): void {
    // Dummy connections for ShapeConnectionPins won't be orthogonal,
    // even in the orthogonal visibility graph.
    // (Skipping the assertion that used COLA_UNUSED(m_orthogonal))

    if (this._first_edge === null) {
      console.assert(this._last_edge === null);

      this._last_edge = edge;
      this._first_edge = edge;

      edge.lstPrev = null;
      edge.lstNext = null;
    } else {
      console.assert(this._last_edge !== null);

      this._last_edge!.lstNext = edge;
      edge.lstPrev = this._last_edge;

      this._last_edge = edge;

      edge.lstNext = null;
    }
    this._count++;
  }

  removeEdge(edge: EdgeInf): void {
    if (edge.lstPrev) {
      edge.lstPrev.lstNext = edge.lstNext;
    }
    if (edge.lstNext) {
      edge.lstNext.lstPrev = edge.lstPrev;
    }
    if (edge === this._last_edge) {
      this._last_edge = edge.lstPrev;
      if (edge === this._first_edge) {
        this._first_edge = null;
      }
    } else if (edge === this._first_edge) {
      this._first_edge = edge.lstNext;
    }

    edge.lstPrev = null;
    edge.lstNext = null;

    this._count--;
  }
}
