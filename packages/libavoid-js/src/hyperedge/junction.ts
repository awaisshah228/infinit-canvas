/*
 * libavoid-js - JavaScript port of libavoid
 * Original C++ library: Copyright (C) 2010-2015 Monash University
 * Original author: Michael Wybrow
 *
 * Port of junction.h / junction.cpp
 * The JunctionRef class represents a fixed or free-floating point
 * that connectors can be attached to.
 */

import {
  XDIM,
  YDIM,
  idealNudgingDistance,
  ConnDirAll,
  ConnDirLeft,
  ConnDirRight,
  ConnDirUp,
  ConnDirDown,
} from '../core/constants';
import { Point, Rectangle } from '../core/geomtypes';
import { Obstacle } from '../obstacles/obstacle';

// Use `any` for these types to avoid circular dependency
type Router = any;
type ConnEnd = any;
type ConnRef = any;
type ShapeConnectionPin = any;
type IRouter = any;

/**
 * JunctionRef - Represents a junction between multiple connectors, or an
 * intermediate point that a single connector must route through.
 *
 * Extends Obstacle so that connectors route around it.
 */
export class JunctionRef extends Obstacle {
  public m_position: Point;
  public m_recommended_position: Point;
  public m_position_fixed: boolean;

  constructor(router: Router, position: Point, id: number = 0) {
    super(router, JunctionRef.makeRectangle(router, position), id);

    this.m_position = position.clone ? position.clone() : new Point(position.x, position.y);
    this.m_recommended_position = this.m_position.clone
      ? this.m_position.clone()
      : new Point(this.m_position.x, this.m_position.y);
    this.m_position_fixed = false;

    // For Junctions we use a single non-exclusive pin.
    // The ShapeConnectionPin and CONNECTIONPIN_CENTRE are expected to
    // be available from connectionpin.js.  We defer this setup so that
    // it can be wired externally when the full connectionpin module is
    // available.
    if (typeof router._createJunctionPin === 'function') {
      router._createJunctionPin(this);
    }

    this.m_router.addJunction(this);
  }

  // ---- static helper ----

  /**
   * Creates a tiny rectangle centred on `position`, used as the obstacle
   * polygon for the junction.
   */
  static makeRectangle(router: Router, position: Point): Rectangle {
    console.assert(router, 'JunctionRef.makeRectangle: router must not be null');

    let nudgeDist: number = router.routingParameter
      ? router.routingParameter(idealNudgingDistance)
      : 1.0;
    nudgeDist = Math.min(1.0, nudgeDist);

    const low: Point = new Point(position.x - nudgeDist, position.y - nudgeDist);
    const high: Point = new Point(position.x + nudgeDist, position.y + nudgeDist);

    return new Rectangle(low, high);
  }

  // ---- public API ----

  /**
   * Returns the position of this junction.
   */
  position(): Point {
    return this.m_position;
  }

  /**
   * Sets whether the junction has a fixed position and therefore cannot be
   * moved by the Router during routing.
   */
  setPositionFixed(fixed: boolean): void {
    this.m_position_fixed = fixed;
    if (this.m_router.registerSettingsChange) {
      this.m_router.registerSettingsChange();
    }
  }

  /**
   * Returns whether this junction has a fixed position.
   */
  positionFixed(): boolean {
    return this.m_position_fixed;
  }

  /**
   * Sets a preference for connectors to leave this junction in a given
   * orthogonal dimension by adding a small penalty to the perpendicular
   * directions.
   */
  preferOrthogonalDimension(dim: number): void {
    const smallPenalty: number = 1.0;
    for (const pin of this.m_connection_pins) {
      if (dim === YDIM) {
        if (pin.directions() & (ConnDirLeft | ConnDirRight)) {
          pin.setConnectionCost(smallPenalty);
        }
      } else if (dim === XDIM) {
        if (pin.directions() & (ConnDirUp | ConnDirDown)) {
          pin.setConnectionCost(smallPenalty);
        }
      }
    }
  }

  /**
   * Returns a recommended position for the junction based on improving
   * hyperedge routes.
   */
  recommendedPosition(): Point {
    return this.m_recommended_position;
  }

  // ---- private / friend methods ----

  /**
   * Sets the position of the junction, updating the polygon and routing info.
   */
  setPosition(position: Point): void {
    this.m_position = position.clone ? position.clone() : new Point(position.x, position.y);
    this.m_recommended_position = this.m_position.clone
      ? this.m_position.clone()
      : new Point(this.m_position.x, this.m_position.y);
    this.m_polygon = JunctionRef.makeRectangle(this.m_router, this.m_position);
    if (this.setNewPoly) {
      this.setNewPoly(this.m_polygon);
    }
  }

  /**
   * Sets the recommended position without changing the actual position.
   */
  setRecommendedPosition(position: Point): void {
    this.m_recommended_position = position.clone
      ? position.clone()
      : new Point(position.x, position.y);
  }

  /**
   * Updates positions of attached connector ends and connection pins.
   */
  moveAttachedConns(newPosition: Point): void {
    // Update positions of attached connector ends.
    for (const connEnd of this.m_following_conns) {
      console.assert(connEnd.m_conn_ref !== null && connEnd.m_conn_ref !== undefined);
      if (this.m_router.modifyConnector) {
        this.m_router.modifyConnector(
          connEnd.m_conn_ref,
          connEnd.endpointType(),
          connEnd
        );
      }
    }
    for (const pin of this.m_connection_pins) {
      if (pin.updatePosition) {
        pin.updatePosition(newPosition);
      }
    }
  }

  /**
   * Removes a junction that has only two connectors attached to it and
   * merges them into a single connector.
   *
   * @returns The merged connector, or null if the junction was not removed.
   */
  removeJunctionAndMergeConnectors(): ConnRef | null {
    if (this.m_following_conns.size !== 2) {
      return null;
    }

    const iter: IterableIterator<ConnEnd> = this.m_following_conns.values();
    const connEnd1: ConnEnd = iter.next().value;
    const connEnd2: ConnEnd = iter.next().value;
    console.assert(connEnd2.m_conn_ref != null);
    console.assert(connEnd1.m_conn_ref != null);

    // The second conn will be the one we will delete.
    const conn2: ConnRef = connEnd2.m_conn_ref;
    // Determine its endpoint that is not attached to the junction.
    const connEnd2Other: ConnEnd | null =
      conn2.m_src_connend === connEnd2
        ? conn2.m_dst_connend
        : conn2.m_src_connend;
    if (connEnd2Other == null) {
      // If it doesn't have a valid other endpoint, then ignore.
      return null;
    }

    // Modify the first connector's junction endpoint to connect to the
    // other end of the second connector.
    if (this.m_router.modifyConnector) {
      this.m_router.modifyConnector(
        connEnd1.m_conn_ref,
        connEnd1.endpointType(),
        connEnd2Other
      );
    }

    // Delete the second connector.
    if (this.m_router.deleteConnector) {
      this.m_router.deleteConnector(conn2);
    }

    // Remove the junction from the router scene.
    if (this.m_router.deleteJunction) {
      this.m_router.deleteJunction(this);
    }

    // Return the first (i.e. merged) connector.
    return connEnd1.m_conn_ref;
  }

  /**
   * Debug output (no-op in JS -- the C++ version writes to a FILE*).
   */
  outputCode(): string {
    // Intentionally empty; debug output is not ported.
    return '';
  }
}
