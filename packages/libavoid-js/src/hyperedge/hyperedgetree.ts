/*
 * libavoid-js - JavaScript port of libavoid
 * Original C++ library: Copyright (C) 2011-2014 Monash University
 * Original author: Michael Wybrow
 *
 * Port of hyperedgetree.h / hyperedgetree.cpp
 * Classes representing a hyperedge as a tree that certain transformations
 * can be performed on to improve hyperedge routing.
 */

import { Point } from '../core/geomtypes';

// ---------------------------------------------------------------------------
//  Local interfaces to avoid circular dependencies with Router, ConnRef,
//  JunctionRef, VertInf, and ConnEnd.
// ---------------------------------------------------------------------------

/** Minimal polygon-like display route. */
interface IDisplayRoute {
  ps: Point[];
  clear(): void;
  empty(): boolean;
}

/** Minimal ConnEnd (connector endpoint descriptor). */
interface IConnEnd {
  junction(): IJunctionRef | null;
  type(): number;
}

/** Pair returned by ConnRef.endpointConnEnds(). */
interface IConnEndPair {
  first: IConnEnd;
  second: IConnEnd;
}

/** Minimal VertInf (vertex info) -- identity-compared only. */
interface IVertInf {}

/** Minimal JunctionRef. */
interface IJunctionRef {
  positionFixed(): boolean;
  position(): Point;
}

/** Minimal ConnRef (connector reference). */
interface IConnRef {
  endpointConnEnds(): IConnEndPair;
  m_display_route: IDisplayRoute;
  m_dst_connend: IConnEnd | null;
  m_initialised: boolean;
  router(): IRouter;
  hasFixedRoute(): boolean;
  makeActive?(): void;
  updateEndPoint?(end: number, connEnd: IConnEnd): void;
  getConnEndForEndpointVertex?(vertex: IVertInf): IConnEnd | null;
}

/** Minimal Router. */
interface IRouter {
  _ConnRefClass?: new (router: IRouter) => IConnRef;
  _makeConnEnd?(junction: IJunctionRef): IConnEnd;
  removeObjectFromQueuedActions?(obj: unknown): void;
}

/** Opaque file/output sink handle. */
interface IOutputSink {}

// ---------------------------------------------------------------------------
//  Forward-reference helper: travellingForwardOnConnector
// ---------------------------------------------------------------------------

function travellingForwardOnConnector(conn: IConnRef, junction: IJunctionRef): boolean {
  const connEnds: IConnEndPair = conn.endpointConnEnds();
  if (connEnds.first.junction() === junction) {
    return true;
  }
  if (connEnds.second.junction() === junction) {
    return false;
  }
  // ConnEndJunction = 2, ConnEndEmpty = 3 (from constants)
  const ConnEndJunction = 2;
  const ConnEndEmpty = 3;
  if (
    connEnds.first.type() !== ConnEndJunction &&
    connEnds.first.type() !== ConnEndEmpty
  ) {
    return false;
  }
  if (
    connEnds.second.type() !== ConnEndJunction &&
    connEnds.second.type() !== ConnEndEmpty
  ) {
    return true;
  }
  return true;
}

// ---------------------------------------------------------------------------
//  HyperedgeTreeNode
// ---------------------------------------------------------------------------

export class HyperedgeTreeNode {
  public edges: HyperedgeTreeEdge[];
  public junction: IJunctionRef | null;
  public point: Point;
  public shiftSegmentNodeSet: OrderedHENodeSet | null;
  public finalVertex: IVertInf | null;
  public isConnectorSource: boolean;
  public isPinDummyEndpoint: boolean;
  public visited: boolean;
  public _uid?: number;

  constructor() {
    this.edges = [];
    this.junction = null;
    this.point = new Point(0, 0);
    this.shiftSegmentNodeSet = null;
    this.finalVertex = null;
    this.isConnectorSource = false;
    this.isPinDummyEndpoint = false;
    this.visited = false;
  }

  destroy(): void {
    if (this.shiftSegmentNodeSet) {
      this.shiftSegmentNodeSet.delete(this);
      this.shiftSegmentNodeSet = null;
    }
  }

