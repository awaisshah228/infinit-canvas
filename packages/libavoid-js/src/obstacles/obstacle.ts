/*
 * libavoid-js - Port of libavoid obstacle
 * Original: Copyright (C) 2004-2014 Monash University
 * Author: Michael Wybrow
 *
 * The Obstacle class is the superclass for ShapeRef and JunctionRef.
 * It represents an obstacle that connectors must be routed around.
 */

import { shapeBufferDistance } from '../core/constants';
import { Point, Box, Polygon } from '../core/geomtypes';

// Minimal Router interface to avoid circular dependency.
// The real Router class has many more members; we only type what Obstacle uses.
export interface IRouter {
  assignId(id: number): number;
  routingParameter(param: number): number;
  modifyConnectionPin(pin: ShapeConnectionPin): void;
  modifyConnector(connRef: any, endpointType: any, connEnd: any, connPinUpdate?: boolean): void;
  vertices: VertInfList;
  m_obstacles: Obstacle[];
  m_currently_calling_destructors: boolean;
  addShape(shape: any): void;
  addJunction(junction: any): void;
  addCluster(cluster: any): void;
  deleteCluster(cluster: any): void;
  deleteConnector(conn: any): void;
  deleteJunction(junction: any): void;
  registerSettingsChange(): void;
  clusterRefs: any[];
}

// Minimal interface for ConnEnd objects attached to an obstacle.
export interface IConnEnd {
  m_conn_ref: any;
  endpointType(): any;
  disconnect(deletedShape: boolean): void;
}

// Minimal interface for ShapeConnectionPin objects.
export interface ShapeConnectionPin {
  m_class_id: number;
  m_exclusive: boolean;
  m_connend_users: Set<any>;
  m_vertex: VertInf;
  m_shape: any;
  m_using_proportional_offsets: boolean;
  m_x_offset: number;
  m_y_offset: number;
  m_visibility_directions: number;
  directions(): number;
  setConnectionCost(cost: number): void;
  updatePosition(poly: Polygon | Point): void;
  updateVisibility(): void;
  updatePositionAndVisibility(): void;
  assignVisibilityTo(vert: VertInf): void;
  outputCode?(): string;
}

// Edge-like object used in visibility lists.
export interface IEdge {
  disconnect(): void;
}

/**
 * VertID - Identifier for a vertex, combining an object ID and vertex number.
 * This is a minimal port needed by Obstacle. The full version will live in vertices.js.
 */
export class VertID {
  public objID: number;
  public vn: number;
  public props: number;

  constructor(objID: number = 0, vn: number = 0, props: number = 0) {
    this.objID = objID;
    this.vn = vn;
    this.props = props;
  }

  clone(): VertID {
    return new VertID(this.objID, this.vn, this.props);
  }

  equals(rhs: VertID): boolean {
    return this.objID === rhs.objID && this.vn === rhs.vn;
  }

  notEquals(rhs: VertID): boolean {
    return !this.equals(rhs);
  }

  lessThan(rhs: VertID): boolean {
    if (this.objID !== rhs.objID) return this.objID < rhs.objID;
    return this.vn < rhs.vn;
  }

  // VertID + int => increments vn
  add(rhs: number): VertID {
    return new VertID(this.objID, this.vn + rhs, this.props);
  }

  // VertID - int => decrements vn
  sub(rhs: number): VertID {
    return new VertID(this.objID, this.vn - rhs, this.props);
  }

  // Post-increment (i++): increments vn, returns self (mutating)
  increment(): VertID {
    this.vn++;
    return this;
  }

  isOrthShapeEdge(): boolean {
    return (this.props & 2) !== 0; // PROP_OrthShapeEdge
  }

  isConnPt(): boolean {
    return (this.props & 1) !== 0; // PROP_ConnPoint
  }

  isConnectionPin(): boolean {
    return (this.props & 4) !== 0; // PROP_ConnectionPin
  }

  isConnCheckpoint(): boolean {
    return (this.props & 8) !== 0; // PROP_ConnCheckpoint
  }

