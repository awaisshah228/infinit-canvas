/*
 * libavoid-js - JavaScript port of libavoid
 * Original C++ library: Copyright (C) 2009-2014 Monash University
 * Original author: Michael Wybrow
 *
 * Port of hyperedgeimprover.h / hyperedgeimprover.cpp
 * HyperedgeImprover performs local improvement on hyperedge routing by
 * nudging shift-segments, removing zero-length edges, and moving
 * junctions along common edges.
 */

import { CHANNEL_MAX } from '../core/constants';
import { Point, Polygon } from '../core/geomtypes';
import { pointOnLine } from '../core/geometry';
import {
  HyperedgeTreeNode,
  HyperedgeTreeEdge,
  OrderedHENodeSet,
} from './hyperedgetree';
import { HyperedgeNewAndDeletedObjectLists } from './hyperedge';
import { JunctionRef } from './junction';

// ---------------------------------------------------------------------------
//  Local interfaces for types with circular dependencies
// ---------------------------------------------------------------------------

interface IConnEnd {
  m_conn_ref: IConnRef | null;
  junction(): JunctionRef | null;
  endpointType(): number;
}

interface IConnRef {
  assignConnectionPinVisibility?(visible: boolean): void;
  endpointAnchors(): { first: JunctionRef | IConnRef | null; second: JunctionRef | IConnRef | null };
  endpointConnEnds(): { first: IConnEnd; second: IConnEnd };
  m_src_vert: IVertInf | null;
  m_dst_vert: IVertInf | null;
  m_src_connend: IConnEnd | null;
  m_dst_connend: IConnEnd | null;
  m_display_route: Polygon;
  m_initialised: boolean;
  hasFixedRoute?(): boolean;
  makeActive?(): void;
  updateEndPoint?(end: number, connend: IConnEnd): void;
  router?(): IRouter;
  displayRoute(): Polygon;
  getConnEndForEndpointVertex?(vert: IVertInf): IConnEnd | null;
  conn?: IConnRef;
}

interface IVertInf {
  removeFromGraph?(): void;
}

interface IRouter {
  _ConnRefClass?: new (router: IRouter) => IConnRef;
  _makeConnEnd?(junction: JunctionRef): IConnEnd;
  deleteConnector?(conn: IConnRef): void;
  deleteJunction?(junc: JunctionRef): void;
  removeObjectFromQueuedActions?(obj: unknown): void;
  buildOrthogonalChannelInfo?(dimension: number, segments: HyperedgeShiftSegment[]): void;
  modifyConnector?(conn: IConnRef, endpointType: number, connEnd: IConnEnd): void;
  connRefs?: IConnRef[];
  routingParameter?(param: number): number;
}

/** Mutable wrapper for passing a version number by reference. */
interface VersionNumberRef {
  value: number;
}

// ---------------------------------------------------------------------------
//  HyperedgeShiftSegment
// ---------------------------------------------------------------------------

/**
 * A shift-segment represents a horizontal or vertical portion of a
 * hyperedge tree that can be nudged to reduce overall cost.
 *
 * In the C++ code this extends ShiftSegment.  Here we include the base
 * fields inline since the JS port does not yet have a separate ShiftSegment
 * base module.
 */
export class HyperedgeShiftSegment {
  dimension: number;
  minSpaceLimit: number;
  maxSpaceLimit: number;
  nodes: OrderedHENodeSet;
  isImmovable: boolean;
  _m_balance_count: number;
  _m_balance_count_set: boolean;
  _m_next_pos_lower: number;
  _m_next_pos_upper: number;
  _m_at_limit: boolean;

  constructor(n1: HyperedgeTreeNode, n2: HyperedgeTreeNode, dim: number, immovable: boolean) {
    // --- ShiftSegment base fields ---
    this.dimension = dim;
    this.minSpaceLimit = -CHANNEL_MAX;
    this.maxSpaceLimit = CHANNEL_MAX;

    // --- HyperedgeShiftSegment fields ---
    this.nodes = new OrderedHENodeSet((dim + 1) % 2);
    this.isImmovable = immovable;

    this._m_balance_count = 0;
    this._m_balance_count_set = false;
    this._m_next_pos_lower = -CHANNEL_MAX;
    this._m_next_pos_upper = CHANNEL_MAX;
    this._m_at_limit = false;

    this.nodes.insert(n1);
    this.nodes.insert(n2);
    n1.shiftSegmentNodeSet = this.nodes;
    n2.shiftSegmentNodeSet = this.nodes;
  }

