/*
 * libavoid-js - Port of libavoid connectionpin
 * Original C++ library: Copyright (C) 2010-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import { Point, Polygon } from '../core/geomtypes';
import {
  ConnDirNone,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  ConnDirAll,
  ATTACH_POS_TOP,
  ATTACH_POS_BOTTOM,
  ATTACH_POS_LEFT,
  ATTACH_POS_RIGHT,
  kShapeConnectionPin,
  PROP_ConnPoint,
  PROP_ConnectionPin,
} from '../core/constants';
// TODO: VertInf import — may cause circular dependency with vertices.js
// import { VertInf } from '../graph/vertices';
// TODO: vertexVisibility import — from visibility.js when ported
// import { vertexVisibility } from '../graph/visibility';

import type { ConnEnd } from './connend';

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

/** Minimal router interface — only what ShapeConnectionPin needs. */
export interface IRouter {
  m_allows_polyline_routing: boolean;
  vertices: { addVertex(v: IVertInf): void; removeVertex(v: IVertInf): void };
}

/**
 * Minimal obstacle interface for a ShapeRef.
 * Used by ShapeConnectionPin when attached to a shape.
 */
export interface IShape {
  id(): number;
  position(): Point;
  router(): IRouter;
  polygon(): Polygon;
  addConnectionPin(pin: ShapeConnectionPin): number;
  removeConnectionPin(pin: ShapeConnectionPin): void;
}

/**
 * Minimal obstacle interface for a JunctionRef.
 * Used by ShapeConnectionPin when attached to a junction.
 */
export interface IJunction {
  id(): number;
  position(): Point;
  router(): IRouter;
  addConnectionPin(pin: ShapeConnectionPin): number;
  removeConnectionPin(pin: ShapeConnectionPin): void;
}

/**
 * Sentinel value indicating no pin class has been set.
 */
export const CONNECTIONPIN_UNSET: number = 0x7FFFFFFF;        // INT_MAX

/**
 * Sentinel value for centre connection pin class.
 */
export const CONNECTIONPIN_CENTRE: number = 0x7FFFFFFF - 1;   // INT_MAX - 1

/**
 * Predefined attachment position constants for pin offsets.
 */
export const ATTACH_POS_MIN_OFFSET: number = 0;
export const ATTACH_POS_MAX_OFFSET: number = -1;

/** Constructor parameter shape for ShapeConnectionPin. */
interface ShapeConnectionPinParams {
  shape?: IShape | null;
  junction?: IJunction | null;
  classId: number;
  xOffset?: number;
  yOffset?: number;
  proportional?: boolean;
  insideOffset?: number;
  visDirs?: number;
}

/**
 * ShapeConnectionPin — represents a fixed point ("pin") on a shape or junction
 * that connectors can attach to.
 *
 * Pins have a position specified relative to their parent shape. When the shape
 * is moved or resized the pin moves automatically and attached connectors are
 * rerouted.
 */
export class ShapeConnectionPin {
  // -------------------------------------------------------------------------
  //  Fields
  // -------------------------------------------------------------------------

  m_router: IRouter | null;
  m_shape: IShape | null;
  m_junction: IJunction | null;
  m_class_id: number;
  m_x_offset: number;
  m_y_offset: number;
  m_inside_offset: number;
  m_visibility_directions: number;
  m_exclusive: boolean;
  m_connection_cost: number;
  m_connend_users: Set<ConnEnd>;
  m_vertex: IVertInf | null;
  m_using_proportional_offsets: boolean;

  // -------------------------------------------------------------------------
  //  Constructors
  // -------------------------------------------------------------------------

  constructor({
    shape = null,
    junction = null,
    classId,
    xOffset = 0,
    yOffset = 0,
    proportional = true,
    insideOffset = 0,
    visDirs = ConnDirNone,
  }: ShapeConnectionPinParams) {
    this.m_router = null;
    this.m_shape = shape;
    this.m_junction = junction;
    this.m_class_id = classId;
    this.m_x_offset = xOffset;
    this.m_y_offset = yOffset;
    this.m_inside_offset = insideOffset;
    this.m_visibility_directions = visDirs;
    this.m_exclusive = true;
    this.m_connection_cost = 0.0;
    this.m_connend_users = new Set<ConnEnd>();
    this.m_vertex = null;
    this.m_using_proportional_offsets = proportional;

    if (shape) {
      this._initForShape();
    } else if (junction) {
      this._initForJunction(visDirs);
    }
  }