  isDummyPinHelper(): boolean {
    return (this.props & 16) !== 0; // PROP_DummyPinHelper
  }

  print(): void {
    console.log(`VertID(${this.objID}, ${this.vn})`);
  }
}

/**
 * VertInf - A vertex in the visibility graph.
 * Minimal port needed by Obstacle. The full version will live in vertices.js.
 */
export class VertInf {
  public _router: IRouter | null;
  public id: VertID;
  public point: Point;
  public lstPrev: VertInf | null;
  public lstNext: VertInf | null;
  public shPrev: VertInf | null;
  public shNext: VertInf | null;
  public visList: IEdge[];
  public visListSize: number;
  public orthogVisList: IEdge[];
  public orthogVisListSize: number;
  public invisList: IEdge[];
  public invisListSize: number;
  public pathNext: VertInf | null;
  public m_orthogonalPartner: VertInf | null;
  public m_treeRoot: VertInf | null;
  public sptfDist: number;
  public visDirections: number;
  public aStarDoneNodes: any[];
  public aStarPendingNodes: any[];
  public orthogVisPropFlags: number;

  constructor(router: IRouter | null, vid: VertID, vpoint: Point, addToRouter: boolean = true) {
    this._router = router;
    this.id = vid.clone();
    this.point = vpoint.clone();
    this.lstPrev = null;
    this.lstNext = null;
    this.shPrev = null;
    this.shNext = null;
    this.visList = [];
    this.visListSize = 0;
    this.orthogVisList = [];
    this.orthogVisListSize = 0;
    this.invisList = [];
    this.invisListSize = 0;
    this.pathNext = null;
    this.m_orthogonalPartner = null;
    this.m_treeRoot = null;
    this.sptfDist = 0;
    this.visDirections = 0;
    this.aStarDoneNodes = [];
    this.aStarPendingNodes = [];
    this.orthogVisPropFlags = 0;

    if (addToRouter && router) {
      router.vertices.addVertex(this);
    }
  }

  Reset(vidOrPoint: VertID | Point, vpoint?: Point): void {
    if (vpoint !== undefined) {
      // Reset(vid, point) form
      this.id = (vidOrPoint as VertID).clone();
      this.point = vpoint.clone();
    } else {
      // Reset(point) form
      this.point = (vidOrPoint as Point).clone();
    }
  }

  removeFromGraph(isConnVert: boolean = true): void {
    // Remove all edges from visibility and invisibility lists.
    // Full implementation will be in vertices.js.
    // For now, clear the lists.
    if (this._router) {
      // Remove edges from visList
      while (this.visList.length > 0) {
        const edge: IEdge | undefined = this.visList[0];
        if (edge && typeof edge.disconnect === 'function') {
          edge.disconnect();
        } else {
          this.visList.shift();
        }
      }
      this.visListSize = 0;

      // Remove edges from invisList
      while (this.invisList.length > 0) {
        const edge: IEdge | undefined = this.invisList[0];
        if (edge && typeof edge.disconnect === 'function') {
          edge.disconnect();
        } else {
          this.invisList.shift();
        }
      }
      this.invisListSize = 0;

      // Remove edges from orthogVisList
      while (this.orthogVisList.length > 0) {
        const edge: IEdge | undefined = this.orthogVisList[0];
        if (edge && typeof edge.disconnect === 'function') {
          edge.disconnect();
        } else {
          this.orthogVisList.shift();
        }
      }
      this.orthogVisListSize = 0;
    }
  }

  orphaned(): boolean {
    return (this.lstPrev === null && this.lstNext === null);
  }

  setVisibleDirections(directions: number): void {
    this.visDirections = directions;
  }

  orphan(): void {
    this.lstPrev = null;
    this.lstNext = null;
  }
}

/**
 * VertInfList - A linked list of all vertices in the router instance.
 * Connector endpoints are listed first, then shape vertices.
 */
