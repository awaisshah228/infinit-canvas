/*
 * libavoid-js - JavaScript port of libavoid connector.h / connector.cpp
 * Original C++ library: Copyright (C) 2004-2015 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import {
  ConnDirAll,
  ConnDirNone,
  ConnType_PolyLine,
  ConnType_Orthogonal,
  kUnassignedVertexNumber,
  XDIM,
  YDIM,
  PROP_ConnPoint,
  PROP_ConnCheckpoint,
  PROP_DummyPinHelper,
  VertID_src,
  VertID_tar,
  CROSSING_NONE,
  CROSSING_SHARES_PATH,
  CROSSING_SHARES_PATH_AT_END,
  CROSSING_SHARES_FIXED_SEGMENT,
  DO_INTERSECT,
} from '../core/constants';

import { Point, Polygon } from '../core/geomtypes';

import {
  vecDir,
  euclideanDist,
  manhattanDist,
  pointOnLine,
  cornerSide,
  segmentIntersectPoint,
} from '../core/geometry';

import type { VertInf, VertID } from '../graph/vertices';
import type { ConnEnd } from './connend';

// TODO: circular dep -- import { vertexVisibility } from '../graph/visibility';
// TODO: circular dep -- import { AStarPath } from '../routing/makepath';
// TODO: circular dep -- import { JunctionRef } from '../hyperedge/junction';
// TODO: circular dep -- import { Router } from '../router';

// ---- Crossing flag not currently in constants.js ----
export const CROSSING_TOUCHES: number = 1;

// ---- Connector types (re-exported for convenience) ----
export const ConnType_None: number = 0;
export { ConnType_PolyLine, ConnType_Orthogonal };

/** VertID-like plain object used in placeholder vertices and ptID construction. */
interface VertIDLike {
  objID: number;
  vn: number;
  props?: number;
  isConnPt?: () => boolean;
  isConnectionPin?: () => boolean;
  isConnCheckpoint?: () => boolean;
}

/** Placeholder VertInf-like object returned by _makePlaceholderVert. */
interface PlaceholderVert {
  router: any;
  id: VertIDLike;
  point: Point;
  visDirections: number;
  pathNext: PlaceholderVert | null;
  shPrev: PlaceholderVert | null;
  shNext: PlaceholderVert | null;
  removeFromGraph(isConn?: boolean): void;
  Reset(newId: VertIDLike, newPoint: Point): void;
  setVisibleDirections?: (dirs: number) => void;
  pathLeadsBackTo?: (target: any) => number;
}

/** A point-pair used in PtOrder. */
interface PointConnPair {
  first: Point;
  second: ConnRef | null;
}

// ---------------------------------------------------------------------------
// Checkpoint -- waypoint that a connector route must visit
// ---------------------------------------------------------------------------
export class Checkpoint {
  point: Point;
  arrivalDirections: number;
  departureDirections: number;

  /**
   * @param p   The point that must be visited.
   * @param ad  Arrival ConnDirFlags (default ConnDirAll).
   * @param dd  Departure ConnDirFlags (default ConnDirAll).
   */
  constructor(p: Point | null = null, ad: number = ConnDirAll, dd: number = ConnDirAll) {
    this.point = p ? p.clone() : new Point();
    this.arrivalDirections = ad;
    this.departureDirections = dd;
  }
}

// ---------------------------------------------------------------------------
// ConnRef -- the main connector class
// ---------------------------------------------------------------------------
export class ConnRef {
  _router: any;
  _type: number;
  _reroute_flag_ptr: any;
  _needs_reroute_flag: boolean;
  _false_path: boolean;
  _needs_repaint: boolean;
  _active: boolean;
  _hate_crossings: boolean;
  _has_fixed_route: boolean;
  _route: Polygon;
  _display_route: Polygon;
  _route_dist: number;
  _connrefs_pos: number | null;
  _src_vert: PlaceholderVert | null;
  _dst_vert: PlaceholderVert | null;
  _start_vert: PlaceholderVert | null;
  _callback_func: ((ptr: any) => void) | null;
  _connector: any;
  _src_connend: any;
  _dst_connend: any;
  _checkpoints: Checkpoint[];
  _checkpoint_vertices: PlaceholderVert[];
  _initialised: boolean;
  _id: number;

  /**
   * @param router   The owning router instance.
   * @param srcOrId  Either a source ConnEnd (2-arg form) or a numeric id (1-arg form).
   * @param dst      Destination ConnEnd (2-arg form).
   * @param id       Unique positive integer ID.
   */
  constructor(router: any, srcOrId?: any, dst?: any, id?: number) {
    this._router = router;

    // Detect which overload is being used:
    //   ConnRef(router, id)            -- srcOrId is a number or undefined
    //   ConnRef(router, src, dst, id)  -- srcOrId is a ConnEnd object
    let src: any = null;
    if (srcOrId !== undefined && srcOrId !== null && typeof srcOrId === 'object') {
      // Two-endpoint form
      src = srcOrId;
      // dst is already set
      id = id || 0;
    } else {
      // No-endpoint form: srcOrId is actually the id (or undefined)
      id = (typeof srcOrId === 'number') ? srcOrId : 0;
      dst = null;
    }

    this._type = router.validConnType ? router.validConnType() : ConnType_PolyLine;
    this._reroute_flag_ptr = null;
    this._needs_reroute_flag = true;
    this._false_path = false;
    this._needs_repaint = false;
    this._active = false;
    this._hate_crossings = false;
    this._has_fixed_route = false;
    this._route = new Polygon();
    this._display_route = new Polygon();
    this._route_dist = 0;
    this._connrefs_pos = null;   // iterator stand-in (index / reference)
    this._src_vert = null;
    this._dst_vert = null;
    this._start_vert = null;
    this._callback_func = null;
    this._connector = null;      // opaque user pointer passed to callback
    this._src_connend = null;
    this._dst_connend = null;
    this._checkpoints = [];
    this._checkpoint_vertices = [];
    this._initialised = false;

    console.assert(this._router != null, 'ConnRef: router must not be null');
    this._id = this._router.assignId ? this._router.assignId(id) : (id as number);

    this._route.clear();

    if (this._router.m_conn_reroute_flags) {
      this._reroute_flag_ptr = this._router.m_conn_reroute_flags.addConn(this);
    }

    if (src && dst) {
      this.setEndpoints(src, dst);
    }
  }

  // ---- destructor logic (call explicitly or via Router.deleteConnector) ----
  destroy(): void {
    console.assert(this._router, 'ConnRef.destroy: router must exist');

    if (this._router.m_conn_reroute_flags) {
      this._router.m_conn_reroute_flags.removeConn(this);
    }

    if (this._router.removeObjectFromQueuedActions) {
      this._router.removeObjectFromQueuedActions(this);
    }

    this.freeRoutes();

    if (this._src_vert) {
      this._src_vert.removeFromGraph();
      if (this._router.vertices) {
        this._router.vertices.removeVertex(this._src_vert);
      }
      this._src_vert = null;
    }
    if (this._src_connend) {
      this._src_connend.disconnect();
      this._src_connend.freeActivePin();
      this._src_connend = null;
    }

    if (this._dst_vert) {
      this._dst_vert.removeFromGraph();
      if (this._router.vertices) {
        this._router.vertices.removeVertex(this._dst_vert);
      }
      this._dst_vert = null;
    }
    if (this._dst_connend) {
      this._dst_connend.disconnect();
      this._dst_connend.freeActivePin();
      this._dst_connend = null;
    }

    // Clear checkpoint vertices
    for (let i = 0; i < this._checkpoint_vertices.length; ++i) {
      this._checkpoint_vertices[i].removeFromGraph(true);
      if (this._router.vertices) {
        this._router.vertices.removeVertex(this._checkpoint_vertices[i]);
      }
    }
    this._checkpoint_vertices = [];

    if (this._active) {
      this.makeInactive();
    }
  }

