/*
 * libavoid-js - Port of libavoid connend
 * Original C++ library: Copyright (C) 2004-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import { Point } from '../core/geomtypes';
import {
  ConnDirNone,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  ConnDirAll,
  ConnEndPoint,
  ConnEndShapePin,
  ConnEndJunction,
  ConnEndEmpty,
  kUnassignedVertexNumber,
  PROP_ConnPoint,
  portDirectionPenalty,
  VertID_src,
  VertID_tar,
} from '../core/constants';
import { rotationalAngle, euclideanDist, manhattanDist } from '../core/geometry';
import { CONNECTIONPIN_UNSET, CONNECTIONPIN_CENTRE, ShapeConnectionPin } from './connectionpin';
// TODO: VertInf import — may cause circular dependency with vertices.js
// import { VertInf, VertID } from '../graph/vertices';
// TODO: EdgeInf import — from graph.js when ported
// import { EdgeInf } from '../graph/graph';
// TODO: vertexVisibility import — from visibility.js when ported
// import { vertexVisibility } from '../graph/visibility';

// ---------------------------------------------------------------------------
//  Local interfaces to avoid circular imports
// ---------------------------------------------------------------------------

/** Minimal vertex interface (VertInf). */
export interface IVertInf {
  point: Point;
  visDirections: number;
  removeFromGraph(isConnVert?: boolean): void;
  Reset(pointOrId: Point | unknown, point?: Point): void;
}

/** Minimal router interface. */
export interface IRouter {
  routingParameter(param: number): number;
  m_allows_orthogonal_routing: boolean;
  m_allows_polyline_routing: boolean;
  vertices: { addVertex(v: IVertInf): void; removeVertex(v: IVertInf): void };
}

/**
 * Minimal obstacle interface covering both ShapeRef and JunctionRef.
 * Used for m_anchor_obj — the shape or junction a ConnEnd is attached to.
 */
export interface IObstacle {
  id(): number;
  position(): Point;
  router(): IRouter;
  addFollowingConnEnd(connEnd: ConnEnd): void;
  removeFollowingConnEnd(connEnd: ConnEnd): void;
  m_connection_pins: Set<ShapeConnectionPin>;
  possiblePinPoints(classId: number): Point[];
  addConnectionPin(pin: ShapeConnectionPin): number;
  removeConnectionPin(pin: ShapeConnectionPin): void;
  /** Duck-typing flag — true on ShapeRef instances. */
  _isShapeRef?: boolean;
  /** Duck-typing flag — true on JunctionRef instances. */
  _isJunctionRef?: boolean;
}

/**
 * Minimal ConnRef interface.
 * Only the members accessed from ConnEnd are listed.
 */
export interface IConnRef {
  id(): number;
  m_dst_connend: ConnEnd | null;
  m_src_connend: ConnEnd | null;
}

// ---------------------------------------------------------------------------
//  Constructor parameter discriminated unions
// ---------------------------------------------------------------------------

/** Parameter object for the ConnEnd constructor. */
interface ConnEndPointParams {
  _kind: 'point';
  point: Point;
  visDirs?: number;
}

interface ConnEndShapePinParams {
  _kind: 'shapePin';
  shapeRef: IObstacle;
  connectionPinClassID: number;
}

interface ConnEndJunctionParams {
  _kind: 'junction';
  junctionRef: IObstacle;
}

type ConnEndParams = ConnEndPointParams | ConnEndShapePinParams | ConnEndJunctionParams;

/**
 * ConnEnd — represents a connector endpoint.
 *
 * Endpoints may be free-floating points, points attached to a shape via a
 * ShapeConnectionPin, or points attached to a junction.
 */
export class ConnEnd {
  // -------------------------------------------------------------------------
  //  Fields
  // -------------------------------------------------------------------------

  m_type: number;
  m_point: Point;
  m_directions: number;
  m_connection_pin_class_id: number;
  /** Obstacle (ShapeRef or JunctionRef) */
  m_anchor_obj: IObstacle | null;
  /** Parent ConnRef */
  m_conn_ref: IConnRef | null;
  m_active_pin: ShapeConnectionPin | null;

  // -------------------------------------------------------------------------
  //  Constructors
  // -------------------------------------------------------------------------