  destroy(): void {
    for (const node of this.nodes) {
      node.shiftSegmentNodeSet = null;
    }
  }

  // ---- accessors expected by the scanline / channel-info machinery ----

  lowPoint(): Point {
    return this.nodes.begin().point;
  }

  highPoint(): Point {
    return this.nodes.rbegin().point;
  }

  // ---- balance / nudge methods ----

  /**
   * Counts the number of segments diverging on each side and stores the
   * result as the balance count.  A negative value means more segments on
   * the lower side; positive means more on the upper side; zero is balanced.
   */
  setBalanceCount(): void {
    const altDim: number = (this.dimension + 1) % 2;
    this._m_next_pos_lower = this.minSpaceLimit;
    this._m_next_pos_upper = this.maxSpaceLimit;
    this._m_balance_count = 0;

    if (this.isImmovable) {
      this._m_balance_count_set = true;
      return;
    }

    for (const node of this.nodes) {
      const currPoint: Point = node.point;
      for (const edge of node.edges) {
        const otherNode: HyperedgeTreeNode = edge.followFrom(node);
        const otherPoint: Point = otherNode.point;
        if (currPoint.dim(altDim) === otherPoint.dim(altDim)) {
          if (otherPoint.dim(this.dimension) < currPoint.dim(this.dimension)) {
            this._m_next_pos_lower = Math.max(
              this._m_next_pos_lower,
              otherPoint.dim(this.dimension)
            );
            --this._m_balance_count;
          } else if (otherPoint.dim(this.dimension) > currPoint.dim(this.dimension)) {
            this._m_next_pos_upper = Math.min(
              this._m_next_pos_upper,
              otherPoint.dim(this.dimension)
            );
            ++this._m_balance_count;
          }
        }
      }
    }
    this._m_balance_count_set = true;
  }

  balanceCount(): number {
    console.assert(this._m_balance_count_set);
    return this._m_balance_count;
  }

  /**
   * Adjusts the position of all nodes in this segment toward the side with
   * fewer diverging edges.
   */
  adjustPosition(): void {
    console.assert(this._m_balance_count_set);
    console.assert(this._m_balance_count !== 0);

    const newPos: number =
      this._m_balance_count < 0
        ? this._m_next_pos_lower
        : this._m_next_pos_upper;
    const limit: number =
      this._m_balance_count < 0
        ? this.minSpaceLimit
        : this.maxSpaceLimit;

    if (this.lowPoint().dim(this.dimension) === newPos) {
      this._m_at_limit = true;
    }

    for (const node of this.nodes) {
      node.point.setDim(this.dimension, newPos);
    }

    if (newPos === limit) {
      this._m_at_limit = true;
    }

    // Add nodes from collapsed segments in case they are not part of
    // a segment that will be merged.
    const toInsert: HyperedgeTreeNode[] = [];
    for (const node of this.nodes) {
      const currPoint: Point = node.point;
      for (const edge of node.edges) {
        const otherNode: HyperedgeTreeNode = edge.followFrom(node);
        const otherPoint: Point = otherNode.point;
        if (
          currPoint.x === otherPoint.x &&
          currPoint.y === otherPoint.y
        ) {
          toInsert.push(otherNode);
        }
      }
    }
    for (const n of toInsert) {
      this.nodes.insert(n);
      n.shiftSegmentNodeSet = this.nodes;
    }
  }

  /**
   * Returns true if this segment overlaps with rhs in the given dimension.
   */
  overlapsWith(rhs: HyperedgeShiftSegment, dim: number): boolean {
    const altDim: number = (dim + 1) % 2;
    const lp: Point = this.lowPoint();
    const hp: Point = this.highPoint();
    const rlp: Point = rhs.lowPoint();
    const rhp: Point = rhs.highPoint();
    if (
      lp.dim(altDim) <= rhp.dim(altDim) &&
      rlp.dim(altDim) <= hp.dim(altDim)
    ) {
      if (
        this.minSpaceLimit <= rhs.maxSpaceLimit &&
        rhs.minSpaceLimit <= this.maxSpaceLimit
      ) {
        return true;
      }
    }
    return false;
  }