  // ---- accessors ----------------------------------------------------------

  /** Returns the connector ID. */
  id(): number {
    return this._id;
  }

  /** Returns the owning router. */
  router(): any {
    return this._router;
  }

  /** Returns source endpoint vertex. */
  src(): PlaceholderVert | null {
    return this._src_vert;
  }

  /** Returns destination endpoint vertex. */
  dst(): PlaceholderVert | null {
    return this._dst_vert;
  }

  /** Returns start vertex (may differ during rubber-band). */
  start(): PlaceholderVert | null {
    return this._start_vert;
  }

  /** Returns whether the connector is initialised (active). */
  isInitialised(): boolean {
    return this._active;
  }

  // ---- routing type -------------------------------------------------------

  /** Returns ConnType. */
  routingType(): number {
    return this._type;
  }

  /** Sets the routing type. */
  setRoutingType(type: number): void {
    if (this._router.validConnType) {
      type = this._router.validConnType(type);
    }
    if (this._type !== type) {
      this._type = type;
      this.makePathInvalid();
      if (this._router.modifyConnector) {
        this._router.modifyConnector(this);
      }
    }
  }

  // ---- checkpoints --------------------------------------------------------

  /** Returns a copy of the checkpoints array. */
  routingCheckpoints(): Checkpoint[] {
    return this._checkpoints.slice();
  }

  /** Sets routing checkpoints. */
  setRoutingCheckpoints(checkpoints: Checkpoint[]): void {
    this._checkpoints = checkpoints.slice();

    // Clear previous checkpoint vertices
    for (let i = 0; i < this._checkpoint_vertices.length; ++i) {
      this._checkpoint_vertices[i].removeFromGraph(true);
      if (this._router.vertices) {
        this._router.vertices.removeVertex(this._checkpoint_vertices[i]);
      }
    }
    this._checkpoint_vertices = [];

    for (let i = 0; i < this._checkpoints.length; ++i) {
      // TODO: VertID and VertInf come from vertices.js (circular dep)
      const ptID: VertIDLike = { objID: this._id, vn: 2 + i, props: PROP_ConnPoint | PROP_ConnCheckpoint };
      // Placeholder: store ptID for now until VertInf is available
      const vertex: PlaceholderVert = {
        id: ptID,
        point: this._checkpoints[i].point.clone(),
        visDirections: ConnDirAll,
        router: this._router,
        pathNext: null,
        shPrev: null,
        shNext: null,
        removeFromGraph(/* isConn */) {},
        Reset(newId: VertIDLike, newPoint: Point) {
          this.id = newId;
          this.point = newPoint.clone ? newPoint.clone() : new Point(newPoint.x, newPoint.y);
        },
      };
      this._checkpoint_vertices.push(vertex);
    }

    if (this._router.m_allows_polyline_routing) {
      for (let i = 0; i < this._checkpoints.length; ++i) {
        // TODO: vertexVisibility(this._checkpoint_vertices[i], null, true, true);
      }
    }
  }

  // ---- endpoints ----------------------------------------------------------

  /**
   * Sets both source and destination endpoints.
   */
  setEndpoints(srcPoint: any, dstPoint: any): void {
    if (this._router.modifyConnector) {
      this._router.modifyConnector(this, VertID_src, srcPoint);
      this._router.modifyConnector(this, VertID_tar, dstPoint);
    }
  }

  /** Sets the source endpoint. */
  setSourceEndpoint(srcPoint: any): void {
    if (this._router.modifyConnector) {
      this._router.modifyConnector(this, VertID_src, srcPoint);
    }
  }

  /** Sets the destination endpoint. */
  setDestEndpoint(dstPoint: any): void {
    if (this._router.modifyConnector) {
      this._router.modifyConnector(this, VertID_tar, dstPoint);
    }
  }

  /**
   * Sets an endpoint by type.
   */
  setEndpoint(type: number, connEnd: any): void {
    if (this._router.modifyConnector) {
      this._router.modifyConnector(this, type, connEnd);
    }
  }

  /**
   * Overload: setEndpoint(type, pointID, pointSuggestion)
   * Sets endpoint by VertID lookup and optional point validation.
   */
  setEndpointByVertID(type: number, pointID: VertIDLike, pointSuggestion: Point | null = null): boolean {
    if (!this._router.vertices) return false;
    const vInf: PlaceholderVert | null = this._router.vertices.getVertexByID(pointID);
    if (vInf == null) return false;

    const point: Point = vInf.point;
    if (pointSuggestion) {
      if (euclideanDist(point, pointSuggestion) > 0.5) {
        return false;
      }
    }

    this.common_updateEndPoint(type, point);

    // Give visibility just to the point it is over.
    // TODO: const edge = new EdgeInf(
    //     (type === VertID_src) ? this._src_vert : this._dst_vert, vInf);
    // edge.setDist(0.001);

    if (this._router.processTransaction) {
      this._router.processTransaction();
    }
    return true;
  }

  /** Returns both endpoint ConnEnds. */
  endpointConnEnds(): { first: any; second: any } {
    const endpoints: { first: any; second: any } = { first: null, second: null };
    const srcResult: { ok: boolean; connEnd: any } = this.getConnEndForEndpointVertex(this._src_vert);
    const dstResult: { ok: boolean; connEnd: any } = this.getConnEndForEndpointVertex(this._dst_vert);
    endpoints.first = srcResult.connEnd;
    endpoints.second = dstResult.connEnd;
    return endpoints;
  }

  /** Returns obstacle anchors for both endpoints. */
  endpointAnchors(): { first: any; second: any } {
    const anchors: { first: any; second: any } = { first: null, second: null };
    if (this._src_connend) {
      anchors.first = this._src_connend.m_anchor_obj || null;
    }
    if (this._dst_connend) {
      anchors.second = this._dst_connend.m_anchor_obj || null;
    }
    return anchors;
  }

  /** Returns possible destination pin points. */
  possibleDstPinPoints(): Point[] {
    if (this._dst_connend && this._dst_connend.possiblePinPoints) {
      return this._dst_connend.possiblePinPoints();
    }
    return [];
  }

  // ---- common_updateEndPoint ----------------------------------------------

  /**
   * Core logic shared by updateEndPoint and the VertID overload.
   */
  common_updateEndPoint(type: number, connEnd: any): void {
    // connEnd may be a ConnEnd or a bare Point (from the VertID overload)
    const isConnEnd: boolean = connEnd && typeof connEnd.position === 'function';
    const point: Point = isConnEnd ? connEnd.position() : connEnd;

    // The connEnd is a copy; sever its connection reference.
    if (isConnEnd) {
      connEnd = Object.assign(Object.create(Object.getPrototypeOf(connEnd)), connEnd);
      connEnd.m_conn_ref = null;
    }

    console.assert(
      type === VertID_src || type === VertID_tar,
      'common_updateEndPoint: type must be src or tar'
    );

    if (!this._active) {
      this.makeActive();
    }

    let altered: PlaceholderVert | null = null;
    let properties: number = PROP_ConnPoint;
    if (isConnEnd && connEnd.isPinConnection && connEnd.isPinConnection()) {
      properties |= PROP_DummyPinHelper;
    }

    const ptID: VertIDLike = { objID: this._id, vn: type, props: properties };

    if (type === VertID_src) {
      if (this._src_vert) {
        this._src_vert.Reset(ptID, point);
      } else {
        // TODO: this._src_vert = new VertInf(this._router, ptID, point);
        this._src_vert = _makePlaceholderVert(this._router, ptID, point);
      }
      if (isConnEnd && connEnd.directions) {
        this._src_vert.visDirections = connEnd.directions();
      }

      if (this._src_connend) {
        this._src_connend.disconnect();
        this._src_connend.freeActivePin();
        this._src_connend = null;
      }
      if (isConnEnd && connEnd.isPinConnection && connEnd.isPinConnection()) {
        this._src_connend = connEnd; // TODO: new ConnEnd(connEnd)
        this._src_connend.connect(this);
        this._src_vert.visDirections = ConnDirNone;
      }

      altered = this._src_vert;
    } else {
      // type === VertID_tar
      if (this._dst_vert) {
        this._dst_vert.Reset(ptID, point);
      } else {
        // TODO: this._dst_vert = new VertInf(this._router, ptID, point);
        this._dst_vert = _makePlaceholderVert(this._router, ptID, point);
      }
      if (isConnEnd && connEnd.directions) {
        this._dst_vert.visDirections = connEnd.directions();
      }

      if (this._dst_connend) {
        this._dst_connend.disconnect();
        this._dst_connend.freeActivePin();
        this._dst_connend = null;
      }
      if (isConnEnd && connEnd.isPinConnection && connEnd.isPinConnection()) {
        this._dst_connend = connEnd;
        this._dst_connend.connect(this);
        this._dst_vert.visDirections = ConnDirNone;
      }

      altered = this._dst_vert;
    }

    // Remove edges and recreate
    const isConn: boolean = true;
    if (altered && altered.removeFromGraph) {
      altered.removeFromGraph(isConn);
    }

    this.makePathInvalid();
    if (this._router.setStaticGraphInvalidated) {
      this._router.setStaticGraphInvalidated(true);
    }
  }

