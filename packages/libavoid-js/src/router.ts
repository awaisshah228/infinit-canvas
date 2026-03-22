/*
 * libavoid-js - JavaScript port of libavoid Router
 * Original C++ library: Copyright (C) 2004-2015 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import {
  PolyLineRouting,
  OrthogonalRouting,
  ConnType_PolyLine,
  ConnType_Orthogonal,
  segmentPenalty,
  anglePenalty,
  crossingPenalty,
  clusterCrossingPenalty,
  fixedSharedPathPenalty,
  portDirectionPenalty,
  idealNudgingDistance,
  reverseDirectionPenalty,
  lastRoutingParameterMarker,
  nudgeOrthogonalSegmentsConnectedToShapes,
  improveHyperedgeRoutesMovingJunctions,
  penaliseOrthogonalSharedPathsAtConnEnds,
  nudgeOrthogonalTouchingColinearSegments,
  performUnifyingNudgingPreprocessingStep,
  improveHyperedgeRoutesMovingAddingAndDeletingJunctions,
  nudgeSharedPathsWithCommonEndPoint,
  lastRoutingOptionMarker,
  ShapeMove,
  ShapeAdd,
  ShapeRemove,
  JunctionMove,
  JunctionAdd,
  JunctionRemove,
  ConnChange,
  ConnectionPinChange,
  TransactionPhaseRouteSearch,
  TransactionPhaseCompleted,
  runningTo,
  runningFrom,
  CROSSING_SHARES_PATH,
  CROSSING_SHARES_FIXED_SEGMENT,
  CROSSING_SHARES_PATH_AT_END,
  CROSSING_TOUCHES,
} from './core/constants';

import { Point, Polygon, PolygonInterface } from './core/geomtypes';
import { inPoly, inPolyGen, euclideanDist, manhattanDist, segmentShapeIntersect } from './core/geometry';
import { VertInf, VertInfList, VertID, dummyOrthogID } from './graph/vertices';
import { EdgeList, EdgeInf } from './graph/graph';
import { ActionInfo } from './actioninfo';

import type { Obstacle } from './obstacles/obstacle';
import type { ShapeRef } from './obstacles/shape';
import type { JunctionRef } from './hyperedge/junction';
import type { ConnRef } from './connectors/connector';
import type { ConnEnd } from './connectors/connend';
import type { ClusterRef } from './obstacles/viscluster';
import type { ShapeConnectionPin } from './connectors/connectionpin';
import type { ConnectorCrossings } from './connectors/connector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RouterFlag = number;
export type RoutingParameter = number;
export type RoutingOption = number;
export type ConnType = number;
export type TransactionPhase = number;

export interface DebugHandler {
  [key: string]: unknown;
}

export interface RerouteFlag {
  value: boolean;
}

interface RerouteFlagEntry {
  conn: (ConnRef & { m_needs_reroute_flag?: boolean }) | null;
  flag: RerouteFlag;
}

export interface HyperedgeObjectLists {
  deletedConnectorList: ConnRef[];
  newConnectorList: ConnRef[];
  deletedJunctionList: JunctionRef[];
  newJunctionList: JunctionRef[];
}

export interface HyperedgeRerouterStub {
  count(): number;
  setRouter(r: Router): void;
  calcHyperedgeConnectors(): Set<ConnRef>;
  performRerouting(): void;
  newAndDeletedObjectLists(idx: number): HyperedgeObjectLists;
}

export interface HyperedgeImproverStub {
  setRouter(r: Router): void;
  clear(): void;
  execute(withMajor: boolean): void;
  newAndDeletedObjectLists(): HyperedgeObjectLists;
}

interface CrossingSetEntry {
  cost: number;
  conn: ConnRef;
}

/** Endpoint anchor as returned by ConnRef.endpointAnchors() */
interface EndpointAnchor {
  id(): number;
}

// ---------------------------------------------------------------------------
// Global declaration for late-bound function (may be injected at runtime)
// ---------------------------------------------------------------------------
declare let generateStaticOrthogonalVisGraph: ((router: Router) => void) | undefined;

// Sentinel value for ConnType: no connector type
const ConnType_None: number = 0;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const zeroParamValue: number = 0;
const chooseSensibleParamValue: number = -1;

// ---------------------------------------------------------------------------
// ConnRerouteFlagDelegate
// ---------------------------------------------------------------------------

export class ConnRerouteFlagDelegate {
  private _mapping: RerouteFlagEntry[];

  constructor() {
    this._mapping = [];
  }

  addConn(conn: ConnRef): RerouteFlag {
    const flagObj: RerouteFlag = { value: false };
    this._mapping.push({ conn, flag: flagObj });
    return flagObj;
  }

  removeConn(conn: ConnRef): void {
    for (let i: number = 0; i < this._mapping.length; i++) {
      if (this._mapping[i].conn === conn) {
        this._mapping[i].conn = null;
      }
    }
  }

