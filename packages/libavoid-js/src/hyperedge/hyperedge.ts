/*
 * libavoid-js - JavaScript port of libavoid
 * Original C++ library: Copyright (C) 2011-2015 Monash University
 * Original author: Michael Wybrow
 *
 * Port of hyperedge.h / hyperedge.cpp
 * Contains the HyperedgeRerouter class and HyperedgeNewAndDeletedObjectLists.
 */

import { Point } from '../core/geomtypes';
import { JunctionRef } from './junction';
import type { HyperedgeTreeNode } from './hyperedgetree';

// ---------------------------------------------------------------------------
//  Local interfaces for types with circular dependencies
// ---------------------------------------------------------------------------

interface IVertInf {
  removeFromGraph?(): void;
}

interface IConnEnd {
  getHyperedgeVertex(router: IRouter): { first: boolean; second: IVertInf };
}

interface IConnRef {
  assignConnectionPinVisibility?(visible: boolean): void;
  endpointAnchors(): { first: JunctionRef | IConnRef | null; second: JunctionRef | IConnRef | null };
  m_src_vert: IVertInf | null;
  m_dst_vert: IVertInf | null;
  m_display_route: { clear(): void; empty(): boolean; ps: Point[] };
  hasFixedRoute?(): boolean;
}

interface IVertexList {
  removeVertex(vert: IVertInf): void;
}

interface IMTST {
  constructInterleaved(): void;
  rootJunction(): HyperedgeTreeNode | null;
}

interface IRouter {
  _createMTST?(
    terminalVertices: Set<IVertInf>,
    hyperedgeTreeJunctions: Map<JunctionRef, HyperedgeTreeNode>
  ): IMTST;
  deleteConnector?(conn: IConnRef): void;
  deleteJunction?(junc: JunctionRef): void;
  vertices?: IVertexList;
}

// ---------------------------------------------------------------------------
//  HyperedgeNewAndDeletedObjectLists
// ---------------------------------------------------------------------------

/**
 * Stores lists of objects created and deleted during hyperedge improvement
 * or rerouting.
 */
export class HyperedgeNewAndDeletedObjectLists {
  public newJunctionList: JunctionRef[];
  public newConnectorList: IConnRef[];
  public deletedJunctionList: JunctionRef[];
  public deletedConnectorList: IConnRef[];
  public changedConnectorList: IConnRef[];

  constructor() {
    this.newJunctionList = [];
    this.newConnectorList = [];
    this.deletedJunctionList = [];
    this.deletedConnectorList = [];
    this.changedConnectorList = [];
  }
}

// ---------------------------------------------------------------------------
//  HyperedgeRerouter
// ---------------------------------------------------------------------------

/**
 * Convenience class to register hyperedges for full rerouting, improving
 * the placement of their junctions and connector paths.
 */
export class HyperedgeRerouter {
  public m_router: IRouter | null;
  public m_terminals_vector: IConnEnd[][];
  public m_root_junction_vector: (JunctionRef | null)[];
  public m_new_junctions_vector: JunctionRef[][];
  public m_deleted_junctions_vector: JunctionRef[][];
  public m_new_connectors_vector: IConnRef[][];
  public m_deleted_connectors_vector: IConnRef[][];
  public m_terminal_vertices_vector: Set<IVertInf>[];
  public m_added_vertices: IVertInf[];

  constructor() {
    this.m_router = null;
    this.m_terminals_vector = [];
    this.m_root_junction_vector = [];
    this.m_new_junctions_vector = [];
    this.m_deleted_junctions_vector = [];
    this.m_new_connectors_vector = [];
    this.m_deleted_connectors_vector = [];
    this.m_terminal_vertices_vector = [];
    this.m_added_vertices = [];
  }

  // ---- internal ----

  /**
   * Sets the router instance this object operates on.
   */
  setRouter(router: IRouter): void {
    this.m_router = router;
  }

  // ---- public API ----

  /**
   * Registers a hyperedge for rerouting given a list of terminal ConnEnds.
   *
   * @returns An index for the registered hyperedge.
   */
  registerHyperedgeForReroutingByTerminals(terminals: IConnEnd[]): number {
    this.m_terminals_vector.push([...terminals]);
    this.m_root_junction_vector.push(null);
    return this.m_terminals_vector.length - 1;
  }

  /**
   * Registers a hyperedge for rerouting given one of its junctions.
   * The rerouter will follow attached connectors/junctions to discover the
   * full hyperedge topology.
   *
   * @returns An index for the registered hyperedge.
   */
  registerHyperedgeForReroutingByJunction(junction: JunctionRef): number {
    this.m_terminals_vector.push([]);
    this.m_root_junction_vector.push(junction);
    return this.m_terminals_vector.length - 1;
  }