  immovable(): boolean {
    return this.isImmovable;
  }

  settled(): boolean {
    return this.isImmovable || this._m_at_limit || this.balanceCount() === 0;
  }

  /**
   * Attempts to merge this segment with another overlapping/collinear one.
   * Returns true if the merge was performed.
   */
  mergesWith(other: HyperedgeShiftSegment): boolean {
    const altDim: number = (this.dimension + 1) % 2;
    const lp: Point = this.lowPoint();
    const hp: Point = this.highPoint();
    const olp: Point = other.lowPoint();
    const ohp: Point = other.highPoint();

    if (
      lp.dim(this.dimension) === olp.dim(this.dimension) &&
      lp.dim(altDim) <= ohp.dim(altDim) &&
      olp.dim(altDim) <= hp.dim(altDim)
    ) {
      this.isImmovable = this.isImmovable || other.isImmovable;
      this._m_at_limit = this._m_at_limit || other._m_at_limit;
      this.minSpaceLimit = Math.max(this.minSpaceLimit, other.minSpaceLimit);
      this.maxSpaceLimit = Math.min(this.maxSpaceLimit, other.maxSpaceLimit);
      this.nodes.insertAll(other.nodes);
      other.nodes.clear();
      for (const node of this.nodes) {
        node.shiftSegmentNodeSet = this.nodes;
      }
      this.setBalanceCount();
      return true;
    }
    this.setBalanceCount();
    return false;
  }
}

// ---------------------------------------------------------------------------
//  HyperedgeImprover
// ---------------------------------------------------------------------------

export class HyperedgeImprover {
  m_router: IRouter | null;
  m_hyperedge_tree_junctions: Map<JunctionRef, HyperedgeTreeNode>;
  m_hyperedge_tree_roots: Set<JunctionRef>;
  m_root_shift_segments: Map<JunctionRef, HyperedgeShiftSegment[]>;
  m_all_shift_segments: HyperedgeShiftSegment[];
  m_new_junctions: JunctionRef[];
  m_deleted_junctions: JunctionRef[];
  m_new_connectors: IConnRef[];
  m_deleted_connectors: IConnRef[];
  m_changed_connectors: IConnRef[];
  m_debug_count: number;
  m_can_make_major_changes: boolean;

  constructor() {
    this.m_router = null;
    this.m_hyperedge_tree_junctions = new Map();
    this.m_hyperedge_tree_roots = new Set();
    this.m_root_shift_segments = new Map();
    this.m_all_shift_segments = [];
    this.m_new_junctions = [];
    this.m_deleted_junctions = [];
    this.m_new_connectors = [];
    this.m_deleted_connectors = [];
    this.m_changed_connectors = [];
    this.m_debug_count = 0;
    this.m_can_make_major_changes = false;
  }

  /**
   * Resets all internal state.
   */
  clear(): void {
    this.m_hyperedge_tree_junctions.clear();
    this.m_hyperedge_tree_roots.clear();
    this.m_root_shift_segments.clear();
    this.m_all_shift_segments = [];
    this.m_new_junctions = [];
    this.m_deleted_junctions = [];
    this.m_new_connectors = [];
    this.m_deleted_connectors = [];
    this.m_changed_connectors = [];
    this.m_debug_count = 0;
  }

  /**
   * Sets the router instance that this improver will act upon.
   */
  setRouter(router: IRouter): void {
    this.m_router = router;
  }

  /**
   * Returns lists of junctions/connectors created and deleted during
   * hyperedge improvement.
   */
  newAndDeletedObjectLists(): HyperedgeNewAndDeletedObjectLists {
    const result: HyperedgeNewAndDeletedObjectLists = new HyperedgeNewAndDeletedObjectLists();
    result.newJunctionList = this.m_new_junctions;
    result.deletedJunctionList = this.m_deleted_junctions;
    result.newConnectorList = this.m_new_connectors;
    result.deletedConnectorList = this.m_deleted_connectors;
    result.changedConnectorList = this.m_changed_connectors;
    return result;
  }

  // ---- segment creation helpers ----