  // ---- updateEndPoint -----------------------------------------------------

  /**
   * Updates an endpoint and recomputes visibility.
   */
  updateEndPoint(type: number, connEnd: any): void {
    this.common_updateEndPoint(type, connEnd);

    if (this._has_fixed_route) {
      // Don't need to continue and compute visibility if route is fixed.
      return;
    }

    if (this._router.m_allows_polyline_routing) {
      const knownNew: boolean = true;
      const genContains: boolean = true;
      if (type === VertID_src) {
        const dummySrc: boolean = !!(this._src_connend && this._src_connend.isPinConnection &&
                         this._src_connend.isPinConnection());
        if (!dummySrc) {
          // TODO: vertexVisibility(this._src_vert, this._dst_vert, knownNew, genContains);
        }
      } else {
        const dummyDst: boolean = !!(this._dst_connend && this._dst_connend.isPinConnection &&
                         this._dst_connend.isPinConnection());
        if (!dummyDst) {
          // TODO: vertexVisibility(this._dst_vert, this._src_vert, knownNew, genContains);
        }
      }
    }
  }

  // ---- getConnEndForEndpointVertex ----------------------------------------

  /**
   * Returns the ConnEnd for a given endpoint vertex.
   */
  getConnEndForEndpointVertex(vertex: PlaceholderVert | null): { ok: boolean; connEnd: any } {
    if (vertex == null) {
      console.warn(
        `ConnRef.getConnEndForEndpointVertex(): ConnEnd for connector ${this.id()} ` +
        `is uninitialised. It may have been set but Router.processTransaction has not ` +
        `yet been called.`
      );
      return { ok: false, connEnd: null };
    }

    if (vertex === this._src_vert) {
      if (this._src_connend) {
        return { ok: true, connEnd: this._src_connend };
      }
      return { ok: true, connEnd: { point: this._src_vert!.point, visDirections: this._src_vert!.visDirections } };
    } else if (vertex === this._dst_vert) {
      if (this._dst_connend) {
        return { ok: true, connEnd: this._dst_connend };
      }
      return { ok: true, connEnd: { point: this._dst_vert!.point, visDirections: this._dst_vert!.visDirections } };
    }
    return { ok: false, connEnd: null };
  }

  // ---- route / displayRoute -----------------------------------------------

  /** Returns raw debug route. */
  route(): Polygon {
    return this._route;
  }

  /** Returns mutable reference to the raw route. */
  routeRef(): Polygon {
    return this._route;
  }

  /** Returns simplified display route. */
  displayRoute(): Polygon {
    if (this._display_route.empty()) {
      this._display_route = this._route.simplify();
    }
    return this._display_route;
  }

  /** Returns whether connector needs repaint. */
  needsRepaint(): boolean {
    return this._needs_repaint;
  }

  // ---- set_route ----------------------------------------------------------

  /** Sets the display route from a given route polygon. */
  set_route(route: Polygon): void {
    if (this._display_route === route) {
      console.error('Error: Trying to update libavoid route with itself.');
      return;
    }
    this._display_route.ps = route.ps.map((p: Point) => p.clone());
  }

  // ---- calcRouteDist ------------------------------------------------------

  calcRouteDist(): void {
    const dist: (a: Point, b: Point) => number = (this._type === ConnType_PolyLine) ? euclideanDist : manhattanDist;
    this._route_dist = 0;
    for (let i = 1; i < this._route.size(); ++i) {
      this._route_dist += dist(this._route.at(i), this._route.at(i - 1));
    }
  }

  // ---- generatePath -------------------------------------------------------

  /**
   * Generates or regenerates the path. Returns true if a new path was generated.
   */
  generatePath(): boolean {
    if (!this._false_path && !this._needs_reroute_flag) {
      return false;
    }
    if (!this._dst_vert || !this._src_vert) {
      return false;
    }

    this._false_path = false;
    this._needs_reroute_flag = false;
    this._start_vert = this._src_vert;

    // Assign connection pin visibility (dummy bridging vertices).
    const isDummyAtEnd: { first: boolean; second: boolean } = this.assignConnectionPinVisibility(true);

    if (this._router.RubberBandRouting && this.route().size() > 0) {
      if (isDummyAtEnd.first) {
        const firstPoint: Point = this._src_vert.point.clone();
        firstPoint.id = this._src_vert.id.objID;
        firstPoint.vn = this._src_vert.id.vn;
        const existingRoute: Polygon = this.routeRef();
        existingRoute.ps.unshift(firstPoint);
      }
    }

    let path: Point[] = [];
    let vertices: PlaceholderVert[] = [];
    if (this._checkpoints.length === 0) {
      const result: { path: Point[]; vertices: PlaceholderVert[] } = this.generateStandardPath();
      path = result.path;
      vertices = result.vertices;
    } else {
      const result: { path: Point[]; vertices: PlaceholderVert[] } = this.generateCheckpointsPath();
      path = result.path;
      vertices = result.vertices;
    }

    console.assert(vertices.length >= 2);
    console.assert(vertices[0] === this.src());
    console.assert(vertices[vertices.length - 1] === this.dst());
    console.assert(this._reroute_flag_ptr != null);

    for (let i = 1; i < vertices.length; ++i) {
      if (this._router.InvisibilityGrph && this._type === ConnType_PolyLine) {
        // TODO: EdgeInf.existingEdge(vertices[i-1], vertices[i])
        //       edge.addConn(this._reroute_flag_ptr);
      } else {
        this._false_path = true;
      }

      const vertex: PlaceholderVert = vertices[i];
      if (vertex.pathNext && vertex.pathNext.point &&
          vertex.pathNext.point.eq(vertex.point)) {
        if (!(vertex.pathNext.id.isConnPt && vertex.pathNext.id.isConnPt()) &&
            !(vertex.id.isConnPt && vertex.id.isConnPt())) {
          console.assert(
            Math.abs(vertex.pathNext.id.vn - vertex.id.vn) !== 2
          );
        }
      }
    }

    // Clip dummy ShapeConnectionPin bridging points.
    let pathBegin: number = 0;
    let pathEnd: number = path.length;
    if (path.length > 2 && isDummyAtEnd.first) {
      pathBegin = 1;
      if (this._src_connend && this._src_connend.usePinVertex) {
        this._src_connend.usePinVertex(vertices[1]);
      }
    }
    if (path.length > 2 && isDummyAtEnd.second) {
      pathEnd = path.length - 1;
      if (this._dst_connend && this._dst_connend.usePinVertex) {
        this._dst_connend.usePinVertex(vertices[vertices.length - 2]);
      }
    }
    const clippedPath: Point[] = path.slice(pathBegin, pathEnd);

    // Clear pin visibility edges.
    this.assignConnectionPinVisibility(false);

    this.freeRoutes();
    this._route.ps = clippedPath;

    return true;
  }