  alertConns(): void {
    for (let i: number = 0; i < this._mapping.length; i++) {
      const entry: RerouteFlagEntry = this._mapping[i];
      if (entry.conn !== null && entry.flag.value === true) {
        entry.flag.value = false;
        (entry.conn as ConnRef & { m_needs_reroute_flag: boolean }).m_needs_reroute_flag = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TopologyAddonInterface
// ---------------------------------------------------------------------------

export class TopologyAddonInterface {
  constructor() {}

  clone(): TopologyAddonInterface {
    return new TopologyAddonInterface();
  }

  improveOrthogonalTopology(_router: Router): void {
    // Default: no-op.
  }

  outputCode(_fp: unknown): boolean {
    return false;
  }

  outputDeletionCode(_fp: unknown): boolean {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function actionListFind(list: ActionInfo[], info: ActionInfo): number {
  for (let i: number = 0; i < list.length; i++) {
    if (list[i].equals(info)) {
      return i;
    }
  }
  return -1;
}

function actionListSort(list: ActionInfo[]): void {
  list.sort((a: ActionInfo, b: ActionInfo): number => {
    if (a.lessThan(b)) return -1;
    if (b.lessThan(a)) return 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// CrossingConnectorsInfo
// ---------------------------------------------------------------------------

class CrossingConnectorsInfo {
  private _pairsSetList: Map<ConnRef, Set<ConnRef>>[];

  constructor() {
    this._pairsSetList = [];
  }

  addCrossing(conn1: ConnRef, conn2: ConnRef): void {
    const groupIdx: number = this._groupForCrossingConns(conn1, conn2);
    const pairsSet: Map<ConnRef, Set<ConnRef>> = this._pairsSetList[groupIdx];

    if (!pairsSet.has(conn1)) pairsSet.set(conn1, new Set<ConnRef>());
    if (!pairsSet.has(conn2)) pairsSet.set(conn2, new Set<ConnRef>());
    pairsSet.get(conn1)!.add(conn2);
    pairsSet.get(conn2)!.add(conn1);
  }

  connsKnownToCross(conn1: ConnRef, conn2: ConnRef): boolean {
    const idx1: number = this._groupForConn(conn1);
    const idx2: number = this._groupForConn(conn2);

    if (idx1 === idx2 && idx1 !== -1) {
      const pairsSet: Map<ConnRef, Set<ConnRef>> = this._pairsSetList[idx1];
      return pairsSet.has(conn1) && pairsSet.get(conn1)!.has(conn2);
    }
    return false;
  }

  crossingSetsListToRemoveCrossingsFromGroups(): CrossingSetEntry[][] {
    const crossingSetsList: CrossingSetEntry[][] = [];

    for (let gi: number = 0; gi < this._pairsSetList.length; gi++) {
      const pairsSet: Map<ConnRef, Set<ConnRef>> = this._pairsSetList[gi];
      const crossingSet: CrossingSetEntry[] = [];
      const exclusivePins: Set<string> = new Set<string>();

      let candidate: CrossingSetEntry | null;
      while ((candidate = this._removeConnectorWithMostCrossings(pairsSet)) !== null) {
        crossingSet.push(candidate);

        const conn = candidate.conn as ConnRef & {
          endpointConnEnds?: () => { first: ConnEnd | null; second: ConnEnd | null };
        };
        if (conn.endpointConnEnds) {
          const ends = conn.endpointConnEnds();
          for (const end of [ends.first, ends.second]) {
            const e = end as (ConnEnd & {
              m_active_pin?: {
                isExclusive?: () => boolean;
                ids?: () => unknown;
              };
            }) | null;
            if (e && e.m_active_pin && e.m_active_pin.isExclusive && e.m_active_pin.isExclusive()) {
              const pinIds: unknown = e.m_active_pin.ids!();
              exclusivePins.add(JSON.stringify(pinIds));
            }
          }
        }
      }

      for (const [conn] of pairsSet) {
        const c = conn as ConnRef & {
          endpointConnEnds?: () => { first: ConnEnd | null; second: ConnEnd | null };
        };
        if (c.endpointConnEnds) {
          const ends = c.endpointConnEnds();
          for (const end of [ends.first, ends.second]) {
            const e = end as (ConnEnd & {
              m_active_pin?: {
                isExclusive?: () => boolean;
                ids?: () => unknown;
              };
            }) | null;
            if (e && e.m_active_pin && e.m_active_pin.isExclusive && e.m_active_pin.isExclusive()) {
              const key: string = JSON.stringify(e.m_active_pin.ids!());
              if (exclusivePins.has(key)) {
                crossingSet.push({ cost: 0, conn });
                break;
              }
            }
          }
        }
      }

      if (crossingSet.length > 0) {
        crossingSetsList.push(crossingSet);
      }
    }
    return crossingSetsList;
  }

  private _removeConnectorWithMostCrossings(
    pairsSet: Map<ConnRef, Set<ConnRef>>,
  ): CrossingSetEntry | null {
    let candidateConn: ConnRef | null = null;
    let candidateCount: number = 0;
    let candidateCost: number = 0;

    for (const [conn, crossSet] of pairsSet) {
      const crossings: number = crossSet.size;
      if (crossings === 0) continue;

      const cost: number = _cheapEstimatedCost(conn);
      if (crossings > candidateCount ||
          (crossings === candidateCount && cost > candidateCost)) {
        candidateConn = conn;
        candidateCount = crossings;
        candidateCost = cost;
      }
    }

    if (candidateConn === null) return null;

    const connSet: Set<ConnRef> = pairsSet.get(candidateConn)!;
    for (const other of connSet) {
      const otherSet: Set<ConnRef> | undefined = pairsSet.get(other);
      if (otherSet) otherSet.delete(candidateConn);
    }
    connSet.clear();

    return { cost: candidateCount, conn: candidateConn };
  }

  private _groupForConn(conn: ConnRef): number {
    for (let i: number = 0; i < this._pairsSetList.length; i++) {
      if (this._pairsSetList[i].has(conn)) return i;
    }
    return -1;
  }

  private _groupForCrossingConns(conn1: ConnRef, conn2: ConnRef): number {
    const idx1: number = this._groupForConn(conn1);
    const idx2: number = this._groupForConn(conn2);

    if (idx1 === -1 && idx2 === -1) {
      this._pairsSetList.push(new Map<ConnRef, Set<ConnRef>>());
      return this._pairsSetList.length - 1;
    } else if (idx1 !== -1 && idx2 === -1) {
      return idx1;
    } else if (idx1 === -1 && idx2 !== -1) {
      return idx2;
    } else if (idx1 !== idx2) {
      const map1: Map<ConnRef, Set<ConnRef>> = this._pairsSetList[idx1];
      const map2: Map<ConnRef, Set<ConnRef>> = this._pairsSetList[idx2];
      for (const [key, val] of map2) {
        if (map1.has(key)) {
          for (const v of val) map1.get(key)!.add(v);
        } else {
          map1.set(key, val);
        }
      }
      this._pairsSetList.splice(idx2, 1);
      return idx2 < idx1 ? idx1 - 1 : idx1;
    } else {
      return idx1;
    }
  }
}

function _cheapEstimatedCost(conn: ConnRef): number {
  const c = conn as ConnRef & {
    routingType?: () => number;
    displayRoute?: () => Polygon;
  };
  const isPolyLine: boolean = !!(c.routingType && c.routingType() === ConnType_PolyLine);
  const route: Polygon | null = c.displayRoute ? c.displayRoute() : null;
  if (!route || route.size() === 0) return 0;

  let length: number = 0;
  for (let i: number = 1; i < route.size(); i++) {
    const a: Point = route.ps[i - 1];
    const b: Point = route.ps[i];
    const segLen: number = isPolyLine ? euclideanDist(a, b) : manhattanDist(a, b);
    length += segLen;
  }
  return length - (route.size() + 1);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export class Router {
  // --- public data structures ---
  public m_obstacles: Obstacle[];
  public connRefs: ConnRef[];
  public clusterRefs: ClusterRef[];
  public visGraph: EdgeList;
  public invisGraph: EdgeList;
  public visOrthogGraph: EdgeList;
  public contains: Map<string, Set<number>>;
  public vertices: VertInfList;
  public enclosingClusters: Map<string, Set<number>>;

  // --- flags ---
  public PartialTime: boolean;
  public SimpleRouting: boolean;
  public ClusteredRouting: boolean;
  public IgnoreRegions: boolean;
  public UseLeesAlgorithm: boolean;
  public InvisibilityGrph: boolean;
  public SelectiveReroute: boolean;
  public PartialFeedback: boolean;
  public RubberBandRouting: boolean;

  // Instrumentation
  public st_checked_edges: number;

  // --- private state ---
  private _actionList: ActionInfo[];
  private _m_largest_assigned_id: number;
  private _m_consolidate_actions: boolean;
  private _m_currently_calling_destructors: boolean;
  private _m_routing_parameters: number[];
  private _m_routing_options: boolean[];
  public m_conn_reroute_flags: ConnRerouteFlagDelegate;
  private _m_hyperedge_rerouter: HyperedgeRerouterStub;
  private _m_hyperedge_improver: HyperedgeImproverStub;
  private _m_transaction_start_time: number;
  private _m_abort_transaction: boolean;
  private _m_topology_addon: TopologyAddonInterface | null;
  private _m_allows_polyline_routing: boolean;
  private _m_allows_orthogonal_routing: boolean;
  private _m_static_orthogonal_graph_invalidated: boolean;
  private _m_in_crossing_rerouting_stage: boolean;
  private _m_settings_changes: boolean;
  private _m_debug_handler: DebugHandler | null;

  // Late-bound external helpers
  public _generateStaticOrthogonalVisGraph?: (router: Router) => void;
  public _improveOrthogonalRoutes?: (router: Router) => void;
  public _ConnectorCrossings?: new (
    iRoute: Polygon,
    polyIsConn: boolean,
    jRoute: Polygon,
    iConn: ConnRef | null,
    jConn: ConnRef | null,
  ) => ConnectorCrossings & {
    checkForBranchingSegments: boolean;
    crossingFlags: number;
    crossingCount: number;
    countForSegment(jInd: number, finalSeg: boolean): void;
  };

  constructor(flags: RouterFlag) {
    console.assert(
      !!(flags & (PolyLineRouting | OrthogonalRouting)),
      'Router: at least one routing mode must be set'
    );

    this.m_obstacles = [];
    this.connRefs = [];
    this.clusterRefs = [];
    this.visGraph = new EdgeList();
    this.invisGraph = new EdgeList();
    this.visOrthogGraph = new EdgeList(true);
    this.contains = new Map<string, Set<number>>();
    this.vertices = new VertInfList();
    this.enclosingClusters = new Map<string, Set<number>>();

    this.PartialTime = false;
    this.SimpleRouting = false;
    this.ClusteredRouting = true;
    this.IgnoreRegions = true;
    this.UseLeesAlgorithm = true;
    this.InvisibilityGrph = true;
    this.SelectiveReroute = true;
    this.PartialFeedback = false;
    this.RubberBandRouting = false;

    this.st_checked_edges = 0;

    this._actionList = [];
    this._m_largest_assigned_id = 0;
    this._m_consolidate_actions = true;
    this._m_currently_calling_destructors = false;

    this._m_routing_parameters = new Array<number>(lastRoutingParameterMarker).fill(0.0);
    this._m_routing_parameters[segmentPenalty] = 10;
    this._m_routing_parameters[clusterCrossingPenalty] = 4000;
    this._m_routing_parameters[idealNudgingDistance] = 4.0;

    this._m_routing_options = new Array<boolean>(lastRoutingOptionMarker).fill(false);
    this._m_routing_options[nudgeOrthogonalSegmentsConnectedToShapes] = false;
    this._m_routing_options[improveHyperedgeRoutesMovingJunctions] = true;
    this._m_routing_options[penaliseOrthogonalSharedPathsAtConnEnds] = false;
    this._m_routing_options[nudgeOrthogonalTouchingColinearSegments] = false;
    this._m_routing_options[performUnifyingNudgingPreprocessingStep] = true;
    this._m_routing_options[improveHyperedgeRoutesMovingAddingAndDeletingJunctions] = false;
    this._m_routing_options[nudgeSharedPathsWithCommonEndPoint] = true;

    this.m_conn_reroute_flags = new ConnRerouteFlagDelegate();

    this._m_hyperedge_rerouter = {
      count(): number { return 0; },
      setRouter(_r: Router): void {},
      calcHyperedgeConnectors(): Set<ConnRef> { return new Set<ConnRef>(); },
      performRerouting(): void {},
      newAndDeletedObjectLists(_idx: number): HyperedgeObjectLists {
        return { deletedConnectorList: [], newConnectorList: [], deletedJunctionList: [], newJunctionList: [] };
      },
    };
    this._m_hyperedge_improver = {
      setRouter(_r: Router): void {},
      clear(): void {},
      execute(_withMajor: boolean): void {},
      newAndDeletedObjectLists(): HyperedgeObjectLists {
        return { deletedConnectorList: [], newConnectorList: [], deletedJunctionList: [], newJunctionList: [] };
      },
    };

    this._m_transaction_start_time = 0;
    this._m_abort_transaction = false;
    this._m_topology_addon = new TopologyAddonInterface();
    this._m_allows_polyline_routing = !!(flags & PolyLineRouting);
    this._m_allows_orthogonal_routing = !!(flags & OrthogonalRouting);
    this._m_static_orthogonal_graph_invalidated = true;
    this._m_in_crossing_rerouting_stage = false;
    this._m_settings_changes = false;
    this._m_debug_handler = null;

    this._m_hyperedge_improver.setRouter(this);
    this._m_hyperedge_rerouter.setRouter(this);
  }

  destroy(): void {
    this._m_currently_calling_destructors = true;

    while (this.connRefs.length > 0) {
      const conn = this.connRefs[0] as ConnRef & { destroy?: () => void };
      if (conn.destroy) conn.destroy();
      else this.connRefs.shift();
    }

    while (this.m_obstacles.length > 0) {
      const obstacle = this.m_obstacles[0] as Obstacle & { destroy?: () => void };
      if (obstacle.isActive && obstacle.isActive()) {
        obstacle.removeFromGraph();
        obstacle.makeInactive();
      }
      if (obstacle.destroy) obstacle.destroy();
      else this.m_obstacles.shift();
    }
    this._m_currently_calling_destructors = false;

    this.destroyOrthogonalVisGraph();
    this._m_topology_addon = null;
  }

  setDebugHandler(handler: DebugHandler | null): void {
    this._m_debug_handler = handler;
  }

  debugHandler(): DebugHandler | null {
    return this._m_debug_handler;
  }

  setTransactionUse(transactions: boolean): void {
    this._m_consolidate_actions = transactions;
  }

  transactionUse(): boolean {
    return this._m_consolidate_actions;
  }

  processTransaction(): boolean {
    if ((this._actionList.length === 0 &&
         this._m_hyperedge_rerouter.count() === 0 &&
         this._m_settings_changes === false) || this.SimpleRouting) {
      return false;
    }
    this._m_settings_changes = false;

    this.processActions();

    this._m_static_orthogonal_graph_invalidated = true;
    this.rerouteAndCallbackConnectors();

    return true;
  }

  addShape(shape: ShapeRef): void {
    console.assert(
      actionListFind(this._actionList, new ActionInfo(ShapeRemove, shape)) === -1,
      'addShape: ShapeRemove already queued'
    );
    console.assert(
      actionListFind(this._actionList, new ActionInfo(ShapeMove, shape)) === -1,
      'addShape: ShapeMove already queued'
    );

    const addInfo: ActionInfo = new ActionInfo(ShapeAdd, shape);
    if (actionListFind(this._actionList, addInfo) === -1) {
      this._actionList.push(addInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  deleteShape(shape: ShapeRef): void {
    console.assert(
      actionListFind(this._actionList, new ActionInfo(ShapeAdd, shape)) === -1,
      'deleteShape: ShapeAdd already queued'
    );

    const moveIdx: number = actionListFind(this._actionList, new ActionInfo(ShapeMove, shape));
    if (moveIdx !== -1) {
      this._actionList.splice(moveIdx, 1);
    }

    const remInfo: ActionInfo = new ActionInfo(ShapeRemove, shape);
    if (actionListFind(this._actionList, remInfo) === -1) {
      this._actionList.push(remInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  moveShape(shape: ShapeRef, polyOrXDiff: Polygon | number, yDiffOrFirstMove?: number | boolean): void {
    if (typeof polyOrXDiff === 'number') {
      const xDiff: number = polyOrXDiff;
      const yDiff: number = yDiffOrFirstMove as number;

      const moveInfo: ActionInfo = new ActionInfo(ShapeMove, shape);
      const foundIdx: number = actionListFind(this._actionList, moveInfo);

      let newPoly: Polygon;
      if (foundIdx !== -1) {
        newPoly = this._actionList[foundIdx].newPoly;
      } else {
        newPoly = Polygon.fromPolygonInterface(
          (shape as ShapeRef & { polygon(): Polygon }).polygon(),
        );
      }
      newPoly.translate(xDiff, yDiff);

      this.moveShape(shape, newPoly, false);
      return;
    }

    const newPoly: Polygon = polyOrXDiff;
    const firstMove: boolean = (yDiffOrFirstMove as boolean) || false;

    console.assert(
      actionListFind(this._actionList, new ActionInfo(ShapeRemove, shape)) === -1,
      'moveShape: ShapeRemove already queued'
    );

    const addIdx: number = actionListFind(this._actionList, new ActionInfo(ShapeAdd, shape));
    if (addIdx !== -1) {
      (this._actionList[addIdx].obstacle() as Obstacle & { setNewPoly(p: Polygon): void }).setNewPoly(newPoly);
      return;
    }

    const moveInfo: ActionInfo = ActionInfo.forShapeMove(ShapeMove, shape, newPoly, firstMove);
    const foundIdx: number = actionListFind(this._actionList, moveInfo);

    if (foundIdx !== -1) {
      this._actionList[foundIdx].newPoly = newPoly;
    } else {
      this._actionList.push(moveInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  addJunction(junction: JunctionRef): void {
    console.assert(
      actionListFind(this._actionList, new ActionInfo(JunctionRemove, junction)) === -1
    );
    console.assert(
      actionListFind(this._actionList, new ActionInfo(JunctionMove, junction)) === -1
    );

    const addInfo: ActionInfo = new ActionInfo(JunctionAdd, junction);
    if (actionListFind(this._actionList, addInfo) === -1) {
      this._actionList.push(addInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  deleteJunction(junction: JunctionRef): void {
    console.assert(
      actionListFind(this._actionList, new ActionInfo(JunctionAdd, junction)) === -1
    );

    const moveIdx: number = actionListFind(this._actionList, new ActionInfo(JunctionMove, junction));
    if (moveIdx !== -1) {
      this._actionList.splice(moveIdx, 1);
    }

    const remInfo: ActionInfo = new ActionInfo(JunctionRemove, junction);
    if (actionListFind(this._actionList, remInfo) === -1) {
      this._actionList.push(remInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  moveJunction(junction: JunctionRef, posOrXDiff: Point | number, yDiff?: number): void {
    if (yDiff !== undefined) {
      const xDiff: number = posOrXDiff as number;
      const moveInfo: ActionInfo = new ActionInfo(JunctionMove, junction);
      const foundIdx: number = actionListFind(this._actionList, moveInfo);

      let newPosition: Point;
      if (foundIdx !== -1) {
        newPosition = this._actionList[foundIdx].newPosition;
      } else {
        newPosition = (junction as JunctionRef & { position(): Point }).position().clone();
      }
      newPosition.x += xDiff;
      newPosition.y += yDiff;

      this.moveJunction(junction, newPosition);
      return;
    }

    const newPosition: Point = posOrXDiff as Point;

    console.assert(
      actionListFind(this._actionList, new ActionInfo(JunctionRemove, junction)) === -1
    );

    const addIdx: number = actionListFind(this._actionList, new ActionInfo(JunctionAdd, junction));
    if (addIdx !== -1) {
      this._actionList[addIdx].junction()!.setPosition(newPosition);
      return;
    }

    const moveInfo: ActionInfo = ActionInfo.forJunctionMove(JunctionMove, junction, newPosition);
    const foundIdx: number = actionListFind(this._actionList, moveInfo);

    if (foundIdx !== -1) {
      this._actionList[foundIdx].newPosition = newPosition;
    } else {
      this._actionList.push(moveInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  modifyConnector(conn: ConnRef, type?: number, connEnd?: ConnEnd, connPinMoveUpdate?: boolean): void {
    if (type === undefined) {
      const modInfo: ActionInfo = new ActionInfo(ConnChange, conn);
      if (actionListFind(this._actionList, modInfo) === -1) {
        this._actionList.push(modInfo);
      }
    } else {
      connPinMoveUpdate = connPinMoveUpdate || false;
      const modInfo: ActionInfo = new ActionInfo(ConnChange, conn);
      const foundIdx: number = actionListFind(this._actionList, modInfo);

      if (foundIdx === -1) {
        modInfo.conns.push({ type, connEnd: connEnd! });
        this._actionList.push(modInfo);
      } else {
        this._actionList[foundIdx].addConnEndUpdate(type, connEnd!, connPinMoveUpdate);
      }
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  deleteConnector(connector: ConnRef): void {
    this._m_currently_calling_destructors = true;
    const c = connector as ConnRef & { destroy?: () => void };
    if (c.destroy) c.destroy();
    this._m_currently_calling_destructors = false;
  }

  modifyConnectionPin(pin: ShapeConnectionPin): void {
    const modInfo: ActionInfo = new ActionInfo(ConnectionPinChange, pin);
    if (actionListFind(this._actionList, modInfo) === -1) {
      this._actionList.push(modInfo);
    }

    if (!this._m_consolidate_actions) {
      this.processTransaction();
    }
  }

  addCluster(cluster: ClusterRef): void {
    cluster.makeActive();
    const pid: number = cluster.id();
    const poly = cluster.polygon();
    this.adjustClustersWithAdd(poly, pid);
  }

  deleteCluster(cluster: ClusterRef): void {
    cluster.makeInactive();
    const pid: number = cluster.id();
    this.adjustClustersWithDel(pid);
  }

  removeObjectFromQueuedActions(object: Obstacle | ConnRef | ShapeConnectionPin): void {
    for (let i: number = this._actionList.length - 1; i >= 0; i--) {
      if (this._actionList[i].objPtr === object) {
        this._actionList.splice(i, 1);
      }
    }
  }

  processActions(): void {
    const notPartialTime: boolean = !(this.PartialFeedback && this.PartialTime);
    let seenShapeMovesOrDeletes: boolean = false;

    this._m_transaction_start_time = Date.now();
    this._m_abort_transaction = false;

    const deletedObstacles: number[] = [];
    actionListSort(this._actionList);

    // --- Phase 1: remove / move obstacles ---
    for (let i: number = 0; i < this._actionList.length; i++) {
      const actInf: ActionInfo = this._actionList[i];
      if (!(actInf.type === ShapeRemove || actInf.type === ShapeMove ||
            actInf.type === JunctionRemove || actInf.type === JunctionMove)) {
        continue;
      }
      seenShapeMovesOrDeletes = true;

      const obstacle: Obstacle = actInf.obstacle();
      const shape: ShapeRef | null = actInf.shape();
      const junction: JunctionRef | null = actInf.junction();
      const isMove: boolean = (actInf.type === ShapeMove || actInf.type === JunctionMove);
      const firstMoveFlag: boolean = actInf.firstMove;
      const pid: number = obstacle.id();

      obstacle.removeFromGraph();

      if (this.SelectiveReroute && (!isMove || notPartialTime || firstMoveFlag)) {
        this.markPolylineConnectorsNeedingReroutingForDeletedObstacle(obstacle);
      }

      this.adjustContainsWithDel(pid);

      if (isMove) {
        if (shape) {
          (shape as ShapeRef & { moveAttachedConns(p: Polygon): void }).moveAttachedConns(actInf.newPoly);
        } else if (junction) {
          (junction as JunctionRef & { moveAttachedConns(p: Point): void }).moveAttachedConns(actInf.newPosition);
        }
      }

      obstacle.makeInactive();

      if (!isMove) {
        this._m_currently_calling_destructors = true;
        deletedObstacles.push(obstacle.id());
        const obs = obstacle as Obstacle & { destroy?: () => void };
        if (obs.destroy) obs.destroy();
        this._m_currently_calling_destructors = false;
      }
    }

    if (seenShapeMovesOrDeletes && this._m_allows_polyline_routing) {
      if (this.InvisibilityGrph) {
        for (let i: number = 0; i < this._actionList.length; i++) {
          const actInf: ActionInfo = this._actionList[i];
          if (actInf.type === ShapeMove || actInf.type === JunctionMove) {
            this.checkAllBlockedEdges(actInf.obstacle().id());
          }
        }
        for (let i: number = 0; i < deletedObstacles.length; i++) {
          this.checkAllBlockedEdges(deletedObstacles[i]);
        }
      } else {
        this.checkAllMissingEdges();
      }
    }

    // --- Phase 2: add / re-add obstacles ---
    for (let i: number = 0; i < this._actionList.length; i++) {
      const actInf: ActionInfo = this._actionList[i];
      if (!(actInf.type === ShapeAdd || actInf.type === ShapeMove ||
            actInf.type === JunctionAdd || actInf.type === JunctionMove)) {
        continue;
      }

      const obstacle: Obstacle = actInf.obstacle();
      const shape: ShapeRef | null = actInf.shape();
      const junction: JunctionRef | null = actInf.junction();
      const newPoly: Polygon = actInf.newPoly;
      const isMove: boolean = (actInf.type === ShapeMove || actInf.type === JunctionMove);
      const pid: number = obstacle.id();

      obstacle.makeActive();

      if (isMove) {
        if (shape) {
          (shape as ShapeRef & { setNewPoly(p: Polygon): void }).setNewPoly(newPoly);
        } else if (junction) {
          (junction as JunctionRef & { setPosition(p: Point): void }).setPosition(actInf.newPosition);
        }
      }

      const shapePoly: Polygon = obstacle.routingPolygon();
      this.adjustContainsWithAdd(shapePoly, pid);

      if (this._m_allows_polyline_routing) {
        if (!isMove || notPartialTime) {
          this.newBlockingShape(shapePoly, pid);
        }

        if (this.UseLeesAlgorithm) {
          obstacle.computeVisibilitySweep();
        } else {
          obstacle.computeVisibilityNaive();
        }
        const obs = obstacle as Obstacle & { updatePinPolyLineVisibility?: () => void };
        if (obs.updatePinPolyLineVisibility) {
          obs.updatePinPolyLineVisibility();
        }
      }
    }

    // --- Phase 3: update connector endpoints ---
    for (let i: number = 0; i < this._actionList.length; i++) {
      const actInf: ActionInfo = this._actionList[i];
      if (actInf.type !== ConnChange) continue;

      for (let j: number = 0; j < actInf.conns.length; j++) {
        const cu = actInf.conns[j];
        (actInf.conn() as ConnRef & { updateEndPoint(t: number, ce: ConnEnd): void }).updateEndPoint(cu.type, cu.connEnd);
      }
    }

    this._actionList.length = 0;
  }

  setRoutingParameter(parameter: RoutingParameter, value: number = chooseSensibleParamValue): void {
    console.assert(parameter < lastRoutingParameterMarker);

    if (value < 0) {
      switch (parameter) {
        case segmentPenalty:           this._m_routing_parameters[parameter] = 50;   break;
        case fixedSharedPathPenalty:   this._m_routing_parameters[parameter] = 110;  break;
        case anglePenalty:             this._m_routing_parameters[parameter] = 50;   break;
        case crossingPenalty:          this._m_routing_parameters[parameter] = 200;  break;
        case clusterCrossingPenalty:   this._m_routing_parameters[parameter] = 4000; break;
        case idealNudgingDistance:     this._m_routing_parameters[parameter] = 4.0;  break;
        case portDirectionPenalty:     this._m_routing_parameters[parameter] = 100;  break;
        default:                       this._m_routing_parameters[parameter] = 50;   break;
      }
    } else {
      this._m_routing_parameters[parameter] = value;
    }
    this._m_settings_changes = true;
  }

  routingParameter(parameter: RoutingParameter): number {
    console.assert(parameter < lastRoutingParameterMarker);
    return this._m_routing_parameters[parameter];
  }

  setRoutingOption(option: RoutingOption, value: boolean): void {
    console.assert(option < lastRoutingOptionMarker);
    this._m_routing_options[option] = value;
    this._m_settings_changes = true;
  }

  routingOption(option: RoutingOption): boolean {
    console.assert(option < lastRoutingOptionMarker);
    return this._m_routing_options[option];
  }

  setRoutingPenalty(penType: RoutingParameter, penVal: number = chooseSensibleParamValue): void {
    this.setRoutingParameter(penType, penVal);
  }

  registerSettingsChange(): void {
    this._m_settings_changes = true;
  }

  regenerateStaticBuiltGraph(): void {
    if (this._m_static_orthogonal_graph_invalidated) {
      if (this._m_allows_orthogonal_routing) {
        this.destroyOrthogonalVisGraph();

        if (typeof generateStaticOrthogonalVisGraph === 'function') {
          generateStaticOrthogonalVisGraph(this);
        } else if (this._generateStaticOrthogonalVisGraph) {
          this._generateStaticOrthogonalVisGraph(this);
        }
      }
      this._m_static_orthogonal_graph_invalidated = false;
    }
  }

  destroyOrthogonalVisGraph(): void {
    this.visOrthogGraph.clear();

    let curr: VertInf | null = this.vertices.shapesBegin();
    while (curr) {
      if (curr.orphaned() && curr.id.equals(dummyOrthogID)) {
        const following: VertInf | null = this.vertices.removeVertex(curr);
        curr = following;
        continue;
      }
      curr = curr.lstNext;
    }
  }

  setStaticGraphInvalidated(invalidated: boolean): void {
    this._m_static_orthogonal_graph_invalidated = invalidated;
  }

  rerouteAndCallbackConnectors(): void {
    const reroutedConns: ConnRef[] = [];

    this.m_conn_reroute_flags.alertConns();
    this.regenerateStaticBuiltGraph();

    for (let i: number = 0; i < this.connRefs.length; i++) {
      (this.connRefs[i] as ConnRef & { freeActivePins(): void }).freeActivePins();
    }

    const hyperedgeConns: Set<ConnRef> = this._m_hyperedge_rerouter.calcHyperedgeConnectors();

    const totalConns: number = this.connRefs.length;
    let numOfReroutedConns: number = 0;
    for (let i: number = 0; i < this.connRefs.length; i++) {
      this.performContinuationCheck(TransactionPhaseRouteSearch,
          numOfReroutedConns, totalConns);
      numOfReroutedConns++;

      const connector = this.connRefs[i] as ConnRef & {
        hasFixedRoute?: () => boolean;
        m_needs_repaint: boolean;
        generatePath(): boolean;
        performCallback?: () => void;
      };
      if (hyperedgeConns.has(connector)) continue;
      if (connector.hasFixedRoute && connector.hasFixedRoute()) continue;

      connector.m_needs_repaint = false;
      const rerouted: boolean = connector.generatePath();
      if (rerouted) {
        reroutedConns.push(connector);
      }
    }

    this._m_hyperedge_rerouter.performRerouting();
    this.improveCrossings();

    const withMinor: boolean = this.routingOption(improveHyperedgeRoutesMovingJunctions);
    const withMajor: boolean = this.routingOption(improveHyperedgeRoutesMovingAddingAndDeletingJunctions);
    if (withMinor || withMajor) {
      this._m_hyperedge_improver.clear();
      this._m_hyperedge_improver.execute(withMajor);
    }

    if (this._improveOrthogonalRoutes) {
      this._improveOrthogonalRoutes(this);
    }

    let changedObjs: HyperedgeObjectLists = this._m_hyperedge_improver.newAndDeletedObjectLists();
    const deletedConns: ConnRef[] = [...(changedObjs.deletedConnectorList || [])];
    for (let idx: number = 0; idx < this._m_hyperedge_rerouter.count(); idx++) {
      changedObjs = this._m_hyperedge_rerouter.newAndDeletedObjectLists(idx);
      if (changedObjs.deletedConnectorList) {
        deletedConns.push(...changedObjs.deletedConnectorList);
      }
    }

    for (let i: number = 0; i < reroutedConns.length; i++) {
      const conn = reroutedConns[i] as ConnRef & {
        m_needs_repaint: boolean;
        performCallback?: () => void;
      };
      if (deletedConns.indexOf(conn) !== -1) continue;
      conn.m_needs_repaint = true;
      if (conn.performCallback) conn.performCallback();
    }

    this.performContinuationCheck(TransactionPhaseCompleted, 1, 1);
  }

  improveCrossings(): void {
    const crossing_penalty: number = this.routingParameter(crossingPenalty);
    const shared_path_penalty: number = this.routingParameter(fixedSharedPathPenalty);
    if (crossing_penalty === 0 && shared_path_penalty === 0) return;

    const crossingConnInfo: CrossingConnectorsInfo = new CrossingConnectorsInfo();
    const numOfConns: number = this.connRefs.length;
    let numOfConnsChecked: number = 0;

    this._m_in_crossing_rerouting_stage = true;

    for (let i: number = 0; i < this.connRefs.length; i++) {
      numOfConnsChecked++;
      this.performContinuationCheck(4 /* TransactionPhaseCrossingDetection */,
          numOfConnsChecked, numOfConns);
      if (this._m_abort_transaction) {
        this._m_in_crossing_rerouting_stage = false;
        return;
      }

      const iConn = this.connRefs[i] as ConnRef & {
        routeRef?: () => Polygon;
        m_route?: Polygon;
      };
      const iRoute: Polygon | null | undefined = iConn.routeRef ? iConn.routeRef() : iConn.m_route;
      if (!iRoute || iRoute.size() === 0) continue;

      for (let j: number = i + 1; j < this.connRefs.length; j++) {
        if (crossingConnInfo.connsKnownToCross(iConn, this.connRefs[j])) continue;

        const jConn = this.connRefs[j] as ConnRef & {
          routeRef?: () => Polygon;
          m_route?: Polygon;
        };
        const jRoute: Polygon | null | undefined = jConn.routeRef ? jConn.routeRef() : jConn.m_route;
        if (!jRoute || jRoute.size() === 0) continue;

        if (typeof this._ConnectorCrossings === 'function') {
          const cross = new this._ConnectorCrossings(iRoute, true, jRoute, iConn, jConn);
          for (let jInd: number = 1; jInd < jRoute.size(); jInd++) {
            const finalSeg: boolean = (jInd + 1) === jRoute.size();
            cross.countForSegment(jInd, finalSeg);

            if (shared_path_penalty > 0 &&
                (cross.crossingFlags & CROSSING_SHARES_PATH) &&
                (cross.crossingFlags & CROSSING_SHARES_FIXED_SEGMENT) &&
                (this._m_routing_options[penaliseOrthogonalSharedPathsAtConnEnds] ||
                 !(cross.crossingFlags & CROSSING_SHARES_PATH_AT_END))) {
              crossingConnInfo.addCrossing(iConn, jConn);
              break;
            } else if (crossing_penalty > 0 && cross.crossingCount > 0) {
              crossingConnInfo.addCrossing(iConn, jConn);
              break;
            }
          }
        }
      }
    }

    const crossingConnsGroups: CrossingSetEntry[][] = crossingConnInfo.crossingSetsListToRemoveCrossingsFromGroups();
    let numOfConnsToReroute: number = 1;
    let numOfConnsRerouted: number = 1;

    for (let gi: number = 0; gi < crossingConnsGroups.length; gi++) {
      const orderedConnList: CrossingSetEntry[] = crossingConnsGroups[gi].slice();
      orderedConnList.sort((a: CrossingSetEntry, b: CrossingSetEntry): number => a.cost - b.cost);

      for (let ci: number = 0; ci < orderedConnList.length; ci++) {
        numOfConnsToReroute++;
        const conn = orderedConnList[ci].conn as ConnRef & {
          makePathInvalid?: () => void;
          freeRoutes?: () => void;
          freeActivePins?: () => void;
        };
        if (conn.makePathInvalid) conn.makePathInvalid();
        if (conn.freeRoutes) conn.freeRoutes();
        if (conn.freeActivePins) conn.freeActivePins();
      }

      for (let ci: number = 0; ci < orderedConnList.length; ci++) {
        this.performContinuationCheck(5 /* TransactionPhaseRerouteSearch */,
            numOfConnsRerouted, numOfConnsToReroute);
        if (this._m_abort_transaction) {
          this._m_in_crossing_rerouting_stage = false;
          return;
        }
        numOfConnsRerouted++;
        (orderedConnList[ci].conn as ConnRef & { generatePath(): boolean }).generatePath();
      }
    }

    this._m_in_crossing_rerouting_stage = false;
  }

  generateContains(pt: VertInf): void {
    const key: string = pt.id.toString();
    this.contains.set(key, new Set<number>());
    this.enclosingClusters.set(key, new Set<number>());

    const countBorder: boolean = false;

    for (let i: number = 0; i < this.m_obstacles.length; i++) {
      if (inPoly(this.m_obstacles[i].routingPolygon(), pt.point, countBorder)) {
        this.contains.get(key)!.add(this.m_obstacles[i].id());
      }
    }

    for (let i: number = 0; i < this.clusterRefs.length; i++) {
      if (inPolyGen(this.clusterRefs[i].polygon(), pt.point)) {
        this.enclosingClusters.get(key)!.add(this.clusterRefs[i].id());
      }
    }
  }

  adjustContainsWithAdd(poly: Polygon, p_shape: number): void {
    const countBorder: boolean = false;
    let k: VertInf | null = this.vertices.connsBegin();
    const shapesBegin: VertInf | null = this.vertices.shapesBegin();
    while (k !== null && k !== shapesBegin) {
      if (inPoly(poly, k.point, countBorder)) {
        const key: string = k.id.toString();
        if (!this.contains.has(key)) {
          this.contains.set(key, new Set<number>());
        }
        this.contains.get(key)!.add(p_shape);
      }
      k = k.lstNext;
    }
  }

  adjustContainsWithDel(p_shape: number): void {
    for (const [_key, shapeSet] of this.contains) {
      shapeSet.delete(p_shape);
    }
  }

  adjustClustersWithAdd(poly: PolygonInterface, p_cluster: number): void {
    let k: VertInf | null = this.vertices.connsBegin();
    const shapesBegin: VertInf | null = this.vertices.shapesBegin();
    while (k !== null && k !== shapesBegin) {
      if (inPolyGen(poly, k.point)) {
        const key: string = k.id.toString();
        if (!this.enclosingClusters.has(key)) {
          this.enclosingClusters.set(key, new Set<number>());
        }
        this.enclosingClusters.get(key)!.add(p_cluster);
      }
      k = k.lstNext;
    }
  }

  adjustClustersWithDel(p_cluster: number): void {
    for (const [_key, clusterSet] of this.enclosingClusters) {
      clusterSet.delete(p_cluster);
    }
  }

  assignId(suggestedId: number): number {
    const assignedId: number = (suggestedId === 0) ? this.newObjectId() : suggestedId;
    console.assert(this.objectIdIsUnused(assignedId),
      `Router.assignId: ID ${assignedId} is already in use`);
    this._m_largest_assigned_id = Math.max(this._m_largest_assigned_id, assignedId);
    return assignedId;
  }

  newObjectId(): number {
    return this._m_largest_assigned_id + 1;
  }

  objectIdIsUnused(id: number): boolean {
    for (let i: number = 0; i < this.m_obstacles.length; i++) {
      if (this.m_obstacles[i].id() === id) return false;
    }
    for (let i: number = 0; i < this.connRefs.length; i++) {
      if (this.connRefs[i].id() === id) return false;
    }
    for (let i: number = 0; i < this.clusterRefs.length; i++) {
      if (this.clusterRefs[i].id() === id) return false;
    }
    return true;
  }

  attachedConns(shapeId: number, type: number): number[] {
    const result: number[] = [];
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const conn = this.connRefs[i] as ConnRef & {
        endpointAnchors(): { first: EndpointAnchor | null; second: EndpointAnchor | null };
      };
      const anchors = conn.endpointAnchors();

      if ((type & runningTo) && anchors.second && anchors.second.id() === shapeId) {
        result.push(conn.id());
      } else if ((type & runningFrom) && anchors.first && anchors.first.id() === shapeId) {
        result.push(conn.id());
      }
    }
    return result;
  }

  attachedShapes(shapeId: number, type: number): number[] {
    const result: number[] = [];
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const conn = this.connRefs[i] as ConnRef & {
        endpointAnchors(): { first: EndpointAnchor | null; second: EndpointAnchor | null };
      };
      const anchors = conn.endpointAnchors();

      if ((type & runningTo) && anchors.second && anchors.second.id() === shapeId) {
        if (anchors.first) result.push(anchors.first.id());
      } else if ((type & runningFrom) && anchors.first && anchors.first.id() === shapeId) {
        if (anchors.second) result.push(anchors.second.id());
      }
    }
    return result;
  }

  newBlockingShape(poly: Polygon, pid: number): void {
    let iter: EdgeInf | null = this.visGraph.begin();
    while (iter !== null) {
      const tmp: EdgeInf = iter;
      iter = iter.lstNext;

      if (tmp.getDist() !== 0) {
        const ids: [VertID, VertID] = tmp.ids();
        const eID1: VertID = ids[0];
        const eID2: VertID = ids[1];
        const pts: [Point, Point] = tmp.points();
        const e1: Point = pts[0];
        const e2: Point = pts[1];

        const countBorder: boolean = false;
        const ep_in_poly1: boolean = eID1.isConnPt() ? inPoly(poly, e1, countBorder) : false;
        const ep_in_poly2: boolean = eID2.isConnPt() ? inPoly(poly, e2, countBorder) : false;
        if (ep_in_poly1 || ep_in_poly2) continue;

        let blocked: boolean = false;
        let seenIntersectionAtEndpoint: boolean = false;
        for (let pt_i: number = 0; pt_i < poly.size(); pt_i++) {
          const pt_n: number = (pt_i === poly.size() - 1) ? 0 : pt_i + 1;
          const pi: Point = poly.ps[pt_i];
          const pn: Point = poly.ps[pt_n];
          if (segmentShapeIntersect(e1, e2, pi, pn, { seenIntersectionAtEndpoint })) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          tmp.alertConns();
          if (this.InvisibilityGrph) {
            tmp.addBlocker(pid);
          } else {
            tmp.destroy();
          }
        }
      }
    }
  }

  checkAllBlockedEdges(pid: number): void {
    let iter: EdgeInf | null = this.invisGraph.begin();
    while (iter !== null) {
      const tmp: EdgeInf = iter;
      iter = iter.lstNext;

      if (tmp.blocker() === -1) {
        tmp.alertConns();
        tmp.checkVis();
      } else if (tmp.blocker() === pid) {
        tmp.checkVis();
      }
    }
  }

  checkAllMissingEdges(): void {
    const first: VertInf | null = this.vertices.connsBegin();
    const pend: VertInf | null = this.vertices.end();
    for (let i: VertInf | null = first; i !== pend && i !== null; i = i.lstNext) {
      const iID: VertID = i.id;
      for (let j: VertInf | null = first; j !== i && j !== null; j = j.lstNext) {
        const jID: VertID = j.id;
        if (iID.isConnPt() && !iID.isConnectionPin() && iID.objID !== jID.objID) {
          continue;
        }
        const found: boolean = EdgeInf.existingEdge(i, j) !== null;
        if (!found) {
          const knownNew: boolean = true;
          EdgeInf.checkEdgeVisibility(i, j, knownNew);
        }
      }
    }
  }

  markPolylineConnectorsNeedingReroutingForDeletedObstacle(obstacle: Obstacle): void {
    if (this.RubberBandRouting) return;

    for (let idx: number = 0; idx < this.connRefs.length; idx++) {
      const conn = this.connRefs[idx] as ConnRef & {
        m_route?: Polygon & { empty(): boolean };
        m_needs_reroute_flag: boolean;
        routingType?: () => number;
        m_route_dist: number;
      };
      if (!conn.m_route || conn.m_route.empty()) continue;
      if (conn.m_needs_reroute_flag) continue;
      if (conn.routingType && conn.routingType() !== ConnType_PolyLine) continue;

      let start: Point = conn.m_route.ps[0];
      let end: Point = conn.m_route.ps[conn.m_route.size() - 1];
      const conndist: number = conn.m_route_dist;

      const beginV = obstacle.firstVert();
      const endV = obstacle.lastVert()?.lstNext ?? null;
      for (let vi = beginV; vi !== endV && vi !== null; vi = vi.lstNext) {
        const p1: Point = vi.point;
        const p2: Point = vi.shNext!.point;

        let offy: number, a: number, b: number, c: number, d: number, min: number, max: number;

        if (p1.y === p2.y) {
          offy = p1.y;
          a = start.x;  b = start.y - offy;
          c = end.x;    d = end.y - offy;
          min = Math.min(p1.x, p2.x);
          max = Math.max(p1.x, p2.x);
        } else if (p1.x === p2.x) {
          offy = p1.x;
          a = start.y;  b = start.x - offy;
          c = end.y;    d = end.x - offy;
          min = Math.min(p1.y, p2.y);
          max = Math.max(p1.y, p2.y);
        } else {
          const n_p2: Point = new Point(p2.x - p1.x, p2.y - p1.y);
          const n_start: Point = new Point(start.x - p1.x, start.y - p1.y);
          const n_end: Point = new Point(end.x - p1.x, end.y - p1.y);
          const theta: number = -Math.atan2(n_p2.y, n_p2.x);
          const cosv: number = Math.cos(theta);
          const sinv: number = Math.sin(theta);

          const r_p1: Point = new Point(0, 0);
          const r_p2: Point = new Point(
            cosv * n_p2.x - sinv * n_p2.y,
            0
          );
          start = new Point(
            cosv * n_start.x - sinv * n_start.y,
            cosv * n_start.y + sinv * n_start.x
          );
          end = new Point(
            cosv * n_end.x - sinv * n_end.y,
            cosv * n_end.y + sinv * n_end.x
          );

          offy = r_p1.y;
          a = start.x;  b = start.y - offy;
          c = end.x;    d = end.y - offy;
          min = Math.min(r_p1.x, r_p2.x);
          max = Math.max(r_p1.x, r_p2.x);
        }

        let x: number;
        if ((b + d) === 0) {
          d = -d;
        }
        if (b === 0 && d === 0) {
          if ((a < min && c < min) || (a > max && c > max)) {
            x = a;
          } else {
            continue;
          }
        } else {
          x = (b * c + a * d) / (b + d);
        }

        x = Math.max(min, x);
        x = Math.min(max, x);

        let xp: Point;
        if (p1.x === p2.x) {
          xp = new Point(offy, x);
        } else {
          xp = new Point(x, offy);
        }

        const e1: number = euclideanDist(start, xp);
        const e2: number = euclideanDist(xp, end);
        const estdist: number = e1 + e2;

        if (estdist < conndist) {
          conn.m_needs_reroute_flag = true;
          break;
        }
      }
    }
  }

  markAllObstaclesAsMoved(): void {
    for (let i: number = 0; i < this.m_obstacles.length; i++) {
      const obs = this.m_obstacles[i] as Obstacle & {
        _isShape?: boolean;
        _isJunction?: boolean;
      };
      if (obs._isShape) {
        this.moveShape(obs as unknown as ShapeRef, 0, 0);
      } else if (obs._isJunction) {
        this.moveJunction(obs as unknown as JunctionRef, 0, 0);
      }
    }
  }

  validConnType(select: ConnType = ConnType_None): ConnType {
    if (select !== ConnType_None) {
      if (select === ConnType_Orthogonal && this._m_allows_orthogonal_routing) {
        return ConnType_Orthogonal;
      } else if (select === ConnType_PolyLine && this._m_allows_polyline_routing) {
        return ConnType_PolyLine;
      }
    }
    if (this._m_allows_polyline_routing) return ConnType_PolyLine;
    if (this._m_allows_orthogonal_routing) return ConnType_Orthogonal;
    return ConnType_None;
  }

  isInCrossingPenaltyReroutingStage(): boolean {
    return this._m_in_crossing_rerouting_stage;
  }

  shapeContainingPoint(point: Point): ShapeRef | null {
    const countBorder: boolean = true;
    for (let i: number = 0; i < this.m_obstacles.length; i++) {
      const obs = this.m_obstacles[i] as Obstacle & { _isShape?: boolean };
      if (obs._isShape && inPoly(obs.routingPolygon(), point, countBorder)) {
        return obs as unknown as ShapeRef;
      }
    }
    return null;
  }

  performContinuationCheck(phaseNumber: TransactionPhase, stepNumber: number, totalSteps: number): void {
    const elapsedMsec: number = Date.now() - this._m_transaction_start_time;
    const shouldContinue: boolean = this.shouldContinueTransactionWithProgress(
      elapsedMsec, phaseNumber, TransactionPhaseCompleted,
      stepNumber / totalSteps
    );
    if (!shouldContinue) {
      this._m_abort_transaction = true;
    }
  }

  shouldContinueTransactionWithProgress(
    _elapsedTime: number,
    _phaseNumber: TransactionPhase,
    _totalPhases: number,
    _proportion: number,
  ): boolean {
    return true;
  }

  hyperedgeRerouter(): HyperedgeRerouterStub {
    return this._m_hyperedge_rerouter;
  }

  newAndDeletedObjectListsFromHyperedgeImprovement(): HyperedgeObjectLists {
    return this._m_hyperedge_improver.newAndDeletedObjectLists();
  }

  setTopologyAddon(topologyAddon: TopologyAddonInterface | null): void {
    this._m_topology_addon = null;
    if (topologyAddon) {
      this._m_topology_addon = topologyAddon.clone();
    } else {
      this._m_topology_addon = new TopologyAddonInterface();
    }
    this.registerSettingsChange();
  }

  improveOrthogonalTopology(): void {
    if (this._m_topology_addon) {
      this._m_topology_addon.improveOrthogonalTopology(this);
    }
  }

  printInfo(): void {
    let currshape: number = 0;
    let st_shapes: number = 0;
    let st_vertices: number = 0;
    let st_endpoints: number = 0;
    let st_valid_shape_visedges: number = 0;
    let st_valid_endpt_visedges: number = 0;
    let st_orthogonal_visedges: number = 0;
    let st_invalid_visedges: number = 0;

    const finish: VertInf | null = this.vertices.end();
    for (let t: VertInf | null = this.vertices.connsBegin(); t !== finish && t !== null; t = t.lstNext) {
      const pID: VertID = t.id;
      if (!pID.isConnPt() && pID.objID !== currshape) {
        currshape = pID.objID;
        st_shapes++;
      }
      if (!pID.isConnPt()) {
        st_vertices++;
      } else {
        st_endpoints++;
      }
    }
    for (let t: EdgeInf | null = this.visGraph.begin(); t !== this.visGraph.end() && t !== null; t = t.lstNext) {
      const idpair: [VertID, VertID] = t.ids();
      if (idpair[0].isConnPt() || idpair[1].isConnPt()) {
        st_valid_endpt_visedges++;
      } else {
        st_valid_shape_visedges++;
      }
    }
    for (let t: EdgeInf | null = this.invisGraph.begin(); t !== this.invisGraph.end() && t !== null; t = t.lstNext) {
      st_invalid_visedges++;
    }
    for (let t: EdgeInf | null = this.visOrthogGraph.begin(); t !== this.visOrthogGraph.end() && t !== null; t = t.lstNext) {
      st_orthogonal_visedges++;
    }

    console.log('Visibility Graph info:');
    console.log(`  Shapes: ${st_shapes}`);
    console.log(`  Vertices: ${st_vertices + st_endpoints} (${st_vertices} real, ${st_endpoints} endpoints)`);
    console.log(`  Orthog vis edges: ${st_orthogonal_visedges}`);
    console.log(`  Vis edges: ${st_valid_shape_visedges + st_invalid_visedges + st_valid_endpt_visedges}`);
    console.log(`  Checked edges: ${this.st_checked_edges}`);
  }

  existsOrthogonalSegmentOverlap(atEnds: boolean = false): boolean {
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const iRoute: Polygon = (this.connRefs[i] as ConnRef & { displayRoute(): Polygon }).displayRoute();
      for (let j: number = i + 1; j < this.connRefs.length; j++) {
        const jRoute: Polygon = (this.connRefs[j] as ConnRef & { displayRoute(): Polygon }).displayRoute();
        if (this._ConnectorCrossings) {
          const cross = new this._ConnectorCrossings(iRoute, true, jRoute, this.connRefs[i], this.connRefs[j]);
          cross.checkForBranchingSegments = true;
          for (let jInd: number = 1; jInd < jRoute.size(); jInd++) {
            const finalSeg: boolean = (jInd + 1) === jRoute.size();
            cross.countForSegment(jInd, finalSeg);
            if ((cross.crossingFlags & CROSSING_SHARES_PATH) &&
                (atEnds || !(cross.crossingFlags & CROSSING_SHARES_PATH_AT_END))) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  existsOrthogonalFixedSegmentOverlap(atEnds: boolean = false): boolean {
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const iRoute: Polygon = (this.connRefs[i] as ConnRef & { displayRoute(): Polygon }).displayRoute();
      for (let j: number = i + 1; j < this.connRefs.length; j++) {
        const jRoute: Polygon = (this.connRefs[j] as ConnRef & { displayRoute(): Polygon }).displayRoute();
        if (this._ConnectorCrossings) {
          const cross = new this._ConnectorCrossings(iRoute, true, jRoute, this.connRefs[i], this.connRefs[j]);
          cross.checkForBranchingSegments = true;
          for (let jInd: number = 1; jInd < jRoute.size(); jInd++) {
            const finalSeg: boolean = (jInd + 1) === jRoute.size();
            cross.countForSegment(jInd, finalSeg);
            if ((cross.crossingFlags & CROSSING_SHARES_PATH) &&
                (cross.crossingFlags & CROSSING_SHARES_FIXED_SEGMENT) &&
                (atEnds || !(cross.crossingFlags & CROSSING_SHARES_PATH_AT_END))) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  existsOrthogonalTouchingPaths(): boolean {
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const iRoute: Polygon = (this.connRefs[i] as ConnRef & { displayRoute(): Polygon }).displayRoute();
      for (let j: number = i + 1; j < this.connRefs.length; j++) {
        const jRoute: Polygon = (this.connRefs[j] as ConnRef & { displayRoute(): Polygon }).displayRoute();
        if (this._ConnectorCrossings) {
          const cross = new this._ConnectorCrossings(iRoute, true, jRoute, this.connRefs[i], this.connRefs[j]);
          cross.checkForBranchingSegments = true;
          for (let jInd: number = 1; jInd < jRoute.size(); jInd++) {
            const finalSeg: boolean = (jInd + 1) === jRoute.size();
            cross.countForSegment(jInd, finalSeg);
            if (cross.crossingFlags & CROSSING_TOUCHES) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  existsCrossings(optimisedForConnectorType: boolean = false): number {
    let count: number = 0;
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const iRoute: Polygon = (this.connRefs[i] as ConnRef & { displayRoute(): Polygon }).displayRoute();
      for (let j: number = i + 1; j < this.connRefs.length; j++) {
        const jRoute: Polygon = (this.connRefs[j] as ConnRef & { displayRoute(): Polygon }).displayRoute();
        if (this._ConnectorCrossings) {
          const iConn: ConnRef | null = optimisedForConnectorType ? this.connRefs[i] : null;
          const jConn: ConnRef | null = optimisedForConnectorType ? this.connRefs[j] : null;
          const cross = new this._ConnectorCrossings(iRoute, true, jRoute, iConn, jConn);
          cross.checkForBranchingSegments = true;
          for (let jInd: number = 1; jInd < jRoute.size(); jInd++) {
            const finalSeg: boolean = (jInd + 1) === jRoute.size();
            cross.countForSegment(jInd, finalSeg);
            count += cross.crossingCount;
          }
        }
      }
    }
    return count;
  }

  existsInvalidOrthogonalPaths(): boolean {
    for (let i: number = 0; i < this.connRefs.length; i++) {
      const conn = this.connRefs[i] as ConnRef & {
        routingType?: () => number;
        displayRoute(): Polygon;
      };
      if (conn.routingType && conn.routingType() === ConnType_Orthogonal) {
        const iRoute: Polygon = conn.displayRoute();
        for (let iInd: number = 1; iInd < iRoute.size(); iInd++) {
          if (iRoute.at(iInd - 1).x !== iRoute.at(iInd).x &&
              iRoute.at(iInd - 1).y !== iRoute.at(iInd).y) {
            return true;
          }
        }
      }
    }
    return false;
  }

  outputInstanceToSVG(_filename: string): void {
    // No-op in JS port.
  }

  outputDiagramSVG(_instanceName: string, _lineReps?: unknown): void {
    // No-op in JS port.
  }

  outputDiagramText(_instanceName: string): void {
    // No-op in JS port.
  }

  outputDiagram(_instanceName: string): void {
    // No-op in JS port.
  }
}