  /**
   * Creates shift segments for a given dimension, starting from a tree node.
   */
  createShiftSegmentsForDimensionExcludingNode(
    node: HyperedgeTreeNode,
    dim: number,
    ignore: HyperedgeTreeEdge | null,
    segments: HyperedgeShiftSegment[]
  ): void {
    for (const edge of node.edges) {
      if (edge !== ignore) {
        this.createShiftSegmentsForDimensionExcludingEdge(edge, dim, node, segments);
      }
    }
  }

  /**
   * Creates shift segments for a given dimension, starting from a tree edge.
   */
  createShiftSegmentsForDimensionExcludingEdge(
    edge: HyperedgeTreeEdge,
    dim: number,
    ignore: HyperedgeTreeNode | null,
    segments: HyperedgeShiftSegment[]
  ): void {
    if (edge.hasOrientation(dim) && !edge.zeroLength()) {
      const immovable: boolean =
        edge.ends.first!.isImmovable() || edge.ends.second!.isImmovable();
      const newSegment: HyperedgeShiftSegment = new HyperedgeShiftSegment(
        edge.ends.first!,
        edge.ends.second!,
        dim,
        immovable
      );
      segments.push(newSegment);
    }

    if (edge.ends.first && edge.ends.first !== ignore) {
      this.createShiftSegmentsForDimensionExcludingNode(
        edge.ends.first,
        dim,
        edge,
        segments
      );
    }
    if (edge.ends.second && edge.ends.second !== ignore) {
      this.createShiftSegmentsForDimensionExcludingNode(
        edge.ends.second,
        dim,
        edge,
        segments
      );
    }
  }

  /**
   * Merges collinear or overlapping shift segments.
   */
  mergeOverlappingSegments(segments: HyperedgeShiftSegment[]): void {
    for (let i: number = 0; i < segments.length; i++) {
      const edge1: HyperedgeShiftSegment = segments[i];
      for (let j: number = 0; j < segments.length; ) {
        if (j === i) {
          j++;
          continue;
        }
        const edge2: HyperedgeShiftSegment = segments[j];
        if (edge1.mergesWith(edge2)) {
          edge2.destroy();
          segments.splice(j, 1);
          if (j < i) i--;
        } else {
          j++;
        }
      }
    }
  }

  /**
   * Builds shift segments for all hyperedge tree roots in the given dimension.
   */
  buildHyperedgeSegments(dim: number): void {
    for (const root of this.m_hyperedge_tree_roots) {
      const segments: HyperedgeShiftSegment[] = [];
      this.m_root_shift_segments.set(root, segments);

      const node: HyperedgeTreeNode | undefined = this.m_hyperedge_tree_junctions.get(root);
      this.createShiftSegmentsForDimensionExcludingNode(node!, dim, null, segments);

      this.mergeOverlappingSegments(segments);

      this.m_all_shift_segments.push(...segments);
    }
  }

  // ---- zero-length edge removal ----

  /**
   * Top-level: removes zero-length edges from all hyperedge trees.
   */
  removeZeroLengthEdges(): void {
    for (const root of this.m_hyperedge_tree_roots) {
      const node: HyperedgeTreeNode | undefined = this.m_hyperedge_tree_junctions.get(root);
      this._removeZeroLengthEdgesFromNode(node!, null);
    }
  }

  /**
   * Traverses from an edge removing zero-length edges.
   */
  _removeZeroLengthEdgesFromEdge(self: HyperedgeTreeEdge, ignored: HyperedgeTreeNode | null): void {
    if (self.ends.first !== ignored) {
      this._removeZeroLengthEdgesFromNode(self.ends.first!, self);
    }
    if (self.ends.second !== ignored) {
      this._removeZeroLengthEdgesFromNode(self.ends.second!, self);
    }
  }