  outputEdgesExcept(fp: IOutputSink, ignored: HyperedgeTreeEdge | null): void {
    for (const edge of this.edges) {
      if (edge !== ignored) {
        edge.outputNodesExcept(fp, this);
      }
    }
  }

  removeOtherJunctionsFrom(
    ignored: HyperedgeTreeEdge | null,
    treeRoots: Set<IJunctionRef>,
  ): boolean {
    let containsCycle = false;
    if (this.visited) {
      return true;
    }
    if (this.junction && ignored !== null) {
      treeRoots.delete(this.junction);
    }
    this.visited = true;
    for (const edge of this.edges) {
      if (edge !== ignored) {
        containsCycle = edge.removeOtherJunctionsFrom(this, treeRoots) || containsCycle;
      }
    }
    return containsCycle;
  }

  writeEdgesToConns(ignored: HyperedgeTreeEdge | null, pass: number): void {
    for (const edge of this.edges) {
      if (edge !== ignored) {
        edge.writeEdgesToConns(this, pass);
      }
    }
  }

  addConns(
    ignored: HyperedgeTreeEdge | null,
    router: IRouter,
    oldConns: IConnRef[],
    conn: IConnRef | null,
  ): void {
    console.assert(conn !== null || this.junction !== null);

    for (const edge of this.edges) {
      if (edge !== ignored) {
        let localConn: IConnRef | null = conn;
        if (this.junction) {
          localConn = new (router._ConnRefClass || (Object as unknown as new (r: IRouter) => IConnRef))(router);
          if (router.removeObjectFromQueuedActions) {
            router.removeObjectFromQueuedActions(localConn);
          }
          if (localConn.makeActive) localConn.makeActive();
          localConn.m_initialised = true;
          const connend: IConnEnd = router._makeConnEnd
            ? router._makeConnEnd(this.junction)
            : { junction: () => this.junction, type: () => 0 };
          if (localConn.updateEndPoint) {
            localConn.updateEndPoint(0, connend);
          }
        }
        edge.conn = localConn;
        edge.addConns(this, router, oldConns);
      }
    }
  }

  updateConnEnds(
    ignored: HyperedgeTreeEdge | null,
    forward: boolean,
    changedConns: IConnRef[],
  ): void {
    for (const edge of this.edges) {
      if (edge !== ignored) {
        if (this.junction) {
          forward = travellingForwardOnConnector(edge.conn!, this.junction);
          const existingEnds: IConnEndPair = edge.conn!.endpointConnEnds();
          const existingEnd: IConnEnd = forward ? existingEnds.first : existingEnds.second;
          if (existingEnd.junction() !== this.junction) {
            const end: number = forward ? 0 : 1;
            const edgeRouter: IRouter = edge.conn!.router();
            const connend: IConnEnd = edgeRouter._makeConnEnd
              ? edgeRouter._makeConnEnd(this.junction)
              : { junction: () => this.junction, type: () => 0 };
            edge.conn!.updateEndPoint!(end, connend);
            changedConns.push(edge.conn!);
          }
        }
        edge.updateConnEnds(this, forward, changedConns);
      }
    }
  }

  listJunctionsAndConnectors(
    ignored: HyperedgeTreeEdge | null,
    junctions: IJunctionRef[],
    connectors: IConnRef[],
  ): void {
    if (this.junction) {
      junctions.push(this.junction);
    }
    for (const edge of this.edges) {
      if (edge !== ignored) {
        edge.listJunctionsAndConnectors(this, junctions, connectors);
      }
    }
  }

  isImmovable(): boolean {
    if (this.edges.length === 1) return true;
    if (this.junction && this.junction.positionFixed()) return true;
    for (const edge of this.edges) {
      if (edge.hasFixedRoute) return true;
    }
    return false;
  }

  validateHyperedge(ignored: HyperedgeTreeEdge | null, dist: number): void {
    let newDist = dist;
    if (this.junction) {
      if (newDist !== 0) ++newDist;
      ++newDist;
    } else if (this.edges.length === 1) {
      ++newDist;
      ++newDist;
    }
    for (const edge of this.edges) {
      if (edge !== ignored) {
        edge.validateHyperedge(this, newDist);
      }
    }
  }