  // -- Static factory helpers (mirror C++ overloaded constructors) -----------

  /**
   * Create a pin attached to a shape (proportional offsets).
   */
  static createForShape(
    shape: IShape,
    classId: number,
    xOffset: number,
    yOffset: number,
    proportional: boolean,
    insideOffset: number,
    visDirs: number = ConnDirNone,
  ): ShapeConnectionPin {
    return new ShapeConnectionPin({
      shape,
      classId,
      xOffset,
      yOffset,
      proportional,
      insideOffset,
      visDirs,
    });
  }

  /**
   * Create a pin attached to a shape (old constructor — always proportional).
   */
  static createForShapeLegacy(
    shape: IShape,
    classId: number,
    xOffset: number,
    yOffset: number,
    insideOffset: number,
    visDirs: number = ConnDirNone,
  ): ShapeConnectionPin {
    return new ShapeConnectionPin({
      shape,
      classId,
      xOffset,
      yOffset,
      proportional: true,
      insideOffset,
      visDirs,
    });
  }

  /**
   * Create a pin attached to a junction.
   */
  static createForJunction(
    junction: IJunction,
    classId: number,
    visDirs: number = ConnDirNone,
  ): ShapeConnectionPin {
    return new ShapeConnectionPin({
      junction,
      classId,
      xOffset: 0,
      yOffset: 0,
      proportional: false,
      insideOffset: 0,
      visDirs,
    });
  }

  // -------------------------------------------------------------------------
  //  Private initialisation helpers
  // -------------------------------------------------------------------------

  /** @private */
  private _initForShape(): void {
    console.assert(this.m_shape !== null, 'ShapeConnectionPin: shape must not be null');
    console.assert(this.m_class_id > 0, 'ShapeConnectionPin: classId must be > 0');

    if (this.m_using_proportional_offsets) {
      if (this.m_x_offset < 0 || this.m_x_offset > 1) {
        console.warn(
          `ShapeConnectionPin: xPortionOffset (${this.m_x_offset}) not between 0 and 1.`
        );
      }
      if (this.m_y_offset < 0 || this.m_y_offset > 1) {
        console.warn(
          `ShapeConnectionPin: yPortionOffset (${this.m_y_offset}) not between 0 and 1.`
        );
      }
    } else {
      const shapeBox = this.m_shape!.polygon().offsetBoundingBox(0.0);
      if (this.m_x_offset > shapeBox.width()) {
        console.warn(
          `ShapeConnectionPin: xOffset (${this.m_x_offset}) > shape width (${shapeBox.width()}).`
        );
      }
      if (this.m_y_offset > shapeBox.height()) {
        console.warn(
          `ShapeConnectionPin: yOffset (${this.m_y_offset}) > shape height (${shapeBox.height()}).`
        );
      }
    }

    this.m_router = this.m_shape!.router();
    this.m_shape!.addConnectionPin(this);

    // Create a visibility vertex for this pin.
    // TODO: Uncomment when VertInf is ported.
    // const id = new VertID(this.m_shape.id(), kShapeConnectionPin,
    //     PROP_ConnPoint | PROP_ConnectionPin);
    // this.m_vertex = new VertInf(this.m_router, id, this.position());
    // this.m_vertex.visDirections = this.directions();

    if (this.m_vertex && this.m_vertex.visDirections === ConnDirAll) {
      // A pin with visibility in all directions is non-exclusive by default.
      this.m_exclusive = false;
    }

    // TODO: polyline visibility
    // if (this.m_router.m_allows_polyline_routing) {
    //     vertexVisibility(this.m_vertex, null, true, true);
    // }
  }

  /** @private */
  private _initForJunction(visDirs: number): void {
    console.assert(this.m_junction !== null, 'ShapeConnectionPin: junction must not be null');

    this.m_router = this.m_junction!.router();
    this.m_junction!.addConnectionPin(this);

    // Create a visibility vertex for this pin.
    // TODO: Uncomment when VertInf is ported.
    // const id = new VertID(this.m_junction.id(), kShapeConnectionPin,
    //     PROP_ConnPoint | PROP_ConnectionPin);
    // this.m_vertex = new VertInf(this.m_router, id, this.m_junction.position());
    // this.m_vertex.visDirections = visDirs;

    // TODO: polyline visibility
    // if (this.m_router.m_allows_polyline_routing) {
    //     vertexVisibility(this.m_vertex, null, true, true);
    // }
  }

