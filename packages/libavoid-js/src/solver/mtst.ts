/*
 * libavoid-js - Port of libavoid mtst (Minimum Terminal Spanning Tree)
 * Original C++ library: Copyright (C) 2011-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Sequential Construction of the Minimum Terminal Spanning Tree is an
 * extended version of the method described in Section IV.B of:
 *     Long, J., Zhou, H., Memik, S.O. (2008). EBOARST: An efficient
 *     edge-based obstacle-avoiding rectilinear Steiner tree construction
 *     algorithm. IEEE Trans. on Computer-Aided Design of Integrated
 *     Circuits and Systems 27(12), pages 2169--2182.
 *
 * Licensed under LGPL 2.1
 */

import { VertID, VertInf } from '../graph/vertices';
import { colinear } from '../core/geometry';

// Use `any` for Router to avoid circular deps
type Router = any;
import { EdgeInf } from '../graph/graph';
type IPoint = any;

// ---------------------------------------------------------------------------
// Heap comparison: vertex heap for extended Dijkstra's algorithm.
// ---------------------------------------------------------------------------

/**
 * Compare two VertInf by sptfDist (min-heap: higher dist = lower priority).
 */
export function heapCmpVertInf(a: VertInf, b: VertInf): boolean {
  return a.sptfDist > b.sptfDist;
}


// ---------------------------------------------------------------------------
// Heap comparison: bridging edge heap for extended Kruskal's algorithm.
// ---------------------------------------------------------------------------

/**
 * Compare two EdgeInf by mtstDist (min-heap: higher dist = lower priority).
 */
export function cmpEdgeInf(a: EdgeInf, b: EdgeInf): boolean {
  return a.mtstDist() > b.mtstDist();
}


// ---------------------------------------------------------------------------
// Binary heap helpers (min-heap using a "greater-than" comparator, mirroring
// the C++ std::make_heap / push_heap / pop_heap with a greater-than functor).
// ---------------------------------------------------------------------------

function heapPush<T>(arr: T[], item: T, cmp: (a: T, b: T) => boolean): void {
  arr.push(item);
  _siftUp(arr, arr.length - 1, cmp);
}

function heapPop<T>(arr: T[], cmp: (a: T, b: T) => boolean): T {
  const top: T = arr[0];
  const last: T | undefined = arr.pop();
  if (arr.length > 0 && last !== undefined) {
    arr[0] = last;
    _siftDown(arr, 0, cmp);
  }
  return top;
}

function heapMake<T>(arr: T[], cmp: (a: T, b: T) => boolean): void {
  for (let i = (arr.length >> 1) - 1; i >= 0; i--) {
    _siftDown(arr, i, cmp);
  }
}

function _siftUp<T>(arr: T[], i: number, cmp: (a: T, b: T) => boolean): void {
  while (i > 0) {
    const parent: number = (i - 1) >> 1;
    if (cmp(arr[parent], arr[i])) {
      const tmp: T = arr[parent];
      arr[parent] = arr[i];
      arr[i] = tmp;
      i = parent;
    } else {
      break;
    }
  }
}

function _siftDown<T>(arr: T[], i: number, cmp: (a: T, b: T) => boolean): void {
  const n: number = arr.length;
  while (true) {
    let smallest: number = i;
    const left: number = 2 * i + 1;
    const right: number = 2 * i + 2;
    if (left < n && cmp(arr[smallest], arr[left])) {
      smallest = left;
    }
    if (right < n && cmp(arr[smallest], arr[right])) {
      smallest = right;
    }
    if (smallest !== i) {
      const tmp: T = arr[i];
      arr[i] = arr[smallest];
      arr[smallest] = tmp;
      i = smallest;
    } else {
      break;
    }
  }
}


// ---------------------------------------------------------------------------
// Helper: delete a temporary vertex (mirror of C++ delete_vertex functor).
// ---------------------------------------------------------------------------