  deleteEdgesExcept(ignored: HyperedgeTreeEdge | null): void {
    for (const edge of this.edges) {
      if (edge !== ignored) {
        edge.deleteNodesExcept(this);
      }
    }
    this.edges = [];
  }

  disconnectEdge(edge: HyperedgeTreeEdge): void {
    this.edges = this.edges.filter((e) => e !== edge);
  }

  spliceEdgesFrom(oldNode: HyperedgeTreeNode): void {
    console.assert(oldNode !== this);
    while (oldNode.edges.length > 0) {
      oldNode.edges[0].replaceNode(oldNode, this);
    }
  }
}

// ---------------------------------------------------------------------------
//  HyperedgeTreeEdge
// ---------------------------------------------------------------------------

export class HyperedgeTreeEdge {
  public conn: IConnRef | null;
  public hasFixedRoute: boolean;
  public ends: { first: HyperedgeTreeNode | null; second: HyperedgeTreeNode | null };

  constructor(node1: HyperedgeTreeNode, node2: HyperedgeTreeNode, conn: IConnRef | null) {
    this.conn = conn;
    this.hasFixedRoute = false;
    if (conn) {
      this.hasFixedRoute = conn.hasFixedRoute();
    }
    this.ends = { first: node1, second: node2 };
    node1.edges.push(this);
    node2.edges.push(this);
  }

  followFrom(from: HyperedgeTreeNode): HyperedgeTreeNode {
    return this.ends.first === from ? this.ends.second! : this.ends.first!;
  }

  zeroLength(): boolean {
    const p1: Point = this.ends.first!.point;
    const p2: Point = this.ends.second!.point;
    return p1.x === p2.x && p1.y === p2.y;
  }

  hasOrientation(dimension: number): boolean {
    return (
      this.ends.first!.point.dim(dimension) ===
      this.ends.second!.point.dim(dimension)
    );
  }

  replaceNode(oldNode: HyperedgeTreeNode, newNode: HyperedgeTreeNode): void {
    if (this.ends.first === oldNode) {
      oldNode.disconnectEdge(this);
      newNode.edges.push(this);
      this.ends.first = newNode;
    } else if (this.ends.second === oldNode) {
      oldNode.disconnectEdge(this);
      newNode.edges.push(this);
      this.ends.second = newNode;
    }
  }

  splitFromNodeAtPoint(source: HyperedgeTreeNode, point: Point): void {
    if (this.ends.second === source) {
      const tmp = this.ends.second;
      this.ends.second = this.ends.first;
      this.ends.first = tmp;
    }
    console.assert(this.ends.first === source);

    const target: HyperedgeTreeNode = this.ends.second!;

    const split = new HyperedgeTreeNode();
    split.point = new Point(point.x, point.y);

    new HyperedgeTreeEdge(split, target, this.conn);

    target.disconnectEdge(this);
    this.ends.second = split;
    split.edges.push(this);
  }

  disconnectEdge(): void {
    console.assert(this.ends.first !== null);
    console.assert(this.ends.second !== null);
    this.ends.first!.disconnectEdge(this);
    this.ends.second!.disconnectEdge(this);
    this.ends.first = null;
    this.ends.second = null;
  }

  writeEdgesToConns(ignored: HyperedgeTreeNode, pass: number): void {
    console.assert(ignored !== null);
    console.assert(this.ends.first !== null);
    console.assert(this.ends.second !== null);

    const prevNode: HyperedgeTreeNode =
      ignored === this.ends.first ? this.ends.first! : this.ends.second!;
    const nextNode: HyperedgeTreeNode =
      ignored === this.ends.first ? this.ends.second! : this.ends.first!;

    if (pass === 0) {
      this.conn!.m_display_route.clear();
    } else if (pass === 1) {
      if (this.conn!.m_display_route.empty()) {
        this.conn!.m_display_route.ps.push(
          new Point(prevNode.point.x, prevNode.point.y),
        );
      }
      this.conn!.m_display_route.ps.push(
        new Point(nextNode.point.x, nextNode.point.y),
      );

      const nextNodeEdges: number = nextNode.edges.length;
      if (nextNodeEdges !== 2) {
        let shouldReverse = false;
        if (nextNodeEdges === 1) {
          if (nextNode.isConnectorSource) {
            shouldReverse = true;
          }
          if (nextNode.isPinDummyEndpoint) {
            this.conn!.m_display_route.ps.pop();
            if (
              prevNode.point.x === nextNode.point.x &&
              prevNode.point.y === nextNode.point.y
            ) {
              this.conn!.m_display_route.ps.pop();
            }
          }
        } else {
          if (this.conn!.m_dst_connend) {
            const correctEndJunction: IJunctionRef | null = this.conn!.m_dst_connend.junction();
            if (nextNode.junction !== correctEndJunction) {
              shouldReverse = true;
            }
          }
        }
        if (shouldReverse) {
          this.conn!.m_display_route.ps.reverse();
        }
      }
    }

    nextNode.writeEdgesToConns(this, pass);
  }