  /**
   * Default / multi-purpose constructor.
   *
   * Use the static factory helpers for clarity:
   *   ConnEnd.fromPoint(point, visDirs?)
   *   ConnEnd.fromShapePin(shapeRef, pinClassId)
   *   ConnEnd.fromJunction(junctionRef)
   */
  constructor(params?: ConnEndParams) {
    this.m_type = ConnEndEmpty;
    this.m_point = new Point(0, 0);
    this.m_directions = ConnDirAll;
    this.m_connection_pin_class_id = CONNECTIONPIN_UNSET;
    this.m_anchor_obj = null;
    this.m_conn_ref = null;
    this.m_active_pin = null;

    if (params) {
      this._applyParams(params);
    }
  }

  /** @private */
  private _applyParams(p: ConnEndParams): void {
    if (p._kind === 'point') {
      this.m_type = ConnEndPoint;
      this.m_point = p.point.clone ? p.point.clone() : new Point(p.point.x, p.point.y);
      this.m_directions = p.visDirs !== undefined ? p.visDirs : ConnDirAll;
    } else if (p._kind === 'shapePin') {
      this.m_type = ConnEndShapePin;
      this.m_connection_pin_class_id = p.connectionPinClassID;
      this.m_anchor_obj = p.shapeRef;

      console.assert(this.m_anchor_obj !== null, 'ConnEnd: shapeRef must not be null');
      console.assert(this.m_connection_pin_class_id > 0, 'ConnEnd: connectionPinClassID must be > 0');
      console.assert(this.m_connection_pin_class_id !== CONNECTIONPIN_UNSET,
        'ConnEnd: connectionPinClassID must not be CONNECTIONPIN_UNSET');

      this.m_point = this.m_anchor_obj.position();
    } else if (p._kind === 'junction') {
      this.m_type = ConnEndJunction;
      this.m_connection_pin_class_id = CONNECTIONPIN_CENTRE;
      this.m_anchor_obj = p.junctionRef;

      console.assert(this.m_anchor_obj !== null, 'ConnEnd: junctionRef must not be null');

      this.m_point = this.m_anchor_obj.position();
    }
  }

  // -- Static factory helpers ------------------------------------------------

  /**
   * Create a ConnEnd from a free-floating point.
   */
  static fromPoint(point: Point, visDirs: number = ConnDirAll): ConnEnd {
    return new ConnEnd({ _kind: 'point', point, visDirs });
  }

  /**
   * Create a ConnEnd attached to a shape's connection pin class.
   */
  static fromShapePin(shapeRef: IObstacle, connectionPinClassID: number): ConnEnd {
    return new ConnEnd({ _kind: 'shapePin', shapeRef, connectionPinClassID });
  }

  /**
   * Create a ConnEnd attached to a junction.
   */
  static fromJunction(junctionRef: IObstacle): ConnEnd {
    return new ConnEnd({ _kind: 'junction', junctionRef });
  }

  // -------------------------------------------------------------------------
  //  Public read-only accessors
  // -------------------------------------------------------------------------

  /**
   * Returns the kind of connection this ConnEnd represents.
   * @returns One of ConnEndPoint, ConnEndShapePin, ConnEndJunction, ConnEndEmpty.
   */
  type(): number {
    return this.m_type;
  }

  /**
   * Returns the current position of this connector endpoint.
   * If attached to a pin, the pin's position is returned.
   * If attached to an anchor object, the object's position is returned.
   * Otherwise the stored point is returned.
   */
  position(): Point {
    if (this.m_active_pin) {
      return this.m_active_pin.position();
    } else if (this.m_anchor_obj) {
      return this.m_anchor_obj.position();
    }
    return this.m_point;
  }

  /**
   * Returns the visibility direction flags for this endpoint.
   * If attached to an active pin, the pin's directions are returned.
   */
  directions(): number {
    if (this.m_active_pin) {
      return this.m_active_pin.directions();
    }
    return this.m_directions;
  }

  /**
   * Returns the parent shape (if ConnEndShapePin), or null.
   * Uses duck-typing check for shape identity (checks for `_isShapeRef` flag
   * or falls back to the anchor object directly).
   */
  shape(): IObstacle | null {
    if (this.m_anchor_obj && this.m_anchor_obj._isShapeRef) {
      return this.m_anchor_obj;
    }
    // If type is ConnEndShapePin, the anchor is the shape.
    if (this.m_type === ConnEndShapePin) {
      return this.m_anchor_obj;
    }
    return null;
  }