export class VertInfList {
  private _firstShapeVert: VertInf | null;
  private _firstConnVert: VertInf | null;
  private _lastShapeVert: VertInf | null;
  private _lastConnVert: VertInf | null;
  private _shapeVertices: number;
  private _connVertices: number;

  constructor() {
    this._firstShapeVert = null;
    this._firstConnVert = null;
    this._lastShapeVert = null;
    this._lastConnVert = null;
    this._shapeVertices = 0;
    this._connVertices = 0;
  }

  addVertex(vert: VertInf): void {
    // Determine if this is a connector vertex or shape vertex
    const isConnVert: boolean = vert.id.isConnPt();

    if (isConnVert) {
      // Add to the front of the connector vertices section
      if (this._firstConnVert === null) {
        // First connector vertex
        vert.lstPrev = null;
        vert.lstNext = this._firstShapeVert;
        if (this._firstShapeVert) {
          this._firstShapeVert.lstPrev = vert;
        }
        this._firstConnVert = vert;
        this._lastConnVert = vert;
      } else {
        // Insert before the first connector vertex
        vert.lstPrev = null;
        vert.lstNext = this._firstConnVert;
        this._firstConnVert.lstPrev = vert;
        this._firstConnVert = vert;
      }
      this._connVertices++;
    } else {
      // Shape vertex - add to the end
      if (this._lastShapeVert === null) {
        // First shape vertex
        if (this._lastConnVert) {
          vert.lstPrev = this._lastConnVert;
          this._lastConnVert.lstNext = vert;
        } else {
          vert.lstPrev = null;
        }
        vert.lstNext = null;
        this._firstShapeVert = vert;
        this._lastShapeVert = vert;
      } else {
        // Add after last shape vertex
        vert.lstPrev = this._lastShapeVert;
        vert.lstNext = null;
        this._lastShapeVert.lstNext = vert;
        this._lastShapeVert = vert;
      }
      this._shapeVertices++;
    }
  }

  removeVertex(vert: VertInf): VertInf {
    const isConnVert: boolean = vert.id.isConnPt();

    // Update first/last pointers
    if (vert === this._firstConnVert) {
      if (this._firstConnVert === this._lastConnVert) {
        this._firstConnVert = null;
        this._lastConnVert = null;
      } else {
        this._firstConnVert = vert.lstNext;
      }
    } else if (vert === this._lastConnVert) {
      this._lastConnVert = vert.lstPrev;
    }

    if (vert === this._firstShapeVert) {
      if (this._firstShapeVert === this._lastShapeVert) {
        this._firstShapeVert = null;
        this._lastShapeVert = null;
      } else {
        this._firstShapeVert = vert.lstNext;
      }
    } else if (vert === this._lastShapeVert) {
      this._lastShapeVert = vert.lstPrev;
    }

    // Unlink from list
    if (vert.lstPrev) {
      vert.lstPrev.lstNext = vert.lstNext;
    }
    if (vert.lstNext) {
      vert.lstNext.lstPrev = vert.lstPrev;
    }

    vert.lstPrev = null;
    vert.lstNext = null;

    if (isConnVert) {
      this._connVertices--;
    } else {
      this._shapeVertices--;
    }

    return vert;
  }

  getVertexByID(vid: VertID): VertInf | null {
    let curr: VertInf | null = this._firstConnVert || this._firstShapeVert;
    while (curr) {
      if (curr.id.equals(vid)) {
        return curr;
      }
      curr = curr.lstNext;
    }
    return null;
  }

  getVertexByPos(p: Point): VertInf | null {
    let curr: VertInf | null = this._firstConnVert || this._firstShapeVert;
    while (curr) {
      if (curr.point.equals(p, 0)) {
        return curr;
      }
      curr = curr.lstNext;
    }
    return null;
  }

  shapesBegin(): VertInf | null {
    return this._firstShapeVert;
  }

  connsBegin(): VertInf | null {
    return this._firstConnVert;
  }

  end(): null {
    return null;
  }

  connsSize(): number {
    return this._connVertices;
  }

  shapesSize(): number {
    return this._shapeVertices;
  }
}