  /**
   * Traverses from a node removing zero-length edges.
   */
  _removeZeroLengthEdgesFromNode(self: HyperedgeTreeNode, ignored: HyperedgeTreeEdge | null): void {
    // Copy edges array since we may mutate during iteration.
    const edgesCopy: HyperedgeTreeEdge[] = [...self.edges];
    for (const edge of edgesCopy) {
      if (edge !== ignored) {
        if (!edge.hasFixedRoute && edge.zeroLength()) {
          const other: HyperedgeTreeNode = edge.followFrom(self);
          let target: HyperedgeTreeNode | null = null;
          let source: HyperedgeTreeNode | null = null;

          if (other.junction && !self.junction) {
            target = other;
            source = self;
          } else if (!other.junction && self.junction) {
            target = self;
            source = other;
          } else if (!other.junction && !self.junction) {
            target = self;
            source = other;
          } else if (
            other.junction &&
            self.junction &&
            this.m_can_make_major_changes
          ) {
            // Delete one of the junctions.
            this.m_deleted_junctions.push(other.junction as JunctionRef);
            this.m_hyperedge_tree_junctions.delete(other.junction as JunctionRef);
            if (this.m_hyperedge_tree_roots.has(other.junction as JunctionRef)) {
              this.m_hyperedge_tree_roots.delete(other.junction as JunctionRef);
              this.m_hyperedge_tree_roots.add(self.junction as JunctionRef);
              console.assert(
                this.m_hyperedge_tree_junctions.has(self.junction as JunctionRef)
              );
            }
            other.junction = null;

            // Delete the connector on the zero-length edge.
            this.m_deleted_connectors.push(edge.conn as any);
            edge.conn = null;

            target = self;
            source = other;
          }

          if (target) {
            edge.disconnectEdge();
            target.spliceEdgesFrom(source!);
            this._removeZeroLengthEdgesFromNode(target, ignored);
            return;
          }
        }

        // Recursive call.
        this._removeZeroLengthEdgesFromEdge(edge, self);
      }
    }
  }

  // ---- junction movement along common edges ----

  /**
   * Moves junctions along overlapping/common edges to reduce redundancy.
   */
  moveJunctionsAlongCommonEdges(): void {
    const entries: [JunctionRef, HyperedgeTreeNode][] = [...this.m_hyperedge_tree_junctions.entries()];
    let i: number = 0;
    while (i < entries.length) {
      let node: HyperedgeTreeNode | null = entries[i][1];
      let nodeMapHasChanged: boolean = false;

      while (true) {
        const result: { node: HyperedgeTreeNode | null; nodeMapHasChanged: boolean } =
          this._moveJunctionAlongCommonEdge(node!, nodeMapHasChanged);
        node = result.node;
        nodeMapHasChanged = result.nodeMapHasChanged;
        if (!node) break;
        // Junction has moved -- update our local copy.
        entries[i][1] = node;
      }

      if (nodeMapHasChanged) {
        // Restart iteration since the map has changed.
        entries.length = 0;
        for (const [k, v] of this.m_hyperedge_tree_junctions) {
          entries.push([k, v]);
        }
        i = 0;
      } else {
        i++;
      }
    }
  }