  // -------------------------------------------------------------------------
  //  Destructor equivalent
  // -------------------------------------------------------------------------

  destroy(): void {
    console.assert(!!(this.m_shape || this.m_junction),
      'ShapeConnectionPin.destroy: must belong to shape or junction');

    if (this.m_shape) {
      this.m_shape.removeConnectionPin(this);
    } else if (this.m_junction) {
      this.m_junction.removeConnectionPin(this);
    }

    // Disconnect all connends using this pin.
    for (const connend of this.m_connend_users) {
      connend.freeActivePin();
    }
    this.m_connend_users.clear();

    if (this.m_vertex) {
      this.m_vertex.removeFromGraph();
      this.m_router!.vertices.removeVertex(this.m_vertex);
      this.m_vertex = null;
    }
  }

  // -------------------------------------------------------------------------
  //  Public API
  // -------------------------------------------------------------------------

  /**
   * Returns the position of this connection pin, optionally relative to a new
   * polygon (used during move/resize before the shape polygon is updated).
   */
  position(newPoly: Polygon | null = null): Point {
    if (this.m_junction) {
      return this.m_junction.position();
    }

    const poly: Polygon = (!newPoly || newPoly.empty())
      ? this.m_shape!.polygon()
      : newPoly;
    const shapeBox = poly.offsetBoundingBox(0.0);

    const point = new Point();

    if (this.m_using_proportional_offsets) {
      // Proportional offsets --------------------------------------------------
      if (this.m_x_offset === ATTACH_POS_LEFT) {
        point.x = shapeBox.min.x + this.m_inside_offset;
        point.vn = 6;
      } else if (this.m_x_offset === ATTACH_POS_RIGHT) {
        point.x = shapeBox.max.x - this.m_inside_offset;
        point.vn = 4;
      } else {
        point.x = shapeBox.min.x + (this.m_x_offset * shapeBox.width());
      }

      if (this.m_y_offset === ATTACH_POS_TOP) {
        point.y = shapeBox.min.y + this.m_inside_offset;
        point.vn = 5;
      } else if (this.m_y_offset === ATTACH_POS_BOTTOM) {
        point.y = shapeBox.max.y - this.m_inside_offset;
        point.vn = 7;
      } else {
        point.y = shapeBox.min.y + (this.m_y_offset * shapeBox.height());
      }
    } else {
      // Absolute offsets ------------------------------------------------------
      if (this.m_x_offset === ATTACH_POS_MIN_OFFSET) {
        point.x = shapeBox.min.x + this.m_inside_offset;
        point.vn = 6;
      } else if (
        this.m_x_offset === ATTACH_POS_MAX_OFFSET ||
        this.m_x_offset === shapeBox.width()
      ) {
        point.x = shapeBox.max.x - this.m_inside_offset;
        point.vn = 4;
      } else {
        point.x = shapeBox.min.x + this.m_x_offset;
      }

      if (this.m_y_offset === ATTACH_POS_MIN_OFFSET) {
        point.y = shapeBox.min.y + this.m_inside_offset;
        point.vn = 5;
      } else if (
        this.m_y_offset === ATTACH_POS_MAX_OFFSET ||
        this.m_y_offset === shapeBox.height()
      ) {
        point.y = shapeBox.max.y - this.m_inside_offset;
        point.vn = 7;
      } else {
        point.y = shapeBox.min.y + this.m_y_offset;
      }
    }

    return point;
  }

  /**
   * Returns the visibility direction flags for this pin.
   * If none were explicitly set, defaults are derived from the offset position.
   */
  directions(): number {
    let visDir: number = this.m_visibility_directions;
    if (this.m_visibility_directions === ConnDirNone) {
      if (this.m_x_offset === ATTACH_POS_LEFT) {
        visDir |= ConnDirLeft;
      } else if (this.m_x_offset === ATTACH_POS_RIGHT) {
        visDir |= ConnDirRight;
      }

      if (this.m_y_offset === ATTACH_POS_TOP) {
        visDir |= ConnDirUp;
      } else if (this.m_y_offset === ATTACH_POS_BOTTOM) {
        visDir |= ConnDirDown;
      }

      if (visDir === ConnDirNone) {
        visDir = ConnDirAll;
      }
    }
    return visDir;
  }