function deleteVertex(ptr: VertInf): void {
  ptr.removeFromGraph(false);
  // In JS we just let GC handle the rest; no explicit delete needed.
}


// ---------------------------------------------------------------------------
// MinimumTerminalSpanningTree
// ---------------------------------------------------------------------------

/**
 * Builds a minimum terminal spanning tree for a set of terminal vertices.
 * This class is not intended for public use; it is used by the hyperedge
 * routing code.
 */
export class MinimumTerminalSpanningTree {
  public router: Router;
  public isOrthogonal: boolean;
  public terminals: Set<VertInf>;
  public origTerminals: Set<VertInf>;
  public hyperedgeTreeJunctions: Map<VertInf, HyperedgeTreeNode> | null;

  public nodes: Map<VertInf, HyperedgeTreeNode>;
  public m_rootJunction: HyperedgeTreeNode | null;
  public bendPenalty: number;

  public allsets: Set<VertInf>[];

  public visitedVertices: VertInf[];
  public extraVertices: VertInf[];
  public unusedVertices: VertInf[];
  public rootVertexPointers: { value: VertInf | null }[];

  public vHeap: VertInf[];
  public beHeap: EdgeInf[];

  public dimensionChangeVertexID: VertID;

  constructor(
    router: Router,
    terminals: Set<VertInf>,
    hyperedgeTreeJunctions: Map<VertInf, HyperedgeTreeNode> | null = null,
  ) {
    this.router = router;
    this.isOrthogonal = true;
    this.terminals = new Set(terminals);
    this.origTerminals = new Set();
    this.hyperedgeTreeJunctions = hyperedgeTreeJunctions;

    this.nodes = new Map();
    this.m_rootJunction = null;
    this.bendPenalty = 2000;

    this.allsets = [];

    this.visitedVertices = [];
    this.extraVertices = [];
    this.unusedVertices = [];
    this.rootVertexPointers = [];

    this.vHeap = [];
    this.beHeap = [];

    this.dimensionChangeVertexID = new VertID(0, 42);
  }

  /**
   * Destructor equivalent: free the temporary hyperedge tree representation.
   */
  destroy(): void {
    if (this.m_rootJunction) {
      this.m_rootJunction.deleteEdgesExcept(null);
      this.m_rootJunction = null;
    }
  }

  rootJunction(): HyperedgeTreeNode | null {
    return this.m_rootJunction;
  }

  // -----------------------------------------------------------------------
  // Disjoint-set operations
  // -----------------------------------------------------------------------

  makeSet(vertex: VertInf): void {
    const newSet: Set<VertInf> = new Set();
    newSet.add(vertex);
    this.allsets.push(newSet);
  }

  findSet(vertex: VertInf): number {
    for (let i = 0; i < this.allsets.length; i++) {
      if (this.allsets[i].has(vertex)) {
        return i;
      }
    }
    return -1;
  }

  unionSets(s1: number, s2: number): void {
    if (s1 > s2) {
      const tmp: number = s1;
      s1 = s2;
      s2 = tmp;
    }
    const merged: Set<VertInf> = new Set(this.allsets[s1]);
    for (const v of this.allsets[s2]) {
      merged.add(v);
    }
    this.allsets.splice(s2, 1);
    this.allsets.splice(s1, 1);
    this.allsets.push(merged);
  }

  // -----------------------------------------------------------------------
  // Hyperedge tree node management
  // -----------------------------------------------------------------------