  addConns(ignored: HyperedgeTreeNode, router: IRouter, oldConns: IConnRef[]): void {
    console.assert(this.conn !== null);
    let endNode: HyperedgeTreeNode | null = null;
    if (this.ends.first && this.ends.first !== ignored) {
      endNode = this.ends.first;
      this.ends.first.addConns(this, router, oldConns, this.conn);
    }
    if (this.ends.second && this.ends.second !== ignored) {
      endNode = this.ends.second;
      this.ends.second.addConns(this, router, oldConns, this.conn);
    }

    if (endNode!.finalVertex) {
      let connend: IConnEnd | null = null;
      let result = false;
      for (const oldConn of oldConns) {
        const found: IConnEnd | null = oldConn.getConnEndForEndpointVertex
          ? oldConn.getConnEndForEndpointVertex(endNode!.finalVertex!)
          : null;
        if (found) {
          connend = found;
          result = true;
          break;
        }
      }
      if (result && connend && this.conn!.updateEndPoint) {
        this.conn!.updateEndPoint!(1, connend);
      }
    } else if (endNode!.junction) {
      const connend: IConnEnd = router._makeConnEnd
        ? router._makeConnEnd(endNode!.junction)
        : { junction: () => endNode!.junction, type: () => 0 };
      if (this.conn!.updateEndPoint) {
        this.conn!.updateEndPoint!(1, connend);
      }
    }
  }

  updateConnEnds(
    ignored: HyperedgeTreeNode,
    forward: boolean,
    changedConns: IConnRef[],
  ): void {
    let endNode: HyperedgeTreeNode | null = null;
    if (this.ends.first && this.ends.first !== ignored) {
      endNode = this.ends.first;
      this.ends.first.updateConnEnds(this, forward, changedConns);
    }
    if (this.ends.second && this.ends.second !== ignored) {
      endNode = this.ends.second;
      this.ends.second.updateConnEnds(this, forward, changedConns);
    }

    if (endNode && endNode.junction) {
      const existingEnds: IConnEndPair = this.conn!.endpointConnEnds();
      const existingEnd: IConnEnd = forward ? existingEnds.second : existingEnds.first;
      if (existingEnd.junction() !== endNode.junction) {
        const connRouter: IRouter = this.conn!.router();
        const connend: IConnEnd = connRouter._makeConnEnd
          ? connRouter._makeConnEnd(endNode.junction)
          : { junction: () => endNode.junction, type: () => 0 };
        const end: number = forward ? 1 : 0;
        this.conn!.updateEndPoint!(end, connend);
        if (changedConns.length === 0 || changedConns[changedConns.length - 1] !== this.conn) {
          changedConns.push(this.conn!);
        }
      }
    }
  }

  listJunctionsAndConnectors(
    ignored: HyperedgeTreeNode,
    junctions: IJunctionRef[],
    connectors: IConnRef[],
  ): void {
    if (!connectors.includes(this.conn!)) {
      connectors.push(this.conn!);
    }

    if (this.ends.first !== ignored) {
      this.ends.first!.listJunctionsAndConnectors(this, junctions, connectors);
    } else if (this.ends.second !== ignored) {
      this.ends.second!.listJunctionsAndConnectors(this, junctions, connectors);
    }
  }