  /**
   * Sets a routing cost applied when choosing this pin.
   */
  setConnectionCost(cost: number): void {
    console.assert(cost >= 0, 'ShapeConnectionPin.setConnectionCost: cost must be >= 0');
    this.m_connection_cost = cost;
  }

  /**
   * Returns whether this pin is exclusive (only one connector can attach).
   */
  isExclusive(): boolean {
    return this.m_exclusive;
  }

  /**
   * Sets whether the pin is exclusive.
   */
  setExclusive(exclusive: boolean): void {
    this.m_exclusive = exclusive;
  }

  // -------------------------------------------------------------------------
  //  Position / visibility updates (called by shape move/resize)
  // -------------------------------------------------------------------------

  /**
   * Update the vertex position to match a given point.
   */
  updatePosition(newPositionOrPoly: Point | Polygon): void {
    if (this.m_vertex) {
      if (newPositionOrPoly instanceof Polygon) {
        this.m_vertex.Reset(this.position(newPositionOrPoly));
      } else {
        // Point
        this.m_vertex.Reset(newPositionOrPoly);
      }
    }
  }

  /**
   * Recompute position and visibility directions, then rebuild visibility.
   */
  updatePositionAndVisibility(): void {
    if (this.m_vertex) {
      this.m_vertex.Reset(this.position());
      this.m_vertex.visDirections = this.directions();
    }
    this.updateVisibility();
  }

  /**
   * Remove existing visibility edges and rebuild polyline visibility.
   */
  updateVisibility(): void {
    if (this.m_vertex) {
      this.m_vertex.removeFromGraph();
    }
    // TODO: polyline visibility
    // if (this.m_router.m_allows_polyline_routing) {
    //     vertexVisibility(this.m_vertex, null, true, true);
    // }
  }

  // -------------------------------------------------------------------------
  //  Identity / comparison helpers
  // -------------------------------------------------------------------------

  /**
   * Returns [containingObjectId, classId] pair.
   */
  ids(): [number, number] {
    return [this.containingObjectId(), this.m_class_id];
  }

  /**
   * Returns the id of the parent shape or junction.
   */
  containingObjectId(): number {
    console.assert(!!(this.m_shape || this.m_junction),
      'ShapeConnectionPin.containingObjectId: must belong to shape or junction');
    return this.m_shape ? this.m_shape.id() : this.m_junction!.id();
  }

  /**
   * Structural equality check (same parent, class, offsets, directions).
   */
  equals(rhs: ShapeConnectionPin): boolean {
    if (this.containingObjectId() !== rhs.containingObjectId()) return false;
    if (this.m_class_id !== rhs.m_class_id) return false;
    if (this.m_visibility_directions !== rhs.m_visibility_directions) return false;
    if (this.m_x_offset !== rhs.m_x_offset) return false;
    if (this.m_y_offset !== rhs.m_y_offset) return false;
    if (this.m_inside_offset !== rhs.m_inside_offset) return false;
    return true;
  }

  /**
   * Ordering comparison (for sorted set semantics).
   */
  lessThan(rhs: ShapeConnectionPin): boolean {
    if (this.containingObjectId() !== rhs.containingObjectId()) {
      return this.containingObjectId() < rhs.containingObjectId();
    }
    if (this.m_class_id !== rhs.m_class_id) {
      return this.m_class_id < rhs.m_class_id;
    }
    if (this.m_visibility_directions !== rhs.m_visibility_directions) {
      return this.m_visibility_directions < rhs.m_visibility_directions;
    }
    if (this.m_x_offset !== rhs.m_x_offset) {
      return this.m_x_offset < rhs.m_x_offset;
    }
    if (this.m_y_offset !== rhs.m_y_offset) {
      return this.m_y_offset < rhs.m_y_offset;
    }
    if (this.m_inside_offset !== rhs.m_inside_offset) {
      return this.m_inside_offset < rhs.m_inside_offset;
    }
    return false;
  }
}

/**
 * Comparator function for sorting ShapeConnectionPin pointers (references).
 * Use with Array.prototype.sort:  pins.sort(cmpConnPinPtr)
 */
export function cmpConnPinPtr(a: ShapeConnectionPin, b: ShapeConnectionPin): number {
  if (a.lessThan(b)) return -1;
  if (b.lessThan(a)) return 1;
  return 0;
}