  addNode(vertex: VertInf, prevNode: HyperedgeTreeNode | null): HyperedgeTreeNode {
    let node: HyperedgeTreeNode | null = null;

    if (!this.nodes.has(vertex)) {
      const newNode: HyperedgeTreeNode = new HyperedgeTreeNode();
      newNode.point = vertex.point;
      this.nodes.set(vertex, newNode);
      node = newNode;
    } else {
      const junctionNode: HyperedgeTreeNode = this.nodes.get(vertex)!;
      if (junctionNode.junction === null) {
        junctionNode.junction = new JunctionRef(this.router, vertex.point);
        if (this.m_rootJunction === null) {
          this.m_rootJunction = junctionNode;
        }
        this.router.removeObjectFromQueuedActions(junctionNode.junction);
        junctionNode.junction.makeActive();
      }
      node = junctionNode;
    }

    if (prevNode) {
      new HyperedgeTreeEdge(prevNode, node, null);
    }

    return node;
  }

  // -----------------------------------------------------------------------
  // buildHyperedgeTreeToRoot
  // -----------------------------------------------------------------------

  buildHyperedgeTreeToRoot(
    currVert: VertInf | null,
    prevNode: HyperedgeTreeNode | null,
    prevVert: VertInf | null,
    markEdges: boolean = false,
  ): void {
    if (prevNode && prevNode.junction) {
      return;
    }

    console.assert(currVert !== null, 'buildHyperedgeTreeToRoot: currVert must not be null');

    while (currVert) {
      const currentNode: HyperedgeTreeNode = this.addNode(currVert, prevNode);

      if (markEdges) {
        let edge: EdgeInf | null = prevVert!.hasNeighbour(currVert, this.isOrthogonal);
        if (edge === null && currVert.id.equals(this.dimensionChangeVertexID)) {
          const modCurr: VertInf = currVert.id.equals(this.dimensionChangeVertexID)
            ? currVert.m_orthogonalPartner
            : currVert;
          const modPrev: VertInf = prevVert!.id.equals(this.dimensionChangeVertexID)
            ? prevVert!.m_orthogonalPartner
            : prevVert!;
          edge = modPrev.hasNeighbour(modCurr, this.isOrthogonal);
        }
        console.assert(edge !== null, 'buildHyperedgeTreeToRoot: edge not found');
        edge.setHyperedgeSegment(true);
      }

      if (currentNode.junction) {
        break;
      }

      if (currVert.pathNext === null) {
        currentNode.finalVertex = currVert;
      }

      if (currVert.id.isDummyPinHelper()) {
        currentNode.isPinDummyEndpoint = true;
      }

      prevNode = currentNode;
      prevVert = currVert;
      currVert = currVert.pathNext;
    }
  }

  // -----------------------------------------------------------------------
  // resetDistsForPath
  // -----------------------------------------------------------------------

  resetDistsForPath(
    currVert: VertInf,
    newRootVertPtr: { value: VertInf | null },
  ): { value: VertInf | null } | null {
    console.assert(currVert !== null, 'resetDistsForPath: currVert must not be null');

    while (currVert) {
      if (currVert.sptfDist === 0) {
        const oldTreeRootPtr: { value: VertInf | null } = currVert.treeRootPointer();
        this.rewriteRestOfHyperedge(currVert, newRootVertPtr);
        return oldTreeRootPtr;
      }

      currVert.sptfDist = 0;
      currVert.setTreeRootPointer(newRootVertPtr);

      this.terminals.add(currVert);

      currVert = currVert.pathNext;
    }

    console.assert(false, 'resetDistsForPath: should not reach end');
    return null;
  }

  // -----------------------------------------------------------------------
  // constructSequential
  // -----------------------------------------------------------------------