  /**
   * Attempts to move a junction at `self` along any shared path.
   * Returns { node, nodeMapHasChanged }.
   */
  _moveJunctionAlongCommonEdge(
    self: HyperedgeTreeNode,
    nodeMapHasChanged: boolean
  ): { node: HyperedgeTreeNode | null; nodeMapHasChanged: boolean } {
    console.assert(self.junction != null);

    let newSelf: HyperedgeTreeNode | null = null;

    // Consider each edge from this node in turn.
    for (const currEdge of [...self.edges]) {
      const currNode: HyperedgeTreeNode = currEdge.followFrom(self);
      const commonEdges: HyperedgeTreeEdge[] = [];
      const otherEdges: HyperedgeTreeEdge[] = [];

      if (currNode.junction) continue; // Don't shift onto other junctions.
      if (currEdge.hasFixedRoute) continue; // Don't move along fixed edges.

      commonEdges.push(currEdge);

      for (const otherEdge of self.edges) {
        if (otherEdge === currEdge) continue;

        if (otherEdge.hasFixedRoute) {
          otherEdges.push(otherEdge);
          continue;
        }

        const otherNode: HyperedgeTreeNode = otherEdge.followFrom(self);
        if (
          otherNode.point.x === currNode.point.x &&
          otherNode.point.y === currNode.point.y
        ) {
          if (otherNode.junction) {
            otherEdges.push(otherEdge);
          } else {
            commonEdges.push(otherEdge);
          }
        } else if (pointOnLine(self.point, otherNode.point, currNode.point)) {
          otherEdge.splitFromNodeAtPoint(self, currNode.point);
          commonEdges.push(otherEdge);
        } else {
          otherEdges.push(otherEdge);
        }
      }

      const selfFixed: boolean =
        self.junction!.positionFixed() && !this.m_can_make_major_changes;

      if (commonEdges.length > 1 && otherEdges.length <= 1 && !selfFixed) {
        // Move junction to the common target node.
        const targetNode: HyperedgeTreeNode = commonEdges[0].followFrom(self);
        for (let ci: number = 1; ci < commonEdges.length; ci++) {
          const thisNode: HyperedgeTreeNode = commonEdges[ci].followFrom(self);
          commonEdges[ci].disconnectEdge();
          targetNode.spliceEdgesFrom(thisNode);
        }
        targetNode.junction = self.junction;
        self.junction = null;

        if (otherEdges.length === 0) {
          commonEdges[0].disconnectEdge();
        } else {
          commonEdges[0].conn = otherEdges[0].conn;
        }
        newSelf = targetNode;
        break;
      } else if (
        this.m_can_make_major_changes &&
        commonEdges.length > 1 &&
        otherEdges.length > 1
      ) {
        // Split: create a new junction at the target node.
        const targetNode: HyperedgeTreeNode = commonEdges[0].followFrom(self);
        for (let ci: number = 1; ci < commonEdges.length; ci++) {
          const thisNode: HyperedgeTreeNode = commonEdges[ci].followFrom(self);
          commonEdges[ci].disconnectEdge();
          targetNode.spliceEdgesFrom(thisNode);
        }

        targetNode.junction = new JunctionRef(this.m_router, targetNode.point);
        if (this.m_router!.removeObjectFromQueuedActions) {
          this.m_router!.removeObjectFromQueuedActions(targetNode.junction);
        }
        if ((targetNode.junction as any).makeActive) (targetNode.junction as any).makeActive();
        this.m_hyperedge_tree_junctions.set(targetNode.junction as JunctionRef, targetNode);
        nodeMapHasChanged = true;
        this.m_new_junctions.push(targetNode.junction as JunctionRef);

        // Create a new connector between original junction and new junction.
        const ConnRefClass: new (router: IRouter) => IConnRef =
          this.m_router!._ConnRefClass || (Object as any);
        const conn: IConnRef = new ConnRefClass(this.m_router!);
        if (this.m_router!.removeObjectFromQueuedActions) {
          this.m_router!.removeObjectFromQueuedActions(conn);
        }
        if (conn.makeActive) conn.makeActive();
        conn.m_initialised = true;
        if (this.m_router!._makeConnEnd && conn.updateEndPoint) {
          const srcConnend: IConnEnd = this.m_router!._makeConnEnd(targetNode.junction as JunctionRef);
          conn.updateEndPoint(0, srcConnend); // VertID.src
          const tarConnend: IConnEnd = this.m_router!._makeConnEnd(self.junction as JunctionRef);
          conn.updateEndPoint(1, tarConnend); // VertID.tar
        }
        commonEdges[0].conn = conn as any;
        this.m_new_connectors.push(conn);

        newSelf = self;
        break;
      }
    }

    return { node: newSelf, nodeMapHasChanged };
  }

  // ---- nudge ----

  /**
   * Shifts and merges segments to improve overall cost for each hyperedge.
   */
  nudgeHyperedgeSegments(dimension: number, versionNumberRef: VersionNumberRef): void {
    for (const root of this.m_hyperedge_tree_roots) {
      ++this.m_debug_count;
      versionNumberRef.value = dimension * 10000 + this.m_debug_count * 1000;

      const segmentList: HyperedgeShiftSegment[] | undefined = this.m_root_shift_segments.get(root);
      if (!segmentList) continue;

      // Calculate balance for each segment.
      for (const seg of segmentList) {
        seg.setBalanceCount();
      }

      let change: boolean = false;
      let idx: number = 0;
      while (idx < segmentList.length) {
        const segment: HyperedgeShiftSegment = segmentList[idx];
        if (!segment.settled()) {
          segment.adjustPosition();
          versionNumberRef.value++;
          this.outputHyperedgesToSVG(versionNumberRef.value, segment);
          this.mergeOverlappingSegments(segmentList);
          change = true;
        }

        if (change) {
          change = false;
          idx = 0;
        } else {
          idx++;
        }
      }
    }
  }