/**
 * Obstacle - Base class representing an obstacle that must be routed around.
 * Superclass of ShapeRef and JunctionRef.
 */
export class Obstacle {
  public m_router: IRouter;
  public m_polygon: Polygon;
  public m_active: boolean;
  public m_id: number;
  public m_first_vert: VertInf | null;
  public m_last_vert: VertInf | null;
  public m_following_conns: Set<IConnEnd>;
  public m_connection_pins: Set<ShapeConnectionPin>;
  public m_router_obstacles_pos: number;

  /**
   * @param router - The router scene to place the obstacle into.
   * @param poly - A Polygon representing the boundary of the obstacle.
   * @param id - A unique positive integer ID for the obstacle (0 = auto-assign).
   */
  constructor(router: IRouter, poly: Polygon, id: number = 0) {
    console.assert(router !== null && router !== undefined,
      'Obstacle: router must not be null');

    this.m_router = router;
    this.m_polygon = poly;
    this.m_active = false;
    this.m_first_vert = null;
    this.m_last_vert = null;
    this.m_following_conns = new Set<IConnEnd>();
    this.m_connection_pins = new Set<ShapeConnectionPin>();
    this.m_router_obstacles_pos = -1; // Index in router's obstacles list

    // Assign ID via router
    this.m_id = this.m_router.assignId(id);

    // Create VertID starting at (m_id, 0)
    const i: VertID = new VertID(this.m_id, 0);

    const routingPoly: Polygon = this.routingPolygon();
    const addToRouterNow: boolean = false;
    let last: VertInf | null = null;
    let node: VertInf | null = null;

    for (let pt_i = 0; pt_i < routingPoly.size(); pt_i++) {
      node = new VertInf(this.m_router, i, routingPoly.ps[pt_i], addToRouterNow);

      if (!this.m_first_vert) {
        this.m_first_vert = node;
      } else {
        node.shPrev = last;
        last!.shNext = node;
      }

      last = node;
      i.increment(); // i++
    }
    this.m_last_vert = node;

    // Make circular linked list via shPrev/shNext
    this.m_last_vert!.shNext = this.m_first_vert;
    this.m_first_vert!.shPrev = this.m_last_vert;
  }

  /**
   * Destructor equivalent - call to clean up vertices and pins.
   */
  destroy(): void {
    console.assert(this.m_active === false,
      'Obstacle.destroy: obstacle must be inactive');
    console.assert(this.m_first_vert !== null,
      'Obstacle.destroy: first_vert must not be null');

    // Delete all vertices in the circular linked list
    let it: VertInf = this.m_first_vert!;
    do {
      const tmp: VertInf = it;
      it = it.shNext!;
      // In JS we just null out references; GC handles the rest
      tmp.shPrev = null;
      tmp.shNext = null;
      tmp.lstPrev = null;
      tmp.lstNext = null;
    } while (it !== this.m_first_vert);

    this.m_first_vert = null;
    this.m_last_vert = null;

    // Free and clear any connection pins.
    // TODO: When ShapeConnectionPin is ported, call pin.destroy() for each.
    this.m_connection_pins.clear();
  }

  /**
   * Returns the ID of this obstacle.
   */
  id(): number {
    return this.m_id;
  }

  /**
   * Returns a reference to the polygon boundary of this obstacle.
   */
  polygon(): Polygon {
    return this.m_polygon;
  }

  /**
   * Returns the router scene this obstacle is in.
   */
  router(): IRouter {
    return this.m_router;
  }

  /**
   * Abstract method - must be overridden by subclasses.
   * Returns the position of this obstacle.
   */
  position(): Point {
    throw new Error('Obstacle.position() is abstract and must be overridden');
  }