  // ---- generateCheckpointsPath --------------------------------------------

  /**
   * Generates a path through checkpoints.
   */
  generateCheckpointsPath(): { path: Point[]; vertices: PlaceholderVert[] } {
    const checkpoints: PlaceholderVert[] = [this.src()!, ...this._checkpoint_vertices, this.dst()!];

    const path: Point[] = [this.src()!.point.clone()];
    const vertices: PlaceholderVert[] = [this.src()!];

    let lastSuccessfulIndex: number = 0;
    for (let i = 1; i < checkpoints.length; ++i) {
      const startVert: PlaceholderVert = checkpoints[lastSuccessfulIndex];
      const endVert: PlaceholderVert = checkpoints[i];

      // Handle checkpoint directions by disabling some visibility edges.
      if (lastSuccessfulIndex > 0) {
        const srcCP: Checkpoint = this._checkpoints[lastSuccessfulIndex - 1];
        if (srcCP.departureDirections !== ConnDirAll) {
          if (startVert.setVisibleDirections) {
            startVert.setVisibleDirections(srcCP.departureDirections);
          }
        }
      }
      if ((i + 1) < checkpoints.length) {
        const dstCP: Checkpoint = this._checkpoints[i - 1];
        if (dstCP.arrivalDirections !== ConnDirAll) {
          if (endVert.setVisibleDirections) {
            endVert.setVisibleDirections(dstCP.arrivalDirections);
          }
        }
      }

      // TODO: AStarPath search
      // const aStar = new AStarPath();
      // aStar.search(this, startVert, endVert, null);

      // Restore changes made for checkpoint visibility directions.
      if (lastSuccessfulIndex > 0 && startVert.setVisibleDirections) {
        startVert.setVisibleDirections(ConnDirAll);
      }
      if ((i + 1) < checkpoints.length && endVert.setVisibleDirections) {
        endVert.setVisibleDirections(ConnDirAll);
      }

      // Process the path.
      const pathlen: number = endVert.pathLeadsBackTo ? endVert.pathLeadsBackTo(startVert) : 0;
      if (pathlen >= 2) {
        const prevPathSize: number = path.length;
        path.length = prevPathSize + (pathlen - 1);
        vertices.length = prevPathSize + (pathlen - 1);
        let vertInf: PlaceholderVert | null = endVert;
        for (let index = path.length - 1; index >= prevPathSize; --index) {
          path[index] = vertInf!.point.clone();
          if (vertInf!.id.isConnPt && vertInf!.id.isConnPt()) {
            path[index].id = this._id;
            path[index].vn = kUnassignedVertexNumber;
          } else {
            path[index].id = vertInf!.id.objID;
            path[index].vn = vertInf!.id.vn;
          }
          vertices[index] = vertInf!;
          vertInf = vertInf!.pathNext;
        }
        lastSuccessfulIndex = i;
      } else if (i + 1 === checkpoints.length) {
        // No valid path.
        console.warn('Warning: Path not found...');
        this._needs_reroute_flag = true;
        path.push(this.dst()!.point.clone());
        vertices.push(this.dst()!);
        console.assert(path.length >= 2);
      } else {
        console.warn(
          `Warning: skipping checkpoint for connector ${this.id()} at ` +
          `(${checkpoints[i].point.x}, ${checkpoints[i].point.y}).`
        );
      }
    }

    // Use topbit to differentiate start/end point for nudging.
    const topbit: number = (1 << 31) >>> 0;
    path[path.length - 1].id = (this._id | topbit) >>> 0;
    path[path.length - 1].vn = kUnassignedVertexNumber;

    return { path, vertices };
  }

  // ---- generateStandardPath -----------------------------------------------

  /**
   * Generates a standard (non-checkpoint) path.
   */
  generateStandardPath(): { path: Point[]; vertices: PlaceholderVert[] } {
    const tar: PlaceholderVert = this._dst_vert!;
    let existingPathStart: number = 0;
    const currRoute: Polygon = this.route();

    if (this._router.RubberBandRouting) {
      if (currRoute.size() > 2) {
        if (this._src_vert!.point.eq(currRoute.ps[0])) {
          existingPathStart = currRoute.size() - 2;
          console.assert(existingPathStart !== 0);
          const pnt: Point = currRoute.at(existingPathStart);
          const vID: VertIDLike = { objID: pnt.id, vn: pnt.vn };
          if (this._router.vertices) {
            this._start_vert = this._router.vertices.getVertexByID(vID);
          }
          console.assert(this._start_vert != null);
        }
      }
    }

    let pathlen: number = 0;
    while (pathlen === 0) {
      // TODO: AStarPath search
      // const aStar = new AStarPath();
      // aStar.search(this, this.src(), this.dst(), this.start());

      pathlen = (this.dst() && this.dst()!.pathLeadsBackTo)
        ? this.dst()!.pathLeadsBackTo!(this.src())
        : 0;

      if (pathlen < 2) {
        if (existingPathStart === 0) {
          break;
        }
        existingPathStart--;
        const pnt: Point = currRoute.at(existingPathStart);
        const props: number = (existingPathStart > 0) ? 0 : PROP_ConnPoint;
        const vID: VertIDLike = { objID: pnt.id, vn: pnt.vn, props };
        if (this._router.vertices) {
          this._start_vert = this._router.vertices.getVertexByID(vID);
        }
        console.assert(this._start_vert != null);
      } else if (this._router.RubberBandRouting) {
        let unwind: boolean = false;
        let prior: PlaceholderVert | null = null;
        for (let curr: PlaceholderVert | null = tar; curr !== this._start_vert!.pathNext; curr = curr!.pathNext) {
          if (!validateBendPoint(curr!.pathNext, curr!, prior)) {
            unwind = true;
            break;
          }
          prior = curr;
        }
        if (unwind) {
          if (existingPathStart === 0) {
            break;
          }
          existingPathStart--;
          const pnt: Point = currRoute.at(existingPathStart);
          const props: number = (existingPathStart > 0) ? 0 : PROP_ConnPoint;
          const vID: VertIDLike = { objID: pnt.id, vn: pnt.vn, props };
          if (this._router.vertices) {
            this._start_vert = this._router.vertices.getVertexByID(vID);
          }
          console.assert(this._start_vert != null);
          pathlen = 0;
        }
      }
    }

    if (pathlen < 2) {
      console.warn('Warning: Path not found...');
      this._needs_reroute_flag = true;
      pathlen = 2;
      tar.pathNext = this._src_vert;
    }

    const path: Point[] = new Array<Point>(pathlen);
    const vertices: PlaceholderVert[] = new Array<PlaceholderVert>(pathlen);

    let j: number = pathlen - 1;
    for (let curr: PlaceholderVert | null = tar; curr !== this._src_vert; curr = curr!.pathNext) {
      path[j] = curr!.point.clone();
      vertices[j] = curr!;
      path[j].id = curr!.id.objID;
      path[j].vn = curr!.id.vn;
      j--;
    }
    vertices[0] = this._src_vert!;
    path[0] = this._src_vert!.point.clone();
    path[0].id = this._src_vert!.id.objID;
    path[0].vn = this._src_vert!.id.vn;

    return { path, vertices };
  }

  // ---- assignConnectionPinVisibility --------------------------------------