  // ---- write back ----

  /**
   * Writes the improved hyperedge tree paths back as routes to the
   * component connectors.
   */
  writeHyperedgeSegmentsBackToConnPaths(): void {
    for (let pass: number = 0; pass < 2; pass++) {
      for (const root of this.m_hyperedge_tree_roots) {
        const node: HyperedgeTreeNode | undefined = this.m_hyperedge_tree_junctions.get(root);
        node!.writeEdgesToConns(null, pass);
      }
    }
  }

  // ---- debug output (stub) ----

  /**
   * Outputs the hyperedge tree to SVG (no-op in JS).
   */
  outputHyperedgesToSVG(_pass: number, _activeSegment: HyperedgeShiftSegment | null = null): void {
    // Debug SVG output is not ported to JS.
  }

  // ---- endpoint discovery ----

  /**
   * Follows attached connectors and junctions from a junction to determine
   * the hyperedge endpoints.
   */
  getEndpoints(junction: JunctionRef, ignore: JunctionRef | null, endpoints: Set<IVertInf>): void {
    const followingConns: Set<IConnEnd> = (junction as any).m_following_conns;
    for (const connEnd of followingConns) {
      console.assert(connEnd.m_conn_ref != null);
      const connRef: IConnRef = connEnd.m_conn_ref!;
      const anchors: { first: JunctionRef | IConnRef | null; second: JunctionRef | IConnRef | null } =
        connRef.endpointAnchors();

      const junction1: JunctionRef | null =
        anchors.first instanceof JunctionRef ? anchors.first : null;
      if (junction1) {
        if (junction1 !== junction && junction1 !== ignore) {
          this.getEndpoints(junction1, junction, endpoints);
        }
      } else {
        endpoints.add(connRef.m_src_vert!);
      }

      const junction2: JunctionRef | null =
        anchors.second instanceof JunctionRef ? anchors.second : null;
      if (junction2) {
        if (junction2 !== junction && junction2 !== ignore) {
          this.getEndpoints(junction2, junction, endpoints);
        }
      } else {
        endpoints.add(connRef.m_dst_vert!);
      }
    }
  }

  // ---- main execute ----