  /**
   * Returns the parent junction (if ConnEndJunction), or null.
   */
  junction(): IObstacle | null {
    if (this.m_anchor_obj && this.m_anchor_obj._isJunctionRef) {
      return this.m_anchor_obj;
    }
    if (this.m_type === ConnEndJunction) {
      return this.m_anchor_obj;
    }
    return null;
  }

  /**
   * Returns the pin class ID for a shape-attached ConnEnd.
   */
  pinClassId(): number {
    return this.m_connection_pin_class_id;
  }

  // -------------------------------------------------------------------------
  //  Internal / friend methods
  // -------------------------------------------------------------------------

  /**
   * Returns whether this is a pin-based connection (shape pin or junction).
   */
  isPinConnection(): boolean {
    return this.m_type === ConnEndShapePin || this.m_type === ConnEndJunction;
  }

  /**
   * Returns the endpoint type flag (VertID.src or VertID.tar) based on
   * whether this ConnEnd is the source or destination of its parent connector.
   */
  endpointType(): number {
    console.assert(this.m_conn_ref !== null, 'ConnEnd.endpointType: m_conn_ref must not be null');
    return (this.m_conn_ref!.m_dst_connend === this) ? VertID_tar : VertID_src;
  }

  /**
   * Creates the connection between a connector and a shape/junction.
   */
  connect(conn: IConnRef): void {
    console.assert(this.isPinConnection(), 'ConnEnd.connect: must be a pin connection');
    console.assert(this.m_anchor_obj !== null, 'ConnEnd.connect: m_anchor_obj must not be null');
    console.assert(this.m_conn_ref === null, 'ConnEnd.connect: already connected');

    this.m_anchor_obj!.addFollowingConnEnd(this);
    this.m_conn_ref = conn;
  }

  /**
   * Removes the connection between a connector and a shape/junction.
   */
  disconnect(shapeDeleted: boolean = false): void {
    if (this.m_conn_ref === null) {
      // Not connected.
      return;
    }

    this.m_point = this.position();
    this.m_anchor_obj!.removeFollowingConnEnd(this);
    this.m_conn_ref = null;

    if (shapeDeleted) {
      // Turn this into a manual / free-floating ConnEnd.
      this.m_point = this.position();
      this.m_anchor_obj = null;
      this.m_type = ConnEndPoint;
      this.m_connection_pin_class_id = CONNECTIONPIN_UNSET;
    }
  }

  /**
   * Marks this ConnEnd as using a particular ShapeConnectionPin.
   */
  usePin(pin: ShapeConnectionPin): void {
    console.assert(this.m_active_pin === null, 'ConnEnd.usePin: already using a pin');

    this.m_active_pin = pin;
    if (this.m_active_pin) {
      this.m_active_pin.m_connend_users.add(this);
    }
  }

  /**
   * Marks this ConnEnd as using the ShapeConnectionPin whose vertex matches
   * the given VertInf.
   */
  usePinVertex(pinVert: IVertInf): void {
    console.assert(this.m_active_pin === null, 'ConnEnd.usePinVertex: already using a pin');

    for (const currPin of this.m_anchor_obj!.m_connection_pins as Set<ShapeConnectionPin>) {
      if (currPin.m_vertex === pinVert) {
        this.usePin(currPin);
        break;
      }
    }
  }

  /**
   * Releases the currently active ShapeConnectionPin (if any).
   */
  freeActivePin(): void {
    if (this.m_active_pin) {
      this.m_active_pin.m_connend_users.delete(this);
    }
    this.m_active_pin = null;
  }

  /**
   * Returns an array of all possible pin positions for this ConnEnd's pin
   * class on its anchor object.
   */
  possiblePinPoints(): Point[] {
    if (!this.m_anchor_obj || this.m_connection_pin_class_id === CONNECTIONPIN_UNSET) {
      return [];
    }
    return this.m_anchor_obj.possiblePinPoints(this.m_connection_pin_class_id);
  }