  /**
   * Assigns or removes connection pin visibility.
   */
  assignConnectionPinVisibility(connect: boolean): { first: boolean; second: boolean } {
    const dummySrc: boolean = !!(this._src_connend && this._src_connend.isPinConnection &&
                        this._src_connend.isPinConnection());
    if (dummySrc && this._src_vert) {
      this._src_vert.removeFromGraph();
      if (connect && this._src_connend.assignPinVisibilityTo) {
        this._src_connend.assignPinVisibilityTo(this._src_vert, this._dst_vert);
      }
    }

    const dummyDst: boolean = !!(this._dst_connend && this._dst_connend.isPinConnection &&
                        this._dst_connend.isPinConnection());
    if (dummyDst && this._dst_vert) {
      this._dst_vert.removeFromGraph();
      if (connect && this._dst_connend.assignPinVisibilityTo) {
        this._dst_connend.assignPinVisibilityTo(this._dst_vert, this._src_vert);
      }
    }

    return { first: dummySrc, second: dummyDst };
  }

  // ---- makePathInvalid ----------------------------------------------------

  makePathInvalid(): void {
    this._needs_reroute_flag = true;
  }

  // ---- makeActive / makeInactive ------------------------------------------

  makeActive(): void {
    console.assert(!this._active, 'ConnRef.makeActive: already active');
    if (this._router.connRefs) {
      this._router.connRefs.unshift(this);
      this._connrefs_pos = 0;
    }
    this._active = true;
  }

  makeInactive(): void {
    console.assert(this._active, 'ConnRef.makeInactive: not active');
    if (this._router.connRefs) {
      const idx: number = this._router.connRefs.indexOf(this);
      if (idx !== -1) {
        this._router.connRefs.splice(idx, 1);
      }
    }
    this._active = false;
  }

  // ---- freeRoutes ---------------------------------------------------------

  freeRoutes(): void {
    this._route.clear();
    this._display_route.clear();
  }

  // ---- freeActivePins -----------------------------------------------------

  freeActivePins(): void {
    if (this._src_connend && this._src_connend.freeActivePin) {
      this._src_connend.freeActivePin();
    }
    if (this._dst_connend && this._dst_connend.freeActivePin) {
      this._dst_connend.freeActivePin();
    }
  }

  // ---- removeFromGraph ----------------------------------------------------

  removeFromGraph(): void {
    if (this._src_vert && this._src_vert.removeFromGraph) {
      this._src_vert.removeFromGraph();
    }
    if (this._dst_vert && this._dst_vert.removeFromGraph) {
      this._dst_vert.removeFromGraph();
    }
  }

  // ---- unInitialise -------------------------------------------------------

  unInitialise(): void {
    if (this._router.vertices) {
      this._router.vertices.removeVertex(this._src_vert);
      this._router.vertices.removeVertex(this._dst_vert);
    }
    this.makeInactive();
  }

  // ---- callback -----------------------------------------------------------

  /**
   * Sets the callback function and user data pointer.
   */
  setCallback(cb: ((ptr: any) => void) | null, ptr: any): void {
    this._callback_func = cb;
    this._connector = ptr;
  }

  performCallback(): void {
    if (this._callback_func) {
      this._callback_func(this._connector);
    }
  }

  // ---- hate crossings -----------------------------------------------------

  /** Sets whether this connector hates crossings. */
  setHateCrossings(value: boolean): void {
    this._hate_crossings = value;
  }

  /** Returns whether this connector hates crossings. */
  doesHateCrossings(): boolean {
    return this._hate_crossings;
  }

  // ---- fixed route --------------------------------------------------------

  /** Sets a fixed route for this connector. */
  setFixedRoute(route: Polygon): void {
    if (route.size() >= 2) {
      this.setEndpoints(route.ps[0], route.ps[route.size() - 1]);
    }
    this._has_fixed_route = true;
    this._route = route;
    this._display_route = this._route.simplify();
    if (this._router.registerSettingsChange) {
      this._router.registerSettingsChange();
    }
  }

  setFixedExistingRoute(): void {
    console.assert(this._route.size() >= 2);
    this._has_fixed_route = true;
    if (this._router.registerSettingsChange) {
      this._router.registerSettingsChange();
    }
  }

  /** Returns whether this connector has a fixed route. */
  hasFixedRoute(): boolean {
    return this._has_fixed_route;
  }

  clearFixedRoute(): void {
    this._has_fixed_route = false;
    this.makePathInvalid();
    if (this._router.registerSettingsChange) {
      this._router.registerSettingsChange();
    }
  }

  // ---- splitAtSegment -----------------------------------------------------

  /**
   * Splits this connector at segment segmentN, creating a junction and
   * a new connector.
   */
  splitAtSegment(segmentN: number): { junction: any; connector: ConnRef | null } {
    let newConn: ConnRef | null = null;
    let newJunction: any = null;

    if (this._display_route.size() > segmentN) {
      const junctionPos: Point = _midpoint(
        this._display_route.at(segmentN - 1),
        this._display_route.at(segmentN)
      );

      // TODO: JunctionRef, Router.addJunction (circular dep)
      // newJunction = new JunctionRef(this.router(), junctionPos);
      // this.router().addJunction(newJunction);
      // newJunction.preferOrthogonalDimension(
      //   (this._display_route.at(segmentN - 1).x ===
      //    this._display_route.at(segmentN).x) ? YDIM : XDIM
      // );

      // const newConnSrc = new ConnEnd(newJunction);
      // const newConnDst = this._dst_connend; // copy
      // newConn = new ConnRef(this.router(), newConnSrc, newConnDst);

      // const oldConnDst = new ConnEnd(newJunction);
      // this.setDestEndpoint(oldConnDst);
    }

    return { junction: newJunction, connector: newConn };
  }
}

// ---------------------------------------------------------------------------
// PtOrder -- point ordering for nudging / crossings
// ---------------------------------------------------------------------------

export class PtOrder {
  sorted: boolean[];
  nodes: PointConnPair[][];
  links: [number, number][][];
  sortedConnVector: PointConnPair[][];

  constructor() {
    // Two dimensions (0 = X, 1 = Y)
    this.sorted = [false, false];
    this.nodes = [[], []];
    this.links = [[], []];
    this.sortedConnVector = [[], []];
  }

  /**
   * Returns sorted points for the given dimension.
   */
  sortedPoints(dim: number): PointConnPair[] {
    if (!this.sorted[dim]) {
      this._sort(dim);
    }
    return this.sortedConnVector[dim];
  }