  /**
   * Update the polygon for this obstacle.
   * @param poly - The new polygon boundary.
   */
  setNewPoly(poly: Polygon): void {
    console.assert(this.m_first_vert !== null,
      'Obstacle.setNewPoly: first_vert must not be null');
    console.assert(this.m_polygon.size() === poly.size(),
      'Obstacle.setNewPoly: new polygon must have same number of points');

    this.m_polygon = poly;
    const routingPoly: Polygon = this.routingPolygon();

    let curr: VertInf = this.m_first_vert!;
    for (let pt_i = 0; pt_i < routingPoly.size(); pt_i++) {
      console.assert(curr.visListSize === 0,
        'Obstacle.setNewPoly: vertex visListSize must be 0');
      console.assert(curr.invisListSize === 0,
        'Obstacle.setNewPoly: vertex invisListSize must be 0');

      // Reset with the new polygon point
      curr.Reset(routingPoly.ps[pt_i]);
      curr.pathNext = null;

      curr = curr.shNext!;
    }
    console.assert(curr === this.m_first_vert,
      'Obstacle.setNewPoly: circular list traversal mismatch');

    // Update pin positions for the new polygon
    for (const pin of this.m_connection_pins) {
      pin.updatePosition(this.m_polygon);
    }
  }

  /**
   * Returns the first vertex of this obstacle.
   */
  firstVert(): VertInf | null {
    return this.m_first_vert;
  }

  /**
   * Returns the last vertex of this obstacle.
   */
  lastVert(): VertInf | null {
    return this.m_last_vert;
  }

  /**
   * Returns the bounding box for routing around this obstacle.
   */
  routingBox(): Box {
    console.assert(!this.m_polygon.empty(), 'Obstacle.routingBox: polygon must not be empty');
    console.assert(this.m_router != null, 'Obstacle.routingBox: router must exist');

    const bufferSpace: number = this.m_router.routingParameter(shapeBufferDistance);
    return this.m_polygon.offsetBoundingBox(bufferSpace);
  }

  /**
   * Returns the polygon used for routing (offset by buffer distance).
   */
  routingPolygon(): Polygon {
    console.assert(!this.m_polygon.empty(), 'Obstacle.routingPolygon: polygon must not be empty');
    console.assert(this.m_router != null, 'Obstacle.routingPolygon: router must exist');

    const bufferSpace: number = this.m_router.routingParameter(shapeBufferDistance);
    return this.m_polygon.offsetPolygon(bufferSpace);
  }

  /**
   * Returns a list of connectors attached to this obstacle.
   */
  attachedConnectors(): any[] {
    const attachedConns: any[] = [];
    for (const connEnd of this.m_following_conns) {
      console.assert(connEnd.m_conn_ref !== null,
        'Obstacle.attachedConnectors: connEnd must have a conn_ref');
      attachedConns.push(connEnd.m_conn_ref);
    }
    return attachedConns;
  }

  /**
   * Compute naive visibility for this obstacle.
   * Defined in visibility.js (when ported).
   */
  computeVisibilityNaive(): void {
    // TODO: Implement when visibility.js is ported
  }

  /**
   * Compute sweep-based visibility for this obstacle.
   * Defined in visibility.js (when ported).
   */
  computeVisibilitySweep(): void {
    // TODO: Implement when visibility.js is ported
  }

  /**
   * Output code representation (abstract - must be overridden).
   */
  outputCode(): string {
    throw new Error('Obstacle.outputCode() is abstract and must be overridden');
  }

  /**
   * Make this obstacle active in the router.
   */
  makeActive(): void {
    console.assert(!this.m_active, 'Obstacle.makeActive: must not already be active');

    // Add to router's obstacles list (at the beginning)
    this.m_router.m_obstacles.unshift(this);
    this.m_router_obstacles_pos = 0;

    // Add points to vertex list
    let it: VertInf = this.m_first_vert!;
    do {
      const tmp: VertInf = it;
      it = it.shNext!;
      this.m_router.vertices.addVertex(tmp);
    } while (it !== this.m_first_vert);

    this.m_active = true;
  }