  validateHyperedge(ignored: HyperedgeTreeNode, dist: number): void {
    if (this.ends.first !== ignored) {
      this.ends.first!.validateHyperedge(this, dist);
    } else if (this.ends.second !== ignored) {
      this.ends.second!.validateHyperedge(this, dist);
    }
  }

  outputNodesExcept(fp: IOutputSink, ignored: HyperedgeTreeNode): void {
    if (this.ends.first !== ignored) {
      this.ends.first!.outputEdgesExcept(fp, this);
    }
    if (this.ends.second !== ignored) {
      this.ends.second!.outputEdgesExcept(fp, this);
    }
  }

  deleteNodesExcept(ignored: HyperedgeTreeNode): void {
    if (this.ends.first && this.ends.first !== ignored) {
      this.ends.first.deleteEdgesExcept(this);
    }
    this.ends.first = null;

    if (this.ends.second && this.ends.second !== ignored) {
      this.ends.second.deleteEdgesExcept(this);
    }
    this.ends.second = null;
  }

  removeOtherJunctionsFrom(
    ignored: HyperedgeTreeNode,
    treeRoots: Set<IJunctionRef>,
  ): boolean {
    let containsCycle = false;
    if (this.ends.first && this.ends.first !== ignored) {
      containsCycle =
        this.ends.first.removeOtherJunctionsFrom(this, treeRoots) || containsCycle;
    }
    if (this.ends.second && this.ends.second !== ignored) {
      containsCycle =
        this.ends.second.removeOtherJunctionsFrom(this, treeRoots) || containsCycle;
    }
    return containsCycle;
  }
}

// ---------------------------------------------------------------------------
//  CmpNodesInDim
// ---------------------------------------------------------------------------

export class CmpNodesInDim {
  public m_dimension: number;
  static _nextUid = 1;

  constructor(dim: number) {
    this.m_dimension = dim;
  }

  compare(lhs: HyperedgeTreeNode, rhs: HyperedgeTreeNode): number {
    const lVal: number = lhs.point.dim(this.m_dimension);
    const rVal: number = rhs.point.dim(this.m_dimension);
    if (lVal !== rVal) {
      return lVal - rVal;
    }
    if (lhs._uid === undefined) lhs._uid = CmpNodesInDim._nextUid++;
    if (rhs._uid === undefined) rhs._uid = CmpNodesInDim._nextUid++;
    return lhs._uid - rhs._uid;
  }
}

// ---------------------------------------------------------------------------
//  OrderedHENodeSet
// ---------------------------------------------------------------------------

export class OrderedHENodeSet {
  private _cmp: CmpNodesInDim;
  public _arr: HyperedgeTreeNode[];

  constructor(dim: number) {
    this._cmp = new CmpNodesInDim(dim);
    this._arr = [];
  }

  insert(node: HyperedgeTreeNode): void {
    const idx: number = this._findIndex(node);
    if (idx < this._arr.length && this._arr[idx] === node) return;
    let lo = 0;
    let hi: number = this._arr.length;
    while (lo < hi) {
      const mid: number = (lo + hi) >>> 1;
      if (this._cmp.compare(this._arr[mid], node) < 0) lo = mid + 1;
      else hi = mid;
    }
    this._arr.splice(lo, 0, node);
  }

  insertAll(nodes: Iterable<HyperedgeTreeNode>): void {
    for (const n of nodes) {
      this.insert(n);
    }
  }

  delete(node: HyperedgeTreeNode): void {
    const idx: number = this._arr.indexOf(node);
    if (idx !== -1) this._arr.splice(idx, 1);
  }

  clear(): void {
    this._arr = [];
  }

  get size(): number {
    return this._arr.length;
  }

  [Symbol.iterator](): IterableIterator<HyperedgeTreeNode> {
    return this._arr[Symbol.iterator]();
  }

  begin(): HyperedgeTreeNode {
    return this._arr[0];
  }

  rbegin(): HyperedgeTreeNode {
    return this._arr[this._arr.length - 1];
  }

  values(): IterableIterator<HyperedgeTreeNode> {
    return this._arr.values();
  }

  private _findIndex(node: HyperedgeTreeNode): number {
    return this._arr.indexOf(node);
  }
}