  /**
   * Returns the position index for the given connector, or -1.
   */
  positionFor(dim: number, conn: ConnRef): number {
    if (!this.sorted[dim]) {
      this._sort(dim);
    }
    for (let i = 0; i < this.sortedConnVector[dim].length; ++i) {
      if (this.sortedConnVector[dim][i].second === conn) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Add two points without ordering information.
   */
  addPoints(dim: number, arg1: PointConnPair, arg2: PointConnPair): void {
    this._insertPoint(dim, arg1);
    this._insertPoint(dim, arg2);
  }

  /**
   * Add ordered points (inner before outer).
   */
  addOrderedPoints(dim: number, innerArg: PointConnPair, outerArg: PointConnPair, swapped: boolean): void {
    const inner: PointConnPair = swapped ? outerArg : innerArg;
    const outer: PointConnPair = swapped ? innerArg : outerArg;

    const innerIndex: number = this._insertPoint(dim, inner);
    const outerIndex: number = this._insertPoint(dim, outer);

    this.links[dim].push([outerIndex, innerIndex]);
  }

  // ---- private ------------------------------------------------------------

  /**
   * Inserts a point pair and returns its index.
   */
  _insertPoint(dim: number, pointPair: PointConnPair): number {
    for (let i = 0; i < this.nodes[dim].length; ++i) {
      if (this.nodes[dim][i].second === pointPair.second) {
        return i;
      }
    }
    this.nodes[dim].push(pointPair);
    return this.nodes[dim].length - 1;
  }

  /** Topological sort of nodes using links as edges. */
  _sort(dim: number): void {
    this.sorted[dim] = true;

    const n: number = this.nodes[dim].length;
    // Adjacency matrix
    const adj: boolean[][] = [];
    for (let i = 0; i < n; ++i) {
      adj.push(new Array<boolean>(n).fill(false));
    }

    for (const [from, to] of this.links[dim]) {
      adj[from][to] = true;
    }

    const inDegree: number[] = new Array<number>(n).fill(0);
    const queue: number[] = [];

    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        if (adj[j][i]) inDegree[i]++;
      }
      if (inDegree[i] === 0) queue.push(i);
    }

    let head: number = 0;
    while (head < queue.length) {
      const k: number = queue[head++];
      console.assert(k < this.nodes[dim].length);
      this.sortedConnVector[dim].push(this.nodes[dim][k]);

      for (let i = 0; i < n; ++i) {
        if (adj[k][i]) {
          adj[k][i] = false;
          inDegree[i]--;
          if (inDegree[i] === 0) {
            queue.push(i);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// ConnectorCrossings
// ---------------------------------------------------------------------------

export class ConnectorCrossings {
  poly: Polygon;
  polyIsConn: boolean;
  conn: Polygon;
  checkForBranchingSegments: boolean;
  polyConnRef: ConnRef | null;
  connConnRef: ConnRef | null;
  crossingCount: number;
  crossingFlags: number;
  crossingPoints: Set<Point> | null;
  pointOrders: Map<Point, PtOrder> | null;
  sharedPaths: Point[][] | null;
  firstSharedPathAtEndLength: number;
  secondSharedPathAtEndLength: number;

  /**
   * @param poly         The polygon to test crossings against.
   * @param polyIsConn   Whether the polygon is a connector route.
   * @param conn         The connector route polygon.
   * @param polyConnRef  ConnRef for the polygon (if polyIsConn).
   * @param connConnRef  ConnRef for the connector.
   */
  constructor(poly: Polygon, polyIsConn: boolean, conn: Polygon, polyConnRef: ConnRef | null = null, connConnRef: ConnRef | null = null) {
    this.poly = poly;
    this.polyIsConn = polyIsConn;
    this.conn = conn;
    this.checkForBranchingSegments = false;
    this.polyConnRef = polyConnRef;
    this.connConnRef = connConnRef;

    this.crossingCount = 0;
    this.crossingFlags = CROSSING_NONE;
    this.crossingPoints = null;
    this.pointOrders = null;
    this.sharedPaths = null;

    this.firstSharedPathAtEndLength = Number.MAX_VALUE;
    this.secondSharedPathAtEndLength = Number.MAX_VALUE;
  }

  clear(): void {
    this.crossingCount = 0;
    this.crossingFlags = CROSSING_NONE;
    this.firstSharedPathAtEndLength = Number.MAX_VALUE;
    this.secondSharedPathAtEndLength = Number.MAX_VALUE;
  }

  /**
   * Works out if the segment conn[cIndex-1]--conn[cIndex] really crosses poly.
   */
  countForSegment(cIndex: number, finalSegment: boolean): void {
    this.clear();

    const polyConnRef: ConnRef | null = this.polyConnRef;
    const connConnRef: ConnRef | null = this.connConnRef;
    const poly: Polygon = this.poly;
    const conn: Polygon = this.conn;
    const polyIsConn: boolean = this.polyIsConn;

    const polyIsOrthogonal: boolean = !!(polyConnRef &&
      polyConnRef.routingType() === ConnType_Orthogonal);
    const connIsOrthogonal: boolean = !!(connConnRef &&
      connConnRef.routingType() === ConnType_Orthogonal);

    const polyIsFixed: boolean = !!(polyConnRef && polyConnRef.hasFixedRoute());
    const connIsFixed: boolean = !!(connConnRef && connConnRef.hasFixedRoute());

    if (this.checkForBranchingSegments || polyIsFixed || connIsFixed ||
        !polyIsOrthogonal || !connIsOrthogonal) {
      const epsilon: number = Number.EPSILON;
      const conn_pn: number = conn.size();
      const tolerance: number = (!polyIsConn) ? epsilon : 0.0;
      splitBranchingSegments(poly, polyIsConn, conn, tolerance);
      cIndex += (conn.size() - conn_pn);
    }

    console.assert(cIndex >= 1);
    console.assert(cIndex < conn.size());

    const poly_size: number = poly.size();
    const a1: Point = conn.ps[cIndex - 1];
    const a2: Point = conn.ps[cIndex];

    const max_path_size: number = Math.min(poly_size, conn.size());
    const c_path: Point[] = new Array<Point>(max_path_size);
    const p_path: Point[] = new Array<Point>(max_path_size);
    let size: number = 0;

    for (let j: number = (polyIsConn ? 1 : 0); j < poly_size; ++j) {
      const b1: Point = poly.ps[((j - 1) + poly_size) % poly_size];
      const b2: Point = poly.ps[j];

      size = 0;

      let converging: boolean = false;

      const a1_eq_b1: boolean = a1.eq(b1);
      const a2_eq_b1: boolean = a2.eq(b1);
      const a2_eq_b2: boolean = a2.eq(b2);
      const a1_eq_b2: boolean = a1.eq(b2);

      if ((a1_eq_b1 && a2_eq_b2) || (a2_eq_b1 && a1_eq_b2)) {
        if (finalSegment) {
          converging = true;
        } else {
          continue;
        }
      } else if (a2_eq_b1 || a2_eq_b2 || a1_eq_b2) {
        continue;
      }

      if (a1_eq_b1 || converging) {
        if (!converging) {
          if (polyIsConn && j === 1) {
            continue;
          }
          const b0: Point = poly.ps[((j - 2) + poly_size) % poly_size];
          if (a2.eq(b0)) {
            continue;
          }
        }

        let shared_path: boolean = false;
        let p_dir_back: boolean = false;
        let p_dir: number = 0;
        let trace_c: number = 0;
        let trace_p: number = 0;

        if (converging) {
          p_dir_back = a2_eq_b2;
          p_dir = p_dir_back ? -1 : 1;
          trace_c = cIndex;
          trace_p = j;
          if (!p_dir_back) {
            if (finalSegment) {
              trace_p--;
            } else {
              trace_c--;
            }
          }
          shared_path = true;
        } else if (cIndex >= 2) {
          const b0: Point = poly.ps[((j - 2) + poly_size) % poly_size];
          const a0: Point = conn.ps[cIndex - 2];
          if (a0.eq(b2) || a0.eq(b0)) {
            p_dir_back = a0.eq(b0);
            p_dir = p_dir_back ? -1 : 1;
            trace_c = cIndex;
            trace_p = p_dir_back ? j : (j - 2);
            shared_path = true;
          }
        }

        if (shared_path) {
          this.crossingFlags |= CROSSING_SHARES_PATH;
          console.assert(p_dir !== 0);

          while (trace_c >= 0 &&
                 (!polyIsConn || (trace_p >= 0 && trace_p < poly_size))) {
            const index_p: number = ((trace_p + 2 * poly_size) % poly_size) >>> 0;
            const index_c: number = trace_c;
            c_path[size] = conn.ps[index_c];
            p_path[size] = poly.ps[index_p];
            ++size;
            if (size > 1 && conn.ps[index_c].neq(poly.ps[index_p])) {
              break;
            }
            trace_c--;
            trace_p += p_dir;
          }

          const front_same: boolean = c_path[0].eq(p_path[0]);
          const back_same: boolean = c_path[size - 1].eq(p_path[size - 1]);

          // Determine if the shared path terminates at a junction.
          let terminatesAtJunction: boolean = false;
          if (polyConnRef && connConnRef && (front_same || back_same)) {
            const connEnds: { first: any; second: any } = connConnRef.endpointConnEnds();
            let connJunction: any = null;
            const polyEnds: { first: any; second: any } = polyConnRef.endpointConnEnds();
            let polyJunction: any = null;

            const connEndObj: any = front_same ? connEnds.second : connEnds.first;
            if (connEndObj && connEndObj.junction) {
              connJunction = connEndObj.junction();
            }

            let use_first: boolean = back_same;
            if (p_dir_back) use_first = !use_first;
            const polyEndObj: any = use_first ? polyEnds.second : polyEnds.first;
            if (polyEndObj && polyEndObj.junction) {
              polyJunction = polyEndObj.junction();
            }

            terminatesAtJunction = !!(connJunction && connJunction === polyJunction);
          }

          if (this.sharedPaths) {
            const start: number = front_same ? 0 : 1;
            const limit: number = size - (back_same ? 0 : 1);
            const sPath: Point[] = [];
            for (let i = start; i < limit; ++i) {
              sPath.push(c_path[i].clone());
            }
            this.sharedPaths.push(sPath);
          }

          // Check for shared fixed segments.
          if (polyIsOrthogonal && connIsOrthogonal) {
            const startPt: number = front_same ? 0 : 1;
            const endPt: number = size - (back_same ? 1 : 2);
            for (let dim = 0; dim < 2; ++dim) {
              if (c_path[startPt].dim(dim) === c_path[endPt].dim(dim)) {
                const pos: number = c_path[startPt].dim(dim);
                if (((pos === poly.ps[0].dim(dim)) ||
                     (pos === poly.ps[poly_size - 1].dim(dim))) &&
                    ((pos === conn.ps[0].dim(dim)) ||
                     (pos === conn.ps[cIndex].dim(dim))) &&
                    !terminatesAtJunction) {
                  this.crossingFlags |= CROSSING_SHARES_FIXED_SEGMENT;
                }
              }
            }

            if (!front_same && !back_same) {
              for (let dim = 0; dim < 2; ++dim) {
                const end: number = size - 1;
                const altDim: number = (dim + 1) % 2;
                if (c_path[1].dim(altDim) === c_path[end - 1].dim(altDim)) {
                  const posBeg: number = c_path[1].dim(dim);
                  const posEnd: number = c_path[end - 1].dim(dim);
                  if (posBeg === c_path[0].dim(dim) &&
                      posBeg === p_path[0].dim(dim) &&
                      posEnd === c_path[end].dim(dim) &&
                      posEnd === p_path[end].dim(dim)) {
                    if (_posInlineWithConnEndSegs(posBeg, dim, conn, poly) &&
                        _posInlineWithConnEndSegs(posEnd, dim, conn, poly)) {
                      this.crossingFlags |= CROSSING_SHARES_FIXED_SEGMENT;
                    }
                  }
                }
              }
            }
          }

          let startCornerSide: number = 1;
          let endCornerSide: number = 1;
          let reversed: boolean = false;

          if (!front_same) {
            startCornerSide = cornerSide(
              c_path[0], c_path[1], c_path[2], p_path[0]);
          }
          if (!back_same) {
            endCornerSide = cornerSide(
              c_path[size - 3], c_path[size - 2], c_path[size - 1],
              p_path[size - 1]);
          } else {
            endCornerSide = startCornerSide;
          }
          if (front_same) {
            startCornerSide = endCornerSide;
          }

          if (endCornerSide !== startCornerSide) {
            this.crossingCount += 1;
            if (this.crossingPoints) {
              this.crossingPoints.add(c_path[1]);
            }
          }

          if (front_same || back_same) {
            this.crossingFlags |= CROSSING_SHARES_PATH_AT_END;

            const straightModifier: number = 200;
            this.firstSharedPathAtEndLength =
              this.secondSharedPathAtEndLength =
                _pathLength(c_path, p_path, size);

            if (back_same && size > 2) {
              if (vecDir(p_path[0], p_path[1], p_path[2]) === 0) {
                this.firstSharedPathAtEndLength -= straightModifier;
              }
              if (vecDir(c_path[0], c_path[1], c_path[2]) === 0) {
                this.secondSharedPathAtEndLength -= straightModifier;
              }
            } else if (front_same && size > 2) {
              if (vecDir(p_path[size - 3], p_path[size - 2], p_path[size - 1]) === 0) {
                this.firstSharedPathAtEndLength -= straightModifier;
              }
              if (vecDir(c_path[size - 3], c_path[size - 2], c_path[size - 1]) === 0) {
                this.secondSharedPathAtEndLength -= straightModifier;
              }
            }
          } else if (polyIsOrthogonal && connIsOrthogonal) {
            const cStartDir: number = vecDir(c_path[0], c_path[1], c_path[2]);
            const pStartDir: number = vecDir(p_path[0], p_path[1], p_path[2]);
            if (cStartDir !== 0 && cStartDir === -pStartDir) {
              startCornerSide = -cStartDir;
            } else {
              const cEndDir: number = vecDir(
                c_path[size - 3], c_path[size - 2], c_path[size - 1]);
              const pEndDir: number = vecDir(
                p_path[size - 3], p_path[size - 2], p_path[size - 1]);
              if (cEndDir !== 0 && cEndDir === -pEndDir) {
                startCornerSide = -cEndDir;
              }
            }
          }

          if (this.pointOrders) {
            reversed = false;
            const startPt: number = front_same ? 0 : 1;
            console.assert(size > startPt + 1);
            if (startCornerSide > 0) {
              reversed = !reversed;
            }

            let prevDir: number = 0;
            console.assert(size > 0 || back_same);
            const adj_size: number = size - (back_same ? 0 : 1);
            for (let i = startPt; i < adj_size; ++i) {
              const an: Point = c_path[i];
              const bn: Point = p_path[i];

              if (i > startPt) {
                const ap: Point = c_path[i - 1];

                const thisDir: number = _segDir(ap, an);
                if (prevDir === 0) {
                  if (thisDir > 0) {
                    reversed = !reversed;
                  }
                } else if (thisDir !== prevDir) {
                  reversed = !reversed;
                }

                const orientation: number = (ap.x === an.x) ? 0 : 1;
                this.pointOrders.get(an)?.addOrderedPoints(
                  orientation,
                  { first: bn, second: polyConnRef },
                  { first: an, second: connConnRef },
                  reversed
                );
                this.pointOrders.get(ap)?.addOrderedPoints(
                  orientation,
                  { first: p_path[i - 1], second: polyConnRef },
                  { first: ap, second: connConnRef },
                  reversed
                );
                prevDir = thisDir;
              }
            }
          }

          this.crossingFlags |= CROSSING_TOUCHES;
        } else if (cIndex >= 2) {
          // The connectors cross or touch at this point.
          console.assert(cIndex >= 2);
          console.assert(!polyIsConn || j >= 2);

          const b0: Point = poly.ps[((j - 2) + poly_size) % poly_size];
          const a0: Point = conn.ps[cIndex - 2];

          const side1: number = cornerSide(a0, a1, a2, b0);
          const side2: number = cornerSide(a0, a1, a2, b2);
          if (side1 !== side2) {
            this.crossingCount += 1;
            if (this.crossingPoints) {
              this.crossingPoints.add(a1);
            }
          }

          this.crossingFlags |= CROSSING_TOUCHES;
          if (this.pointOrders) {
            if (polyIsOrthogonal && connIsOrthogonal) {
              const reversedX: boolean = (a0.x < a1.x) || (a2.x < a1.x);
              const reversedY: boolean = (a0.y < a1.y) || (a2.y < a1.y);
              this.pointOrders.get(b1)?.addOrderedPoints(
                0,
                { first: b1, second: polyConnRef },
                { first: a1, second: connConnRef },
                !reversedX
              );
              this.pointOrders.get(b1)?.addOrderedPoints(
                1,
                { first: b1, second: polyConnRef },
                { first: a1, second: connConnRef },
                !reversedY
              );
            }
          }
        }
      } else {
        // No shared endpoints
        if (polyIsOrthogonal && connIsOrthogonal) {
          continue;
        }

        const result = segmentIntersectPoint(a1, a2, b1, b2);
        if (result.result === DO_INTERSECT) {
          const cPt: Point = new Point(result.x ?? 0, result.y ?? 0);
          if (!polyIsConn &&
              (a1.eq(cPt) || a2.eq(cPt) || b1.eq(cPt) || b2.eq(cPt))) {
            continue;
          }
          this.crossingCount += 1;
          if (this.crossingPoints) {
            this.crossingPoints.add(cPt);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Free functions
// ---------------------------------------------------------------------------

/**
 * Validates a bend point on a path to check it does not form a zigzag corner.
 */
export function validateBendPoint(aInf: PlaceholderVert | null, bInf: PlaceholderVert, cInf: PlaceholderVert | null): boolean {
  if (bInf.id.isConnectionPin && bInf.id.isConnectionPin()) {
    return true;
  }
  if (bInf.id.isConnCheckpoint && bInf.id.isConnCheckpoint()) {
    return true;
  }
  let bendOkay: boolean = true;

  if (aInf == null || cInf == null) {
    return bendOkay;
  }

  const dInf: PlaceholderVert | null = bInf.shPrev;
  const eInf: PlaceholderVert | null = bInf.shNext;
  console.assert(dInf != null);
  console.assert(eInf != null);

  const a: Point = aInf.point;
  const b: Point = bInf.point;
  const c: Point = cInf.point;
  const d: Point = dInf!.point;
  const e: Point = eInf!.point;

  if (a.eq(b) || b.eq(c)) {
    return bendOkay;
  }

  const abc: number = vecDir(a, b, c);
  if (abc === 0) {
    bendOkay = true;
  } else {
    const abe: number = vecDir(a, b, e);
    const abd: number = vecDir(a, b, d);
    const bce: number = vecDir(b, c, e);
    const bcd: number = vecDir(b, c, d);

    bendOkay = false;
    if (abe > 0) {
      if (abc > 0 && abd >= 0 && bce >= 0) {
        bendOkay = true;
      }
    } else if (abd < 0) {
      if (abc < 0 && abe <= 0 && bcd <= 0) {
        bendOkay = true;
      }
    }
  }
  return bendOkay;
}

/**
 * Break up overlapping parallel segments that are not the same edge.
 */
export function splitBranchingSegments(poly: Polygon, polyIsConn: boolean, conn: Polygon, tolerance: number = 0): void {
  for (let ci = 1; ci < conn.ps.length; ++ci) {
    const c0: Point = conn.ps[ci - 1];
    const c1: Point = conn.ps[ci];

    for (let pj: number = (polyIsConn ? 1 : 0); pj < poly.ps.length; ) {
      const p0Idx: number = (pj === 0) ? poly.ps.length - 1 : pj - 1;
      const p0: Point = poly.ps[p0Idx];
      const p1: Point = poly.ps[pj];

      // Check the first point of the first conn segment.
      if (ci === 1 && pointOnLine(p0, p1, c0, tolerance)) {
        c0.vn = _midVertexNumber(p0, p1, c0);
        poly.ps.splice(pj, 0, c0.clone());
        if (pj > 0) pj--;
        continue;
      }
      // The second point of every segment.
      if (pointOnLine(p0, p1, c1, tolerance)) {
        c1.vn = _midVertexNumber(p0, p1, c1);
        poly.ps.splice(pj, 0, c1.clone());
        if (pj > 0) pj--;
        continue;
      }

      // Check reverse direction.
      if (polyIsConn && pj === 1 && pointOnLine(c0, c1, p0, tolerance)) {
        p0.vn = _midVertexNumber(c0, c1, p0);
        conn.ps.splice(ci, 0, p0.clone());
        continue;
      }
      if (pointOnLine(c0, c1, p1, tolerance)) {
        p1.vn = _midVertexNumber(c0, c1, p1);
        conn.ps.splice(ci, 0, p1.clone());
        // Don't increment pj, re-check same segment after insertion.
        continue;
      }
      ++pj;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns the midpoint of two points. */
function _midpoint(a: Point, b: Point): Point {
  return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
}

function _segDir(p1: Point, p2: Point): number {
  let result: number = 1;
  if (p1.x === p2.x) {
    if (p2.y > p1.y) result = -1;
  } else if (p1.y === p2.y) {
    if (p2.x < p1.x) result = -1;
  }
  return result;
}

function _posInlineWithConnEndSegs(pos: number, dim: number, conn: Polygon, poly: Polygon): boolean {
  const pLast: number = poly.size() - 1;
  const cLast: number = conn.size() - 1;
  return (
    (
      (pos === poly.ps[0].dim(dim) && pos === poly.ps[1].dim(dim)) ||
      (pos === poly.ps[pLast].dim(dim) && pos === poly.ps[pLast - 1].dim(dim))
    ) && (
      (pos === conn.ps[0].dim(dim) && pos === conn.ps[1].dim(dim)) ||
      (pos === conn.ps[cLast].dim(dim) && pos === conn.ps[cLast - 1].dim(dim))
    )
  );
}

/**
 * Computes the shared length of two shared paths (Manhattan distance).
 */
function _pathLength(c_path: Point[], p_path: Point[], size: number): number {
  let length: number = 0;
  for (let ind = 1; ind < size; ++ind) {
    if (c_path[ind - 1].eq(p_path[ind - 1]) &&
        c_path[ind].eq(p_path[ind])) {
      length += manhattanDist(c_path[ind - 1], c_path[ind]);
    }
  }
  return length;
}

/**
 * Returns a vertex number representing a point on the line between two
 * shape corners.
 */
function _midVertexNumber(p0: Point, p1: Point, c: Point): number {
  if (c.vn !== kUnassignedVertexNumber) {
    return c.vn;
  }
  if (p0.vn >= 4 && p0.vn < kUnassignedVertexNumber) {
    return p0.vn;
  }
  if (p1.vn >= 4 && p1.vn < kUnassignedVertexNumber) {
    return p1.vn;
  }
  if (p0.vn < 4 && p1.vn < 4) {
    if (p0.vn !== p1.vn) {
      return p0.vn;
    }
    let vn_mid: number = Math.min(p0.vn, p1.vn);
    if (Math.max(p0.vn, p1.vn) === 3 && vn_mid === 0) {
      vn_mid = 3;
    }
    return vn_mid + 4;
  }

  console.assert(p0.x === p1.x || p0.y === p1.y);

  if (p0.vn !== kUnassignedVertexNumber) {
    if (p0.x === p1.x) {
      return (p0.vn === 2 || p0.vn === 3) ? 6 : 4;
    } else {
      return (p0.vn === 0 || p0.vn === 3) ? 7 : 5;
    }
  } else if (p1.vn !== kUnassignedVertexNumber) {
    if (p0.x === p1.x) {
      return (p1.vn === 2 || p1.vn === 3) ? 6 : 4;
    } else {
      return (p1.vn === 0 || p1.vn === 3) ? 7 : 5;
    }
  }

  console.warn('midVertexNumber(): p0.vn and p1.vn both = kUnassignedVertexNumber');
  return kUnassignedVertexNumber;
}

/**
 * Placeholder VertInf-like object used until vertices.js is wired up.
 * TODO: Replace with actual VertInf import once circular deps are resolved.
 */
function _makePlaceholderVert(router: any, id: VertIDLike, point: Point): PlaceholderVert {
  return {
    router,
    id,
    point: point.clone ? point.clone() : new Point(point.x, point.y),
    visDirections: ConnDirAll,
    pathNext: null,
    shPrev: null,
    shNext: null,
    removeFromGraph(/* isConn */) {},
    Reset(newId: VertIDLike, newPoint: Point) {
      this.id = newId;
      this.point = newPoint.clone ? newPoint.clone() : new Point(newPoint.x, newPoint.y);
    },
  };
}