  /**
   * Make this obstacle inactive in the router.
   */
  makeInactive(): void {
    console.assert(this.m_active, 'Obstacle.makeInactive: must be active');

    // Remove from router's obstacles list
    const idx: number = this.m_router.m_obstacles.indexOf(this);
    if (idx !== -1) {
      this.m_router.m_obstacles.splice(idx, 1);
    }

    // Remove points from vertex list
    let it: VertInf = this.m_first_vert!;
    do {
      const tmp: VertInf = it;
      it = it.shNext!;
      this.m_router.vertices.removeVertex(tmp);
    } while (it !== this.m_first_vert);

    this.m_active = false;

    // Turn attached ConnEnds into manual points
    const deletedShape: boolean = true;
    while (this.m_following_conns.size > 0) {
      const connEnd: IConnEnd = this.m_following_conns.values().next().value!;
      connEnd.disconnect(deletedShape);
    }
  }

  /**
   * Whether this obstacle is active in the router.
   */
  isActive(): boolean {
    return this.m_active;
  }

  /**
   * Update visibility for all connection pins on this obstacle.
   */
  updatePinPolyLineVisibility(): void {
    for (const pin of this.m_connection_pins) {
      pin.updateVisibility();
    }
  }

  /**
   * Remove this obstacle from the visibility graph.
   */
  removeFromGraph(): void {
    const isConnPt: boolean = false;
    let iter: VertInf | null = this.firstVert();
    const stopAfter: VertInf | null = this.lastVert()?.lstNext ?? null;
    while (iter !== stopAfter) {
      const tmp: VertInf = iter!;
      iter = iter!.lstNext;
      tmp.removeFromGraph(isConnPt);
    }
  }

  /**
   * Returns the centre point of this obstacle's routing box.
   */
  shapeCentre(): Point {
    const bb: Box = this.routingBox();
    const centre: Point = new Point();
    centre.x = bb.min.x + (0.5 * (bb.max.x - bb.min.x));
    centre.y = bb.min.y + (0.5 * (bb.max.y - bb.min.y));
    return centre;
  }

  /**
   * Find a vertex in this obstacle's vertex list matching the given point.
   */
  getPointVertex(point: Point): VertInf | null {
    let curr: VertInf = this.m_first_vert!;
    do {
      if (curr.point.equals(point, 0)) {
        return curr;
      }
      curr = curr.shNext!;
    } while (curr !== this.m_first_vert);

    return null;
  }

  /**
   * Add a ConnEnd that follows this obstacle.
   */
  addFollowingConnEnd(connEnd: IConnEnd): void {
    this.m_following_conns.add(connEnd);
  }

  /**
   * Remove a ConnEnd that follows this obstacle.
   */
  removeFollowingConnEnd(connEnd: IConnEnd): void {
    this.m_following_conns.delete(connEnd);
  }

  /**
   * Add a connection pin to this obstacle.
   * @returns The number of connection pins after adding.
   */
  addConnectionPin(pin: ShapeConnectionPin): number {
    this.m_connection_pins.add(pin);
    this.m_router.modifyConnectionPin(pin);
    return this.m_connection_pins.size;
  }

  /**
   * Remove a connection pin from this obstacle.
   */
  removeConnectionPin(pin: ShapeConnectionPin): void {
    this.m_connection_pins.delete(pin);
    this.m_router.modifyConnectionPin(pin);
  }

  /**
   * Assign pin visibility to a dummy connection vertex for a given pin class.
   */
  assignPinVisibilityTo(pinClassId: number, dummyConnectionVert: VertInf): void {
    for (const pin of this.m_connection_pins) {
      if (pin.m_class_id === pinClassId) {
        pin.assignVisibilityTo(dummyConnectionVert);
      }
    }
  }

  /**
   * Returns all possible pin points for a given pin class ID.
   */
  possiblePinPoints(pinClassId: number): Point[] {
    const points: Point[] = [];
    for (const currPin of this.m_connection_pins) {
      if ((currPin.m_class_id === pinClassId) &&
          (!currPin.m_exclusive || currPin.m_connend_users.size === 0)) {
        points.push(currPin.m_vertex.point);
      }
    }
    return points;
  }
}
