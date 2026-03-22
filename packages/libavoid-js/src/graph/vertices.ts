/*
 * libavoid-js - Port of libavoid vertices
 * Original C++ library: Copyright (C) 2004-2013 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import {
  kUnassignedVertexNumber,
  ConnDirNone,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  ConnDirAll,
  XL_EDGE,
  XL_CONN,
  XH_EDGE,
  XH_CONN,
  YL_EDGE,
  YL_CONN,
  YH_EDGE,
  YH_CONN,
} from '../core/constants';

import { Point } from '../core/geomtypes';

import { segmentIntersect } from '../core/geometry';

// Forward-declare EdgeInf to avoid circular dependency.
// The actual EdgeInf class is in graph.ts.
import type { EdgeInf } from './graph';

/**
 * Router interface — use `any` to avoid circular dependency with Router class.
 * In practice this is the Router instance from the router module.
 */
type Router = any;

/**
 * Shared tree-root pointer object. In C++ this is VertInf** (a pointer-to-pointer).
 * In JS/TS we model it as a shared object so multiple VertInf instances can
 * share and mutate the same root reference.
 */
interface TreeRootPointer {
  value: VertInf | null;
  _isSPTF?: boolean;
}

// ---------------------------------------------------------------------------
// VertID
// ---------------------------------------------------------------------------

export class VertID {
  public objID: number;
  public vn: number;
  public props: number;

  /**
   * @param id  Object ID (default 0)
   * @param n   Vertex number (default 0)
   * @param p   VertIDProps bitmask (default 0)
   */
  constructor(id: number = 0, n: number = 0, p: number = 0) {
    this.objID = id;
    this.vn = n;
    this.props = p;
  }

  // --- static constants ---

  static get src(): number { return 1; }
  static get tar(): number { return 2; }

  // Property flags
  static get PROP_ConnPoint(): number      { return 1; }
  static get PROP_OrthShapeEdge(): number  { return 2; }
  static get PROP_ConnectionPin(): number  { return 4; }
  static get PROP_ConnCheckpoint(): number { return 8; }
  static get PROP_DummyPinHelper(): number { return 16; }

  // --- copy / assign helpers ---

  clone(): VertID {
    return new VertID(this.objID, this.vn, this.props);
  }

  assign(rhs: VertID): VertID {
    this.objID = rhs.objID;
    this.vn = rhs.vn;
    this.props = rhs.props;
    return this;
  }

  // --- comparison operators ---

  equals(rhs: VertID): boolean {
    return this.objID === rhs.objID && this.vn === rhs.vn;
  }

  notEquals(rhs: VertID): boolean {
    return this.objID !== rhs.objID || this.vn !== rhs.vn;
  }

  lessThan(rhs: VertID): boolean {
    if (this.objID < rhs.objID) return true;
    if (this.objID === rhs.objID && this.vn < rhs.vn) return true;
    return false;
  }

  // --- arithmetic operators ---

  add(rhs: number): VertID {
    return new VertID(this.objID, this.vn + rhs, this.props);
  }

  sub(rhs: number): VertID {
    return new VertID(this.objID, this.vn - rhs, this.props);
  }

  /** Post-increment (modifies in place, returns this). */
  postIncrement(): VertID {
    this.vn += 1;
    return this;
  }

  // --- property tests ---

  isOrthShapeEdge(): boolean {
    return (this.props & VertID.PROP_OrthShapeEdge) ? true : false;
  }

  isConnPt(): boolean {
    return (this.props & VertID.PROP_ConnPoint) ? true : false;
  }

  isConnectionPin(): boolean {
    return (this.props & VertID.PROP_ConnectionPin) ? true : false;
  }

  isConnCheckpoint(): boolean {
    return (this.props & VertID.PROP_ConnCheckpoint) ? true : false;
  }

  isDummyPinHelper(): boolean {
    return (this.props & VertID.PROP_DummyPinHelper) ? true : false;
  }

  // --- printing ---

  print(): void {
    console.log(`[${this.objID},${this.vn}, p=${this.props}]`);
  }

  db_print(): void {
    console.log(`[${this.objID},${this.vn}, p=${this.props}]`);
  }

  toString(): string {
    return `[${this.objID},${this.vn}]`;
  }
}


// Dummy IDs used for orthogonal visibility graph vertices.
export const dummyOrthogID: VertID = new VertID(0, 0);
export const dummyOrthogShapeID: VertID = new VertID(0, 0, VertID.PROP_OrthShapeEdge);