  /**
   * Overloaded registration: accepts either a ConnEndList (Array) or a
   * JunctionRef.
   */
  registerHyperedgeForRerouting(terminalsOrJunction: IConnEnd[] | JunctionRef): number {
    if (Array.isArray(terminalsOrJunction)) {
      return this.registerHyperedgeForReroutingByTerminals(terminalsOrJunction);
    }
    return this.registerHyperedgeForReroutingByJunction(terminalsOrJunction);
  }

  /**
   * @returns Number of registered hyperedges.
   */
  count(): number {
    return this.m_terminals_vector.length;
  }

  /**
   * Returns lists of created/deleted junctions and connectors for a given
   * hyperedge index (valid only after the router has processed the transaction).
   */
  newAndDeletedObjectLists(index: number): HyperedgeNewAndDeletedObjectLists {
    console.assert(index <= this.count());
    const result: HyperedgeNewAndDeletedObjectLists = new HyperedgeNewAndDeletedObjectLists();
    result.newJunctionList = this.m_new_junctions_vector[index] || [];
    result.deletedJunctionList = this.m_deleted_junctions_vector[index] || [];
    result.newConnectorList = this.m_new_connectors_vector[index] || [];
    result.deletedConnectorList = this.m_deleted_connectors_vector[index] || [];
    return result;
  }

  // ---- internal methods called by Router ----

  /**
   * Debug SVG output (stub).
   */
  outputInstanceToSVG(_fp: unknown): void {
    // Debug output -- not ported.
  }

  /**
   * Follows connected junctions and connectors from the given connector to
   * determine the hyperedge topology, saving objects to deleted-objects
   * vectors as we go.
   *
   * @returns true if this constitutes a valid hyperedge
   */
  findAttachedObjectsFromConnector(
    index: number,
    connector: IConnRef,
    ignore: JunctionRef | null,
    hyperedgeConns: Set<IConnRef>
  ): boolean {
    let validHyperedge: boolean = false;

    if (connector.assignConnectionPinVisibility) {
      connector.assignConnectionPinVisibility(true);
    }

    this.m_deleted_connectors_vector[index].push(connector);
    hyperedgeConns.add(connector);

    const anchors: { first: JunctionRef | IConnRef | null; second: JunctionRef | IConnRef | null } =
      connector.endpointAnchors();
    const jFirst: JunctionRef | null =
      anchors.first instanceof JunctionRef ? anchors.first : null;
    const jSecond: JunctionRef | null =
      anchors.second instanceof JunctionRef ? anchors.second : null;

    if (jFirst) {
      if (jFirst !== ignore) {
        validHyperedge =
          this.findAttachedObjectsFromJunction(index, jFirst, connector, hyperedgeConns) ||
          validHyperedge;
      }
    } else {
      console.assert(connector.m_src_vert != null);
      this.m_terminal_vertices_vector[index].add(connector.m_src_vert!);
    }

    if (jSecond) {
      if (jSecond !== ignore) {
        validHyperedge =
          this.findAttachedObjectsFromJunction(index, jSecond, connector, hyperedgeConns) ||
          validHyperedge;
      }
    } else {
      console.assert(connector.m_dst_vert != null);
      this.m_terminal_vertices_vector[index].add(connector.m_dst_vert!);
    }

    return validHyperedge;
  }

  /**
   * Follows connected junctions and connectors from the given junction.
   */
  findAttachedObjectsFromJunction(
    index: number,
    junction: JunctionRef,
    ignore: IConnRef | null,
    hyperedgeConns: Set<IConnRef>
  ): boolean {
    let validHyperedge: boolean = false;

    this.m_deleted_junctions_vector[index].push(junction);

    const connectors: IConnRef[] = (junction as any).attachedConnectors();
    if (connectors.length > 2) {
      validHyperedge = true;
    }

    for (const conn of connectors) {
      if (conn === ignore) continue;
      console.assert(conn !== null);
      validHyperedge =
        this.findAttachedObjectsFromConnector(index, conn, junction, hyperedgeConns) ||
        validHyperedge;
    }
    return validHyperedge;
  }

  /**
   * Overloaded findAttachedObjects dispatching to connector or junction
   * variant based on type.
   */
  findAttachedObjects(
    index: number,
    obj: JunctionRef | IConnRef,
    ignore: JunctionRef | IConnRef | null,
    hyperedgeConns: Set<IConnRef>
  ): boolean {
    if (obj instanceof JunctionRef) {
      return this.findAttachedObjectsFromJunction(index, obj, ignore as IConnRef | null, hyperedgeConns);
    }
    return this.findAttachedObjectsFromConnector(index, obj as IConnRef, ignore as JunctionRef | null, hyperedgeConns);
  }