  constructSequential(): void {
    const vHeap: VertInf[] = [];
    const beHeap: EdgeInf[] = [];

    let endVert: VertInf = this.router.vertices.end();
    for (let k: VertInf = this.router.vertices.connsBegin(); k !== endVert; k = k.lstNext) {
      k.sptfDist = Number.MAX_VALUE;
      k.pathNext = null;
      k.setSPTFRoot(k);
    }
    for (const t of this.terminals) {
      t.sptfDist = 0;
      this.makeSet(t);
      vHeap.push(t);
    }
    heapMake(vHeap, heapCmpVertInf);

    while (vHeap.length > 0) {
      const u: VertInf = heapPop(vHeap, heapCmpVertInf);

      const visList: EdgeInf[] = (!this.isOrthogonal) ? u.visList : u.orthogVisList;
      let extraVertex: VertInf | null = null;
      for (let ei = 0; ei < visList.length; ei++) {
        const edgeObj: EdgeInf = visList[ei];
        const v: VertInf = edgeObj.otherVert(u);
        let edgeDist: number = edgeObj.getDist();

        if (v.id.isDummyPinHelper() || u.id.isDummyPinHelper()) {
          edgeDist = 1;
        }

        if (u.pathNext === v ||
            (u.pathNext && u.pathNext.pathNext === v)) {
          continue;
        }

        if (u.sptfRoot() === v.sptfRoot()) {
          continue;
        }

        const newCost: number = u.sptfDist + edgeDist;

        const freeConnection: boolean = this.connectsWithoutBend(u, v);
        if (!freeConnection) {
          console.assert(!u.id.equals(this.dimensionChangeVertexID));
          if (!extraVertex) {
            extraVertex = new VertInf(this.router, this.dimensionChangeVertexID,
                u.point, false);
            this.extraVertices.push(extraVertex);
            extraVertex.sptfDist = this.bendPenalty + u.sptfDist;
            extraVertex.pathNext = u;
            extraVertex.setSPTFRoot(u.sptfRoot());
            heapPush(vHeap, extraVertex, heapCmpVertInf);
          }
          const extraEdge: EdgeInf = new EdgeInf(extraVertex, v, this.isOrthogonal);
          extraEdge.setDist(edgeDist);
          continue;
        }

        if (newCost < v.sptfDist && v.sptfRoot() === v) {
          v.sptfDist = newCost;
          v.pathNext = u;
          v.setSPTFRoot(u.sptfRoot());
          heapPush(vHeap, v, heapCmpVertInf);
        } else {
          const secondJoinCost: number = this.connectsWithoutBend(v, u)
            ? 0.0
            : this.bendPenalty;

          const cost: number = edgeObj._vert1.sptfDist +
              edgeObj._vert2.sptfDist + secondJoinCost +
              edgeObj.getDist();
          edgeObj.setMtstDist(cost);
          beHeap.push(edgeObj);
        }
      }
    }
    heapMake(beHeap, cmpEdgeInf);

    while (beHeap.length > 0) {
      const e: EdgeInf = heapPop(beHeap, cmpEdgeInf);

      const s1: number = this.findSet(e._vert1.sptfRoot());
      const s2: number = this.findSet(e._vert2.sptfRoot());

      if (s1 === -1 || s2 === -1) {
        continue;
      }

      if (s1 !== s2) {
        this.unionSets(s1, s2);

        let node1: HyperedgeTreeNode | null = null;
        let node2: HyperedgeTreeNode | null = null;
        if (this.hyperedgeTreeJunctions) {
          node1 = this.addNode(e._vert1, null);
          node2 = this.addNode(e._vert2, node1);
        }

        this.buildHyperedgeTreeToRoot(e._vert1.pathNext, node1, e._vert1);
        this.buildHyperedgeTreeToRoot(e._vert2.pathNext, node2, e._vert2);
      }
    }

    for (const ev of this.extraVertices) {
      deleteVertex(ev);
    }
    this.extraVertices.length = 0;
    this.nodes.clear();
    this.allsets.length = 0;
  }

  // -----------------------------------------------------------------------
  // orthogonalPartner
  // -----------------------------------------------------------------------

  orthogonalPartner(vert: VertInf, penalty: number = 0): VertInf {
    if (penalty === 0) {
      penalty = this.bendPenalty;
    }
    if (vert.m_orthogonalPartner === null) {
      vert.m_orthogonalPartner = new VertInf(this.router,
          this.dimensionChangeVertexID, vert.point, false);
      vert.m_orthogonalPartner.m_orthogonalPartner = vert;
      this.extraVertices.push(vert.m_orthogonalPartner);
      const extraEdge: EdgeInf = new EdgeInf(vert.m_orthogonalPartner, vert,
          this.isOrthogonal);
      extraEdge.setDist(penalty);
    }
    return vert.m_orthogonalPartner;
  }