// ---------------------------------------------------------------------------
// VertInf  -- a vertex in the routing visibility graph
// ---------------------------------------------------------------------------

export class VertInf {
  public _router: Router;
  public id: VertID;
  public point: Point;
  public lstPrev: VertInf | null;
  public lstNext: VertInf | null;
  public shPrev: VertInf | null;
  public shNext: VertInf | null;

  // Visibility edge lists (arrays of EdgeInf references)
  public visList: EdgeInf[];
  public visListSize: number;
  public orthogVisList: EdgeInf[];
  public orthogVisListSize: number;
  public invisList: EdgeInf[];
  public invisListSize: number;

  public pathNext: VertInf | null;

  // MTST tree root bookkeeping
  public m_orthogonalPartner: VertInf | null;
  public m_treeRoot: TreeRootPointer | null;
  public sptfDist: number;

  public visDirections: number;
  public aStarDoneNodes: VertInf[];
  public aStarPendingNodes: VertInf[];
  public orthogVisPropFlags: number;

  /**
   * @param router       Router instance (or null)
   * @param vid          Vertex identifier
   * @param vpoint       Position
   * @param addToRouter  Whether to immediately add to router's vertex list
   */
  constructor(router: Router, vid: VertID, vpoint: Point, addToRouter: boolean = true) {
    this._router = router;
    this.id = vid.clone();
    this.point = vpoint.clone();
    this.lstPrev = null;
    this.lstNext = null;
    this.shPrev = null;
    this.shNext = null;

    // Visibility edge lists (arrays of EdgeInf references)
    this.visList = [];
    this.visListSize = 0;
    this.orthogVisList = [];
    this.orthogVisListSize = 0;
    this.invisList = [];
    this.invisListSize = 0;

    this.pathNext = null;

    // MTST tree root bookkeeping
    this.m_orthogonalPartner = null;
    this.m_treeRoot = null;
    this.sptfDist = 0;

    this.visDirections = ConnDirNone;
    this.aStarDoneNodes = [];
    this.aStarPendingNodes = [];
    this.orthogVisPropFlags = 0;

    // Stamp IDs from the original C++ into the point
    this.point.id = vid.objID;
    this.point.vn = vid.vn;

    if (addToRouter && router) {
      router.vertices.addVertex(this);
    }
  }

  // Destructor equivalent -- caller is responsible for ensuring orphaned() first.
  destroy(): void {
    console.assert(this.orphaned(), 'VertInf.destroy: vertex was not orphaned');
  }

  // ------------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------------

  Reset(vidOrPoint: VertID | Point, maybePoint?: Point): void {
    if (maybePoint !== undefined) {
      // Reset(vid, vpoint)
      const vid = vidOrPoint as VertID;
      const vpoint = maybePoint;
      this.id = vid.clone();
      this.point = vpoint.clone();
      this.point.id = this.id.objID;
      this.point.vn = this.id.vn;
    } else {
      // Reset(vpoint)
      const vpoint = vidOrPoint as Point;
      this.point = vpoint.clone();
      this.point.id = this.id.objID;
      this.point.vn = this.id.vn;
    }
  }

  // ------------------------------------------------------------------
  // Graph membership helpers
  // ------------------------------------------------------------------

  /** Returns true if this vertex is not involved in any (in)visibility graphs. */
  orphaned(): boolean {
    return (
      this.visList.length === 0 &&
      this.invisList.length === 0 &&
      this.orthogVisList.length === 0
    );
  }

  /**
   * Remove all edges touching this vertex from the graph.
   */
  removeFromGraph(isConnVert: boolean = true): void {
    if (isConnVert) {
      console.assert(this.id.isConnPt(), 'removeFromGraph: expected connector vertex');
    }

    // Remove each visibility edge
    while (this.visList.length > 0) {
      const edge: EdgeInf = this.visList[0];
      edge.alertConns();
      edge.destroy();  // C++ delete -- edge removes itself from both endpoints' lists
    }

    // Remove each orthogonal visibility edge
    while (this.orthogVisList.length > 0) {
      const edge: EdgeInf = this.orthogVisList[0];
      edge.alertConns();
      edge.destroy();
    }

    // Remove each invisibility edge
    while (this.invisList.length > 0) {
      const edge: EdgeInf = this.invisList[0];
      edge.destroy();
    }
  }

  /**
   * Make all edges touching this vertex inactive (but don't delete them).
   */
  orphan(): void {
    while (this.visList.length > 0) {
      this.visList[0].makeInactive();
    }
    while (this.orthogVisList.length > 0) {
      this.orthogVisList[0].makeInactive();
    }
    while (this.invisList.length > 0) {
      this.invisList[0].makeInactive();
    }
  }