  /**
   * Populates the deleted-object vectors with all the connectors and
   * junctions that form the registered hyperedges.  Returns the set of
   * all these connectors so they can be skipped during individual rerouting.
   */
  calcHyperedgeConnectors(): Set<IConnRef> {
    console.assert(this.m_router !== null);

    const allRegisteredHyperedgeConns: Set<IConnRef> = new Set();

    // Clear and resize deleted-object vectors.
    const n: number = this.count();
    this.m_deleted_junctions_vector = [];
    this.m_deleted_connectors_vector = [];
    this.m_terminal_vertices_vector = [];
    this.m_added_vertices = [];
    for (let i: number = 0; i < n; i++) {
      this.m_deleted_junctions_vector.push([]);
      this.m_deleted_connectors_vector.push([]);
      this.m_terminal_vertices_vector.push(new Set());
    }

    for (let i: number = 0; i < n; i++) {
      if (this.m_root_junction_vector[i]) {
        const valid: boolean = this.findAttachedObjectsFromJunction(
          i,
          this.m_root_junction_vector[i]!,
          null,
          allRegisteredHyperedgeConns
        );
        if (!valid) {
          console.warn(
            `Warning: Hyperedge ${i} registered with HyperedgeRerouter is invalid and will be ignored.`
          );
          this.m_terminals_vector[i] = [];
          this.m_terminal_vertices_vector[i].clear();
          this.m_deleted_junctions_vector[i] = [];
          this.m_deleted_connectors_vector[i] = [];
        }
        continue;
      }

      // We have a set of ConnEnds -- store corresponding terminal vertices.
      for (const connEnd of this.m_terminals_vector[i]) {
        const maybeNewVertex: { first: boolean; second: IVertInf } =
          connEnd.getHyperedgeVertex(this.m_router!);
        console.assert(maybeNewVertex.second !== null);
        this.m_terminal_vertices_vector[i].add(maybeNewVertex.second);
        if (maybeNewVertex.first) {
          this.m_added_vertices.push(maybeNewVertex.second);
        }
      }
    }

    return allRegisteredHyperedgeConns;
  }

  /**
   * Performs the actual rerouting of all registered hyperedges.
   * Called by Router during processTransaction().
   */
  performRerouting(): void {
    console.assert(this.m_router !== null);

    const n: number = this.count();
    this.m_new_junctions_vector = [];
    this.m_new_connectors_vector = [];
    for (let i: number = 0; i < n; i++) {
      this.m_new_junctions_vector.push([]);
      this.m_new_connectors_vector.push([]);
    }

    for (let i: number = 0; i < n; i++) {
      if (this.m_terminal_vertices_vector[i].size === 0) {
        // Invalid hyperedge, skip.
        continue;
      }

      // Execute MTST method to find good junction positions and initial path.
      // MinimumTerminalSpanningTree is expected to be provided by the router
      // or an external module.
      const hyperedgeTreeJunctions: Map<JunctionRef, HyperedgeTreeNode> = new Map();
      if (this.m_router!._createMTST) {
        const mtst: IMTST = this.m_router!._createMTST(
          this.m_terminal_vertices_vector[i],
          hyperedgeTreeJunctions
        );
        mtst.constructInterleaved();

        const treeRoot: HyperedgeTreeNode | null = mtst.rootJunction();
        console.assert(treeRoot != null);

        // Fill in connector information.
        treeRoot!.addConns(
          null,
          this.m_router as any,
          this.m_deleted_connectors_vector[i] as any,
          null
        );

        // Output list of new junctions and connectors.
        treeRoot!.listJunctionsAndConnectors(
          null,
          this.m_new_junctions_vector[i],
          this.m_new_connectors_vector[i] as any
        );

        // Write paths from the tree back into individual connector routes.
        for (let pass: number = 0; pass < 2; pass++) {
          treeRoot!.writeEdgesToConns(null, pass);
        }
      }

      // Delete objects from previous hyperedge path.
      for (const conn of this.m_deleted_connectors_vector[i]) {
        if (conn.assignConnectionPinVisibility) {
          conn.assignConnectionPinVisibility(false);
        }
        if (this.m_router!.deleteConnector) {
          this.m_router!.deleteConnector(conn);
        }
      }
      for (const junc of this.m_deleted_junctions_vector[i]) {
        if (this.m_router!.deleteJunction) {
          this.m_router!.deleteJunction(junc);
        }
      }
    }

    // Clear input for next transaction.
    this.m_terminals_vector = [];
    this.m_root_junction_vector = [];

    // Free temporarily added vertices.
    for (const vert of this.m_added_vertices) {
      if (vert.removeFromGraph) vert.removeFromGraph();
      if (this.m_router!.vertices && this.m_router!.vertices.removeVertex) {
        this.m_router!.vertices.removeVertex(vert);
      }
    }
    this.m_added_vertices = [];
  }
}