  // -----------------------------------------------------------------------
  // removeInvalidBridgingEdges
  // -----------------------------------------------------------------------

  removeInvalidBridgingEdges(): void {
    const beHeapNew: EdgeInf[] = [];
    for (let i = 0; i < this.beHeap.length; i++) {
      const e: EdgeInf = this.beHeap[i];

      const ends: { first: VertInf; second: VertInf } = this.realVerticesCountingPartners(e);
      const valid: boolean = (ends.first.treeRoot() !== ends.second.treeRoot()) &&
          ends.first.treeRoot() && ends.second.treeRoot() &&
          this.origTerminals.has(ends.first.treeRoot()) &&
          this.origTerminals.has(ends.second.treeRoot());
      if (!valid) {
        continue;
      }

      beHeapNew.push(e);
    }
    this.beHeap = beHeapNew;

    heapMake(this.beHeap, cmpEdgeInf);
  }

  // -----------------------------------------------------------------------
  // getOrthogonalEdgesFromVertex
  // -----------------------------------------------------------------------

  getOrthogonalEdgesFromVertex(
    vert: VertInf,
    prev: VertInf | null,
  ): Array<{ edge: EdgeInf; vert: VertInf }> {
    const edgeList: Array<{ edge: EdgeInf; vert: VertInf }> = [];

    console.assert(vert !== null, 'getOrthogonalEdgesFromVertex: vert must not be null');

    const penalty: number = (prev === null) ? 0.1 : 0;
    this.orthogonalPartner(vert, penalty);

    const isRealVert: boolean = !vert.id.equals(this.dimensionChangeVertexID);
    const realVert: VertInf = isRealVert ? vert : this.orthogonalPartner(vert);
    console.assert(!realVert.id.equals(this.dimensionChangeVertexID));

    const visList: EdgeInf[] = (!this.isOrthogonal) ? realVert.visList : realVert.orthogVisList;
    for (let ei = 0; ei < visList.length; ei++) {
      const edgeObj: EdgeInf = visList[ei];
      const other: VertInf = edgeObj.otherVert(realVert);

      if (other === this.orthogonalPartner(realVert)) {
        const partner: VertInf = isRealVert ? other : this.orthogonalPartner(other);
        if (partner !== prev) {
          edgeList.push({ edge: edgeObj, vert: partner });
        }
        continue;
      }

      const partner: VertInf = isRealVert ? other : this.orthogonalPartner(other);
      console.assert(partner !== null);

      if (other.point.y === realVert.point.y) {
        if (isRealVert && (prev !== partner)) {
          edgeList.push({ edge: edgeObj, vert: partner });
        }
      } else if (other.point.x === realVert.point.x) {
        if (!isRealVert && (prev !== partner)) {
          edgeList.push({ edge: edgeObj, vert: partner });
        }
      } else {
        console.warn('Warning, nonorthogonal edge.');
        edgeList.push({ edge: edgeObj, vert: other });
      }
    }

    return edgeList;
  }

  // -----------------------------------------------------------------------
  // constructInterleaved
  // -----------------------------------------------------------------------