  /**
   * Executes the full local hyperedge improvement process.
   */
  execute(canMakeMajorChanges: boolean): void {
    this.m_can_make_major_changes = canMakeMajorChanges;

    // Build hyperedge trees from existing connectors.
    const connRefs: IConnRef[] = this.m_router!.connRefs || [];
    for (const connRef of connRefs) {
      let jFront: JunctionRef | null = null;
      let jBack: JunctionRef | null = null;

      if (connRef.m_src_connend) {
        jFront = connRef.m_src_connend.junction();
      }
      if (connRef.m_dst_connend) {
        jBack = connRef.m_dst_connend.junction();
      }

      if (!jFront && !jBack) continue;

      const seenFront: boolean = this.m_hyperedge_tree_junctions.has(jFront!);
      const seenBack: boolean = this.m_hyperedge_tree_junctions.has(jBack!);

      let nodeFront: HyperedgeTreeNode;
      let nodeBack: HyperedgeTreeNode;

      if (jFront) {
        if (!seenFront) {
          nodeFront = new HyperedgeTreeNode();
          nodeFront.point = jFront.position();
          nodeFront.junction = jFront;
          this.m_hyperedge_tree_junctions.set(jFront, nodeFront);
        } else {
          nodeFront = this.m_hyperedge_tree_junctions.get(jFront)!;
        }
      } else {
        nodeFront = new HyperedgeTreeNode();
      }

      if (jBack) {
        if (!seenBack) {
          nodeBack = new HyperedgeTreeNode();
          nodeBack.point = jBack.position();
          nodeBack.junction = jBack;
          this.m_hyperedge_tree_junctions.set(jBack, nodeBack);
        } else {
          nodeBack = this.m_hyperedge_tree_junctions.get(jBack)!;
        }
      } else {
        nodeBack = new HyperedgeTreeNode();
      }

      const route: Polygon = connRef.displayRoute();
      let prev: HyperedgeTreeNode | null = null;
      for (let i: number = 1; i < route.size(); i++) {
        let node: HyperedgeTreeNode;
        if (i + 1 === route.size()) {
          node = nodeBack;
        } else {
          node = new HyperedgeTreeNode();
        }
        node.point = route.at(i);
        if (i === 1) {
          prev = nodeFront;
          nodeFront.point = route.at(0);
          nodeFront.isConnectorSource = true;
        }
        new HyperedgeTreeEdge(prev!, node, connRef as any);
        prev = node;
      }
    }

    // Build set of tree roots (one junction per tree).
    for (const [, node] of this.m_hyperedge_tree_junctions) {
      this.m_hyperedge_tree_roots.add(node.junction as JunctionRef);
    }
    const cyclicRoots: JunctionRef[] = [];
    for (const root of this.m_hyperedge_tree_roots) {
      const node: HyperedgeTreeNode | undefined = this.m_hyperedge_tree_junctions.get(root);
      const containsCycle: boolean = node!.removeOtherJunctionsFrom(
        null,
        this.m_hyperedge_tree_roots as any
      );
      if (containsCycle) {
        cyclicRoots.push(node!.junction as JunctionRef);
      }
    }
    for (const junction of cyclicRoots) {
      console.warn(
        `Warning: Skipping cyclic hyperedge rooted at junction ${(junction as any).id()}`
      );
      this.m_hyperedge_tree_roots.delete(junction);
    }

    // Debug output.
    const versionNumberRef: VersionNumberRef = { value: 1 };
    this.outputHyperedgesToSVG(versionNumberRef.value);

    // Remove zero-length edges.
    this.removeZeroLengthEdges();

    // Move junctions to divergence points.
    this.moveJunctionsAlongCommonEdges();

    this.outputHyperedgesToSVG(++versionNumberRef.value);

    // Four passes of segment building + nudging.
    for (let count: number = 0; count < 4; count++) {
      const dimension: number = count % 2;

      versionNumberRef.value = 100 * (dimension + 1);

      this.buildHyperedgeSegments(dimension);

      // Channel info computation -- call external if available.
      if (this.m_router!.buildOrthogonalChannelInfo) {
        this.m_router!.buildOrthogonalChannelInfo(
          dimension,
          this.m_all_shift_segments
        );
      }

      this.nudgeHyperedgeSegments(dimension, versionNumberRef);
      this.removeZeroLengthEdges();
      this.moveJunctionsAlongCommonEdges();
      this.outputHyperedgesToSVG(++versionNumberRef.value);

      // Clean up shift segments.
      for (const root of this.m_hyperedge_tree_roots) {
        const segmentList: HyperedgeShiftSegment[] | undefined = this.m_root_shift_segments.get(root);
        if (segmentList) {
          for (const seg of segmentList) {
            seg.destroy();
          }
        }
      }
      this.m_root_shift_segments.clear();
      this.m_all_shift_segments = [];
    }

    // Rewrite connector attachments to junctions if major changes allowed.
    if (this.m_can_make_major_changes) {
      for (const root of this.m_hyperedge_tree_roots) {
        const treeRoot: HyperedgeTreeNode | undefined = this.m_hyperedge_tree_junctions.get(root);
        console.assert(treeRoot != null);
        treeRoot!.updateConnEnds(null, false, this.m_changed_connectors as any);
        treeRoot!.validateHyperedge(null, 0);
      }
    }

    // Write back recommended positions.
    for (const [, node] of this.m_hyperedge_tree_junctions) {
      (node.junction as JunctionRef).setRecommendedPosition(node.point);
    }

    // Write paths back to connector routes.
    this.writeHyperedgeSegmentsBackToConnPaths();

    // Free hyperedge tree structure.
    for (const root of this.m_hyperedge_tree_roots) {
      const node: HyperedgeTreeNode | undefined = this.m_hyperedge_tree_junctions.get(root);
      node!.deleteEdgesExcept(null);
    }

    // Delete objects from previous hyperedge paths.
    for (const conn of this.m_deleted_connectors) {
      if (conn.assignConnectionPinVisibility) {
        conn.assignConnectionPinVisibility(false);
      }
      if (this.m_router!.deleteConnector) {
        this.m_router!.deleteConnector(conn);
      }
    }
    for (const junc of this.m_deleted_junctions) {
      if (this.m_router!.deleteJunction) {
        this.m_router!.deleteJunction(junc);
      }
    }
  }
}