  // ------------------------------------------------------------------
  // Neighbour query
  // ------------------------------------------------------------------

  /**
   * Checks if this vertex has the target as a visibility neighbour.
   * @returns The EdgeInf if found, else null
   */
  hasNeighbour(target: VertInf, orthogonal: boolean): EdgeInf | null {
    const visEdgeList: EdgeInf[] = orthogonal ? this.orthogVisList : this.visList;
    for (let i = 0; i < visEdgeList.length; i++) {
      if (visEdgeList[i].otherVert(this) === target) {
        return visEdgeList[i];
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Direction helpers
  // ------------------------------------------------------------------

  /**
   * Returns the direction of this vertex relative to the other vertex.
   * @returns ConnDirFlags bitmask
   */
  directionFrom(other: VertInf): number {
    const epsilon: number = 0.000001;
    const thisPoint: Point = this.point;
    const otherPoint: Point = other.point;
    const diff: Point = thisPoint.sub(otherPoint);

    let directions: number = ConnDirNone;
    if (diff.y > epsilon) {
      directions |= ConnDirUp;
    }
    if (diff.y < -epsilon) {
      directions |= ConnDirDown;
    }
    if (diff.x > epsilon) {
      directions |= ConnDirRight;
    }
    if (diff.x < -epsilon) {
      directions |= ConnDirLeft;
    }
    return directions;
  }

  /**
   * Mark visibility edges in invalid directions as disabled.
   * @param directions  ConnDirFlags bitmask
   */
  setVisibleDirections(directions: number): void {
    for (let i = 0; i < this.visList.length; i++) {
      const edge: EdgeInf = this.visList[i];
      if (directions === ConnDirAll) {
        edge.setDisabled(false);
      } else {
        const otherVert: VertInf = edge.otherVert(this);
        const direction: number = otherVert.directionFrom(this);
        const visible: boolean = (direction & directions) !== 0;
        edge.setDisabled(!visible);
      }
    }

    for (let i = 0; i < this.orthogVisList.length; i++) {
      const edge: EdgeInf = this.orthogVisList[i];
      if (directions === ConnDirAll) {
        edge.setDisabled(false);
      } else {
        const otherVert: VertInf = edge.otherVert(this);
        const direction: number = otherVert.directionFrom(this);
        const visible: boolean = (direction & directions) !== 0;
        edge.setDisabled(!visible);
      }
    }
  }

  // ------------------------------------------------------------------
  // Path tracing
  // ------------------------------------------------------------------

  /**
   * Number of points in the path from this vertex back to start,
   * or 0 if no path exists.
   */
  pathLeadsBackTo(start: VertInf): number {
    let pathlen: number = 1;
    let curr: VertInf | null = this;
    while (curr !== start) {
      if (pathlen > 1 && curr === this) {
        // Circular path -- not found.
        return 0;
      }
      pathlen++;
      if (curr === null) {
        return 0;
      }
      // Sanity check against infinite paths.
      console.assert(pathlen < 20000, 'pathLeadsBackTo: path appears infinite');
      curr = curr.pathNext;
    }
    return pathlen;
  }

  // ------------------------------------------------------------------
  // Tree root pointer helpers (used in MTST computation)
  //
  // In C++ these use VertInf** (a pointer-to-pointer). In JS we model
  // this as a shared object { value: VertInf|null } so that multiple
  // VertInf instances can share and mutate the same root reference.
  // ------------------------------------------------------------------

  /**
   * Allocate a new shared tree root pointer and set its value.
   */
  makeTreeRootPointer(root: VertInf): TreeRootPointer {
    this.m_treeRoot = { value: root };
    return this.m_treeRoot;
  }

  treeRoot(): VertInf | null {
    return this.m_treeRoot ? this.m_treeRoot.value : null;
  }

  treeRootPointer(): TreeRootPointer | null {
    return this.m_treeRoot;
  }

  clearTreeRootPointer(): void {
    this.m_treeRoot = null;
  }

  setTreeRootPointer(pointer: TreeRootPointer): void {
    this.m_treeRoot = pointer;
  }

  // ------------------------------------------------------------------
  // SPTF root -- reuses m_treeRoot but as a plain VertInf reference.
  // We store a wrapper so the type is consistent, but sptfRoot()
  // returns the VertInf directly.
  // ------------------------------------------------------------------

  setSPTFRoot(root: VertInf): void {
    // Store the root directly (not as a shared pointer).
    this.m_treeRoot = { value: root, _isSPTF: true };
  }

  sptfRoot(): VertInf | null {
    if (!this.m_treeRoot) return null;
    return this.m_treeRoot.value;
  }
}


// ---------------------------------------------------------------------------
// directVis -- checks if there is direct visibility between src and dst
// ---------------------------------------------------------------------------

export function directVis(src: VertInf, dst: VertInf): boolean {
  const ss: Set<number> = new Set();

  const p: Point = src.point;
  const q: Point = dst.point;

  const pID: VertID = src.id;
  const qID: VertID = dst.id;

  // Both vertices must belong to the same router.
  const router: Router = src._router;
  console.assert(router === dst._router, 'directVis: src and dst belong to different routers');

  const contains: Map<string, Set<number>> = router.contains; // Map<string, Set<number>>

  if (pID.isConnPt()) {
    const key: string = pID.toString();
    if (contains.has(key)) {
      for (const v of contains.get(key)!) {
        ss.add(v);
      }
    }
  }
  if (qID.isConnPt()) {
    const key: string = qID.toString();
    if (contains.has(key)) {
      for (const v of contains.get(key)!) {
        ss.add(v);
      }
    }
  }

  const endVert: VertInf | null = router.vertices.end();
  for (let k: VertInf | null = router.vertices.shapesBegin(); k !== endVert; k = k!.lstNext) {
    if (!ss.has(k!.id.objID)) {
      if (segmentIntersect(p, q, k!.point, k!.shNext!.point)) {
        return false;
      }
    }
  }
  return true;
}


// ---------------------------------------------------------------------------
// VertInfList -- linked list of all vertices in a router instance.
//
// Connector endpoints are listed first, then shape vertices.
// Dummy vertices inserted for orthogonal routing are classed as shape
// vertices but carry VertID(0, 0).
// ---------------------------------------------------------------------------

export class VertInfList {
  public _firstShapeVert: VertInf | null;
  public _firstConnVert: VertInf | null;
  public _lastShapeVert: VertInf | null;
  public _lastConnVert: VertInf | null;
  public _shapeVertices: number;
  public _connVertices: number;

  constructor() {
    this._firstShapeVert = null;
    this._firstConnVert = null;
    this._lastShapeVert = null;
    this._lastConnVert = null;
    this._shapeVertices = 0;
    this._connVertices = 0;
  }

  // Internal consistency check (debug only).
  _checkConditions(): void {
    console.assert(
      (!this._firstConnVert && this._connVertices === 0) ||
      (this._firstConnVert !== null && this._firstConnVert.lstPrev === null && this._connVertices > 0)
    );
    console.assert(
      (!this._firstShapeVert && this._shapeVertices === 0) ||
      (this._firstShapeVert !== null && this._firstShapeVert.lstPrev === null && this._shapeVertices > 0)
    );
    console.assert(!this._lastShapeVert || this._lastShapeVert.lstNext === null);
    console.assert(!this._lastConnVert || this._lastConnVert.lstNext === this._firstShapeVert);
    console.assert(
      (!this._firstConnVert && !this._lastConnVert) ||
      (this._firstConnVert !== null && this._lastConnVert !== null)
    );
    console.assert(
      (!this._firstShapeVert && !this._lastShapeVert) ||
      (this._firstShapeVert !== null && this._lastShapeVert !== null)
    );
    console.assert(!this._firstShapeVert || !this._firstShapeVert.id.isConnPt());
    console.assert(!this._lastShapeVert || !this._lastShapeVert.id.isConnPt());
    console.assert(!this._firstConnVert || this._firstConnVert.id.isConnPt());
    console.assert(!this._lastConnVert || this._lastConnVert.id.isConnPt());
  }

  /**
   * Add a vertex to the list.
   * Connector vertices go to the front; shape vertices go to the back.
   */
  addVertex(vert: VertInf): void {
    this._checkConditions();
    console.assert(vert.lstPrev === null);
    console.assert(vert.lstNext === null);

    if (vert.id.isConnPt()) {
      // --- Connector vertex ---
      if (this._firstConnVert) {
        // Join with previous front
        vert.lstNext = this._firstConnVert;
        this._firstConnVert.lstPrev = vert;

        // Make front
        this._firstConnVert = vert;
      } else {
        // Make front and back
        this._firstConnVert = vert;
        this._lastConnVert = vert;

        // Link to front of shapes list
        vert.lstNext = this._firstShapeVert;
      }
      this._connVertices++;
    } else {
      // --- Shape vertex ---
      if (this._lastShapeVert) {
        // Join with previous back
        vert.lstPrev = this._lastShapeVert;
        this._lastShapeVert.lstNext = vert;

        // Make back
        this._lastShapeVert = vert;
      } else {
        // Make first and last
        this._firstShapeVert = vert;
        this._lastShapeVert = vert;

        // Join with conns list
        if (this._lastConnVert) {
          console.assert(this._lastConnVert.lstNext === null);
          this._lastConnVert.lstNext = vert;
        }
      }
      this._shapeVertices++;
    }
    this._checkConditions();
  }

  /**
   * Remove a vertex from the list.
   * @returns The vertex that followed the removed one.
   */
  removeVertex(vert: VertInf | null): VertInf | null {
    if (vert === null) {
      return null;
    }
    this._checkConditions();

    const following: VertInf | null = vert.lstNext;

    if (vert.id.isConnPt()) {
      // --- Connector vertex ---
      if (vert === this._firstConnVert) {
        if (vert === this._lastConnVert) {
          this._firstConnVert = null;
          this._lastConnVert = null;
        } else {
          // Set new first
          this._firstConnVert = this._firstConnVert.lstNext;
          if (this._firstConnVert) {
            this._firstConnVert.lstPrev = null;
          }
        }
      } else if (vert === this._lastConnVert) {
        // Set new last
        this._lastConnVert = this._lastConnVert.lstPrev;
        // Make last point to shapes list
        this._lastConnVert!.lstNext = this._firstShapeVert;
      } else {
        vert.lstNext!.lstPrev = vert.lstPrev;
        vert.lstPrev!.lstNext = vert.lstNext;
      }
      this._connVertices--;
    } else {
      // --- Shape vertex ---
      if (vert === this._lastShapeVert) {
        // Set new last
        this._lastShapeVert = this._lastShapeVert.lstPrev;

        if (vert === this._firstShapeVert) {
          this._firstShapeVert = null;
          if (this._lastConnVert) {
            this._lastConnVert.lstNext = null;
          }
        }

        if (this._lastShapeVert) {
          this._lastShapeVert.lstNext = null;
        }
      } else if (vert === this._firstShapeVert) {
        // Set new first
        this._firstShapeVert = this._firstShapeVert.lstNext;

        // Correct the last conn vertex
        if (this._lastConnVert) {
          this._lastConnVert.lstNext = this._firstShapeVert;
        }

        if (this._firstShapeVert) {
          this._firstShapeVert.lstPrev = null;
        }
      } else {
        vert.lstNext!.lstPrev = vert.lstPrev;
        vert.lstPrev!.lstNext = vert.lstNext;
      }
      this._shapeVertices--;
    }

    vert.lstPrev = null;
    vert.lstNext = null;

    this._checkConditions();

    return following;
  }

  /**
   * Find a vertex by its VertID.
   */
  getVertexByID(id: VertID): VertInf | null {
    const searchID: VertID = id.clone();
    if (searchID.vn === kUnassignedVertexNumber) {
      const topbit: number = (1 << 31) >>> 0; // unsigned top bit
      if ((searchID.objID & topbit) !== 0) {
        searchID.objID = searchID.objID & ~topbit;
        searchID.vn = VertID.src;
      } else {
        searchID.vn = VertID.tar;
      }
    }
    const last: VertInf | null = this.end();
    for (let curr: VertInf | null = this.connsBegin(); curr !== last; curr = curr!.lstNext) {
      if (curr!.id.equals(searchID)) {
        return curr;
      }
    }
    return null;
  }

  /**
   * Find a shape vertex by position.
   */
  getVertexByPos(p: Point): VertInf | null {
    const last: VertInf | null = this.end();
    for (let curr: VertInf | null = this.shapesBegin(); curr !== last; curr = curr!.lstNext) {
      if (curr!.point.eq(p)) {
        return curr;
      }
    }
    return null;
  }

  /** First shape vertex */
  shapesBegin(): VertInf | null {
    return this._firstShapeVert;
  }

  /** First vertex (connector or shape) */
  connsBegin(): VertInf | null {
    if (this._firstConnVert) {
      return this._firstConnVert;
    }
    // No connector vertices -- fall through to shapes.
    return this._firstShapeVert;
  }

  /** Sentinel value for end of list. */
  end(): VertInf | null {
    return null;
  }

  connsSize(): number {
    return this._connVertices;
  }

  shapesSize(): number {
    return this._shapeVertices;
  }
}