  constructInterleaved(): void {
    this.origTerminals = new Set(this.terminals);

    const endVert: VertInf = this.router.vertices.end();
    for (let k: VertInf = this.router.vertices.connsBegin(); k !== endVert; k = k.lstNext) {
      k.sptfDist = Number.MAX_VALUE;
      k.pathNext = null;
      k.setTreeRootPointer(null);
      k.m_orthogonalPartner = null;
    }

    console.assert(this.rootVertexPointers.length === 0);
    for (const t of this.terminals) {
      t.sptfDist = 0;
      this.rootVertexPointers.push(t.makeTreeRootPointer(t));
      this.vHeap.push(t);
    }
    for (let t: any = this.router.visOrthogGraph.begin();
        t !== this.router.visOrthogGraph.end(); t = t.lstNext) {
      t.setHyperedgeSegment(false);
    }

    heapMake(this.vHeap, heapCmpVertInf);

    while (this.vHeap.length > 0) {
      const u: VertInf = this.vHeap[0];

      console.assert(u.treeRoot() !== null);
      console.assert(u.pathNext !== null || (u.sptfDist === 0));

      if (this.beHeap.length > 0 &&
          u.sptfDist >= (0.5 * this.beHeap[0].mtstDist())) {
        const e: EdgeInf = heapPop(this.beHeap, cmpEdgeInf);

        this.commitToBridgingEdge(e);

        if (this.origTerminals.size === 1) {
          break;
        }

        this.removeInvalidBridgingEdges();

        continue;
      }

      heapPop(this.vHeap, heapCmpVertInf);

      const edgeList: Array<{ edge: EdgeInf; vert: VertInf }> =
        this.getOrthogonalEdgesFromVertex(u, u.pathNext);
      for (let ei = 0; ei < edgeList.length; ei++) {
        const v: VertInf = edgeList[ei].vert;
        const e: EdgeInf = edgeList[ei].edge;
        let edgeDist: number = e.getDist();

        if (v.id.isDummyPinHelper() || u.id.isDummyPinHelper()) {
          edgeDist = 1;
        }

        if (u.treeRoot() === v.treeRoot()) {
          continue;
        }

        if (v.treeRoot() === null) {
          const newCost: number = u.sptfDist + edgeDist;

          v.sptfDist = newCost;
          v.pathNext = u;
          v.setTreeRootPointer(u.treeRootPointer());
          this.vHeap.push(v);
          heapMake(this.vHeap, heapCmpVertInf);
        } else {
          const cost: number = v.sptfDist + u.sptfDist + e.getDist();
          const found: boolean = this.beHeap.indexOf(e) !== -1;
          if (!found) {
            e.setMtstDist(cost);
            heapPush(this.beHeap, e, cmpEdgeInf);
          } else {
            if (cost < e.mtstDist()) {
              e.setMtstDist(cost);
              heapMake(this.beHeap, cmpEdgeInf);
            }
          }
        }
      }
    }
    console.assert(this.origTerminals.size === 1);

    this.rootVertexPointers.length = 0;

    for (const ev of this.extraVertices) {
      deleteVertex(ev);
    }
    this.extraVertices.length = 0;
  }

  // -----------------------------------------------------------------------
  // connectsWithoutBend
  // -----------------------------------------------------------------------

  connectsWithoutBend(oldLeaf: VertInf, newLeaf: VertInf): boolean {
    console.assert(this.isOrthogonal);

    if (oldLeaf.sptfDist === 0) {
      let hyperedgeConnection: boolean = false;
      const visList: EdgeInf[] = (!this.isOrthogonal)
        ? oldLeaf.visList
        : oldLeaf.orthogVisList;
      for (let ei = 0; ei < visList.length; ei++) {
        const edgeObj: EdgeInf = visList[ei];
        const other: VertInf = edgeObj.otherVert(oldLeaf);

        if (other === newLeaf) {
          continue;
        }

        if (other.point.eq(oldLeaf.point)) {
          continue;
        }

        if (edgeObj.isHyperedgeSegment()) {
          hyperedgeConnection = true;
          if (colinear(other.point, oldLeaf.point, newLeaf.point)) {
            return true;
          }
        }
      }
      return !hyperedgeConnection;
    } else {
      if (oldLeaf.pathNext) {
        return colinear(oldLeaf.pathNext.point, oldLeaf.point,
            newLeaf.point);
      } else {
        return true;
      }
    }
  }