  /**
   * Assigns visibility edges from a dummy connection vertex to every eligible
   * pin vertex that matches this ConnEnd's pin class ID.
   */
  assignPinVisibilityTo(dummyConnectionVert: IVertInf, targetVert: IVertInf): void {
    let validPinCount: number = 0;

    console.assert(this.m_anchor_obj !== null,
      'ConnEnd.assignPinVisibilityTo: m_anchor_obj must not be null');
    console.assert(this.m_connection_pin_class_id !== CONNECTIONPIN_UNSET,
      'ConnEnd.assignPinVisibilityTo: pin class must be set');

    const router: IRouter = this.m_anchor_obj!.router();

    for (const currPin of this.m_anchor_obj!.m_connection_pins as Set<ShapeConnectionPin>) {
      if (
        currPin.m_class_id === this.m_connection_pin_class_id &&
        (!currPin.m_exclusive || currPin.m_connend_users.size === 0)
      ) {
        let routingCost: number = currPin.m_connection_cost;
        const adjTargetPt: Point = targetVert.point.sub(currPin.m_vertex!.point);
        const angle: number = rotationalAngle(adjTargetPt);
        let inVisibilityRange: boolean = false;

        if (angle <= 45 || angle >= 315) {
          if (currPin.directions() & ConnDirRight) {
            inVisibilityRange = true;
          }
        }
        if (angle >= 45 && angle <= 135) {
          if (currPin.directions() & ConnDirDown) {
            inVisibilityRange = true;
          }
        }
        if (angle >= 135 && angle <= 225) {
          if (currPin.directions() & ConnDirLeft) {
            inVisibilityRange = true;
          }
        }
        if (angle >= 225 && angle <= 315) {
          if (currPin.directions() & ConnDirUp) {
            inVisibilityRange = true;
          }
        }

        if (!inVisibilityRange) {
          routingCost += router.routingParameter(portDirectionPenalty);
        }

        if (router.m_allows_orthogonal_routing) {
          // TODO: EdgeInf construction when graph.js is ported
          // const edge = new EdgeInf(dummyConnectionVert, currPin.m_vertex, true);
          // edge.setDist(
          //   manhattanDist(dummyConnectionVert.point, currPin.m_vertex.point) +
          //   Math.max(0.001, routingCost)
          // );
        }

        if (router.m_allows_polyline_routing) {
          // TODO: EdgeInf construction when graph.js is ported
          // const edge = new EdgeInf(dummyConnectionVert, currPin.m_vertex, false);
          // edge.setDist(
          //   euclideanDist(dummyConnectionVert.point, currPin.m_vertex.point) +
          //   Math.max(0.001, routingCost)
          // );
        }

        validPinCount++;
      }
    }

    if (validPinCount === 0) {
      console.warn(
        `ConnEnd.assignPinVisibilityTo: ConnEnd for connector ${this.m_conn_ref ? this.m_conn_ref.id() : '?'} ` +
        `can't connect to shape ${this.m_anchor_obj ? this.m_anchor_obj.id() : '?'} ` +
        `since it has no pins with class id of ${this.m_connection_pin_class_id}.`
      );
    }
  }

  /**
   * Returns a [addedVertex, vertex] pair for hyperedge routing.
   *
   * If attached to an anchor object, finds a matching pin vertex.
   * Otherwise creates a new free-floating VertInf.
   */
  getHyperedgeVertex(router: IRouter): [boolean, IVertInf | null] {
    let addedVertex: boolean = false;
    let vertex: IVertInf | null = null;

    if (this.m_anchor_obj) {
      for (const currPin of this.m_anchor_obj.m_connection_pins as Set<ShapeConnectionPin>) {
        if (
          currPin.m_class_id === this.m_connection_pin_class_id &&
          (!currPin.m_exclusive || currPin.m_connend_users.size === 0)
        ) {
          vertex = currPin.m_vertex;
        }
      }
      console.assert(vertex !== null,
        'ConnEnd.getHyperedgeVertex: no matching pin vertex found');
    } else {
      // TODO: Uncomment when VertInf / VertID are ported.
      // const id = new VertID(0, kUnassignedVertexNumber, PROP_ConnPoint);
      // vertex = new VertInf(router, id, this.m_point);
      // vertex.visDirections = this.m_directions;
      // addedVertex = true;
      //
      // if (router.m_allows_polyline_routing) {
      //     vertexVisibility(vertex, null, true, true);
      // }
    }

    return [addedVertex, vertex];
  }
}