  // -----------------------------------------------------------------------
  // rewriteRestOfHyperedge
  // -----------------------------------------------------------------------

  rewriteRestOfHyperedge(vert: VertInf, newTreeRootPtr: { value: VertInf | null }): void {
    vert.setTreeRootPointer(newTreeRootPtr);

    const edgeList: Array<{ edge: EdgeInf; vert: VertInf }> =
      this.getOrthogonalEdgesFromVertex(vert, null);
    for (let ei = 0; ei < edgeList.length; ei++) {
      const v: VertInf = edgeList[ei].vert;

      if (v.treeRootPointer() === newTreeRootPtr) {
        continue;
      }

      if (v.sptfDist === 0) {
        this.rewriteRestOfHyperedge(v, newTreeRootPtr);
      }
    }
  }

  // -----------------------------------------------------------------------
  // drawForest (debug)
  // -----------------------------------------------------------------------

  drawForest(vert: VertInf, prev: VertInf | null): void {
    if (prev === null) {
      console.assert(vert.treeRootPointer() !== null);
      console.assert(vert.treeRoot() !== null);
    }

    const edgeList: Array<{ edge: EdgeInf; vert: VertInf }> =
      this.getOrthogonalEdgesFromVertex(vert, prev);
    for (let ei = 0; ei < edgeList.length; ei++) {
      const v: VertInf = edgeList[ei].vert;

      if (v.sptfDist === 0) {
        continue;
      }

      if (v.treeRoot() === vert.treeRoot()) {
        if (v.pathNext === vert) {
          if (vert.point.neq(v.point)) {
            if (this.router.debugHandler && this.router.debugHandler()) {
              this.router.debugHandler().mtstGrowForestWithEdge(vert, v, false);
            }
          }
          this.drawForest(v, vert);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // realVerticesCountingPartners
  // -----------------------------------------------------------------------

  realVerticesCountingPartners(edge: EdgeInf): { first: VertInf; second: VertInf } {
    const v1: VertInf = edge._vert1;
    const v2: VertInf = edge._vert2;

    const realVertices: { first: VertInf; second: VertInf } = { first: v1, second: v2 };

    if (!v1.id.equals(this.dimensionChangeVertexID) &&
        !v2.id.equals(this.dimensionChangeVertexID) &&
        v1.point.neq(v2.point) &&
        v1.point.x === v2.point.x) {
      if (v1.m_orthogonalPartner) {
        realVertices.first = v1.m_orthogonalPartner;
      }
      if (v2.m_orthogonalPartner) {
        realVertices.second = v2.m_orthogonalPartner;
      }
    }

    return realVertices;
  }

  // -----------------------------------------------------------------------
  // commitToBridgingEdge
  // -----------------------------------------------------------------------

  commitToBridgingEdge(e: EdgeInf): void {
    const ends: { first: VertInf; second: VertInf } = this.realVerticesCountingPartners(e);
    const newRoot: VertInf = (ends.first.treeRoot() < ends.second.treeRoot())
      ? ends.first.treeRoot()
      : ends.second.treeRoot();
    const oldRoot: VertInf = (ends.first.treeRoot() >= ends.second.treeRoot())
      ? ends.first.treeRoot()
      : ends.second.treeRoot();

    let node1: HyperedgeTreeNode | null = null;
    let node2: HyperedgeTreeNode | null = null;

    const vert1: VertInf = ends.first;
    const vert2: VertInf = ends.second;
    if (this.hyperedgeTreeJunctions) {
      node1 = this.addNode(vert1, null);
      node2 = this.addNode(vert2, node1);
      e.setHyperedgeSegment(true);
    }

    this.buildHyperedgeTreeToRoot(vert1.pathNext, node1, vert1, true);
    this.buildHyperedgeTreeToRoot(vert2.pathNext, node2, vert2, true);

    const oldTreeRootPtr1: { value: VertInf | null } = vert1.treeRootPointer();
    const oldTreeRootPtr2: { value: VertInf | null } = vert2.treeRootPointer();
    this.origTerminals.delete(oldRoot);
    const newTreeRootPtr: { value: VertInf | null } = vert1.makeTreeRootPointer(newRoot);
    this.rootVertexPointers.push(newTreeRootPtr);
    vert2.setTreeRootPointer(newTreeRootPtr);

    console.assert(newRoot !== null);
    this.resetDistsForPath(vert1, newTreeRootPtr);
    this.resetDistsForPath(vert2, newTreeRootPtr);

    console.assert(oldTreeRootPtr1 !== null);
    console.assert(oldTreeRootPtr2 !== null);
    oldTreeRootPtr1.value = null;
    oldTreeRootPtr2.value = null;

    if (this.origTerminals.size === 1) {
      return;
    }

    const vHeapNew: VertInf[] = [];
    for (let i = 0; i < this.vHeap.length; i++) {
      const v: VertInf = this.vHeap[i];
      if (v.treeRoot() === null) {
        continue;
      }
      vHeapNew.push(v);
    }
    this.vHeap = vHeapNew;

    for (const v2 of this.terminals) {
      console.assert(v2.sptfDist === 0);
      this.vHeap.push(v2);
    }

    heapMake(this.vHeap, heapCmpVertInf);
  }

  // -----------------------------------------------------------------------
  // setDebuggingOutput (stub)
  // -----------------------------------------------------------------------

  setDebuggingOutput(_fp: any, _counter: number): void {
    // No-op in JS port. The C++ version writes SVG debug output to a FILE*.
  }
}


// ---------------------------------------------------------------------------
// Lightweight stand-in classes.
// These are used by MinimumTerminalSpanningTree internally. In a full port
// they would be imported from their own modules (hyperedgetree.js, junction.js).
// For now we provide minimal definitions so the MTST code is self-contained
// when those modules have not yet been ported.
// ---------------------------------------------------------------------------

/**
 * Minimal HyperedgeTreeNode. Replace with the real import once
 * hyperedgetree.js is ported.
 */
export class HyperedgeTreeNode {
  public point: IPoint | null;
  public junction: JunctionRef | null;
  public edges: HyperedgeTreeEdge[];
  public finalVertex: VertInf | null;
  public isPinDummyEndpoint: boolean;

  constructor() {
    this.point = null;
    this.junction = null;
    this.edges = [];
    this.finalVertex = null;
    this.isPinDummyEndpoint = false;
  }

  deleteEdgesExcept(keep: HyperedgeTreeEdge | null): void {
    for (const e of this.edges) {
      if (e === keep) continue;
      const otherNode: HyperedgeTreeNode = (e.node1 === this) ? e.node2 : e.node1;
      const idx: number = otherNode.edges.indexOf(e);
      if (idx !== -1) otherNode.edges.splice(idx, 1);
      otherNode.deleteEdgesExcept(e);
    }
    this.edges.length = 0;
  }
}

/**
 * Minimal HyperedgeTreeEdge. Replace with the real import once
 * hyperedgetree.js is ported.
 */
export class HyperedgeTreeEdge {
  public node1: HyperedgeTreeNode;
  public node2: HyperedgeTreeNode;
  public conn: any;

  constructor(node1: HyperedgeTreeNode, node2: HyperedgeTreeNode, conn: any) {
    this.node1 = node1;
    this.node2 = node2;
    this.conn = conn;
    if (node1) node1.edges.push(this);
    if (node2) node2.edges.push(this);
  }
}

/**
 * Minimal JunctionRef. Replace with the real import once junction.js is ported.
 */
export class JunctionRef {
  public router: Router;
  public point: IPoint;

  constructor(router: Router, point: IPoint) {
    this.router = router;
    this.point = point;
  }

  makeActive(): void {
    // Stub -- real implementation in junction.js
  }
}
