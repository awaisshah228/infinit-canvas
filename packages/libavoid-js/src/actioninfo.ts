/*
 * libavoid-js - JavaScript port of libavoid actioninfo
 * Original C++ library: Copyright (C) 2004-2011 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import {
  ShapeMove,
  ShapeAdd,
  ShapeRemove,
  JunctionMove,
  JunctionAdd,
  JunctionRemove,
  ConnChange,
  ConnectionPinChange,
} from './core/constants';

import { Polygon, Point } from './core/geomtypes';

// ---------------------------------------------------------------------------
// Types used by ActionInfo
// ---------------------------------------------------------------------------

import type { Obstacle } from './obstacles/obstacle';
import type { ShapeRef } from './obstacles/shape';
import type { JunctionRef } from './hyperedge/junction';
import type { ConnRef } from './connectors/connector';
import type { ConnEnd } from './connectors/connend';
import type { ShapeConnectionPin } from './connectors/connectionpin';

/** The type of action queued in a router transaction. */
export type ActionType = number;

/** An object that can be referenced by an ActionInfo entry. */
export type ActionObject = Obstacle | ShapeRef | JunctionRef | ConnRef | ShapeConnectionPin;

/** A queued connector-end update. */
export interface ConnEndUpdate {
  type: number;
  connEnd: ConnEnd;
}

/**
 * ActionInfo -- tracks actions performed on objects during router transactions.
 *
 * This class is not intended for public use.  It is used internally by Router
 * to queue shape/junction/connector changes and process them efficiently.
 *
 * In the C++ code there are multiple overloaded constructors.  In JavaScript
 * we use a single constructor with an options-style second parameter, and
 * provide static factory helpers that mirror the C++ overloads.
 */
export class ActionInfo {
  public type: ActionType;
  public objPtr: ActionObject;
  public newPoly: Polygon;
  public newPosition: Point;
  public firstMove: boolean;
  public conns: ConnEndUpdate[];

  /**
   * Generic constructor.
   *
   * @param type        One of the ActionType constants.
   * @param objPtr      The shape / junction / connector / pin reference.
   * @param newPoly     New polygon (ShapeMove).
   * @param newPosition New position (JunctionMove).
   * @param firstMove   First-move flag (ShapeMove).
   */
  constructor(
    type: ActionType,
    objPtr: ActionObject,
    newPoly?: Polygon,
    newPosition?: Point,
    firstMove?: boolean,
  ) {
    this.type = type;
    this.objPtr = objPtr;
    this.newPoly = newPoly || new Polygon();
    this.newPosition = newPosition || new Point();
    this.firstMove = firstMove || false;
    // ConnUpdateList -- array of { type: number, connEnd: ConnEnd }
    this.conns = [];
  }

  // ------------------------------------------------------------------
  // Static factory methods mirroring the C++ overloaded constructors
  // ------------------------------------------------------------------

  /**
   * ShapeMove constructor equivalent.
   * @param t   ActionType (should be ShapeMove)
   * @param s   ShapeRef
   * @param p   New polygon
   * @param fM  First-move flag
   */
  static forShapeMove(t: ActionType, s: ShapeRef, p: Polygon, fM: boolean): ActionInfo {
    console.assert(t === ShapeMove, 'ActionInfo.forShapeMove: expected ShapeMove');
    return new ActionInfo(t, s, p, undefined, fM);
  }

  /**
   * ShapeAdd / ShapeRemove / ShapeMove (without poly) constructor equivalent.
   * @param t  ActionType
   * @param s  ShapeRef
   */
  static forShape(t: ActionType, s: ShapeRef): ActionInfo {
    console.assert(
      t === ShapeAdd || t === ShapeRemove || t === ShapeMove,
      'ActionInfo.forShape: unexpected type'
    );
    return new ActionInfo(t, s);
  }

  /**
   * JunctionMove constructor equivalent.
   * @param t  ActionType (should be JunctionMove)
   * @param j  JunctionRef
   * @param p  New position
   */
  static forJunctionMove(t: ActionType, j: JunctionRef, p: Point): ActionInfo {
    console.assert(t === JunctionMove, 'ActionInfo.forJunctionMove: expected JunctionMove');
    return new ActionInfo(t, j, undefined, p);
  }

  /**
   * JunctionAdd / JunctionRemove / JunctionMove (without position) constructor equivalent.
   * @param t  ActionType
   * @param j  JunctionRef
   */
  static forJunction(t: ActionType, j: JunctionRef): ActionInfo {
    console.assert(
      t === JunctionAdd || t === JunctionRemove || t === JunctionMove,
      'ActionInfo.forJunction: unexpected type'
    );
    return new ActionInfo(t, j);
  }

  /**
   * ConnChange constructor equivalent.
   * @param t  ActionType (should be ConnChange)
   * @param c  ConnRef
   */
  static forConn(t: ActionType, c: ConnRef): ActionInfo {
    console.assert(t === ConnChange, 'ActionInfo.forConn: expected ConnChange');
    return new ActionInfo(t, c);
  }

  /**
   * ConnectionPinChange constructor equivalent.
   * @param t  ActionType (should be ConnectionPinChange)
   * @param p  ShapeConnectionPin
   */
  static forConnectionPin(t: ActionType, p: ShapeConnectionPin): ActionInfo {
    console.assert(t === ConnectionPinChange, 'ActionInfo.forConnectionPin: expected ConnectionPinChange');
    return new ActionInfo(t, p);
  }

  // ------------------------------------------------------------------
  // Accessors
  // ------------------------------------------------------------------

  /**
   * Returns the obstacle pointer (valid for shape / junction action types).
   * In JS the objPtr is already the obstacle reference.
   */
  obstacle(): Obstacle {
    console.assert(
      this.type === ShapeMove || this.type === ShapeAdd ||
      this.type === ShapeRemove || this.type === JunctionMove ||
      this.type === JunctionAdd || this.type === JunctionRemove,
      'ActionInfo.obstacle: invalid type'
    );
    return this.objPtr as Obstacle;
  }

  /**
   * Returns the ShapeRef, or null if the obstacle is not a ShapeRef.
   * In the C++ code this uses dynamic_cast. In JS we check for the
   * presence of the _isShape flag or similar marker set by ShapeRef.
   */
  shape(): ShapeRef | null {
    const obs = this.obstacle() as ShapeRef & { _isShape?: boolean };
    // ShapeRef instances are expected to have _isShape === true
    if (obs && obs._isShape) {
      return obs;
    }
    return null;
  }

  /**
   * Returns the ConnRef for ConnChange actions.
   */
  conn(): ConnRef {
    console.assert(this.type === ConnChange, 'ActionInfo.conn: expected ConnChange');
    return this.objPtr as ConnRef;
  }

  /**
   * Returns the JunctionRef, or null if the obstacle is not a JunctionRef.
   */
  junction(): JunctionRef | null {
    const obs = this.obstacle() as unknown as JunctionRef & { _isJunction?: boolean };
    // JunctionRef instances are expected to have _isJunction === true
    if (obs && obs._isJunction) {
      return obs;
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Conn-end update management
  // ------------------------------------------------------------------

  /**
   * Queue a ConnEnd update for this action.
   *
   * If an update for the same endpoint type already exists:
   *   - If this is a pin-move update (from shape movement), the existing
   *     user-created update takes priority and is kept.
   *   - Otherwise the existing update is overwritten.
   *
   * @param type               Endpoint type identifier.
   * @param connEnd            ConnEnd instance.
   * @param isConnPinMoveUpdate Whether this update comes from a
   *                            shape/pin movement rather than a user action.
   */
  addConnEndUpdate(type: number, connEnd: ConnEnd, isConnPinMoveUpdate: boolean): void {
    let alreadyExists = false;
    for (let i = 0; i < this.conns.length; i++) {
      if (this.conns[i].type === type) {
        alreadyExists = true;
        if (!isConnPinMoveUpdate) {
          // Overwrite the queued change with this one.
          this.conns[i].connEnd = connEnd;
        }
        break;
      }
    }

    if (!alreadyExists) {
      this.conns.push({ type, connEnd });
    }
  }

  // ------------------------------------------------------------------
  // Comparison operators (used for list deduplication and sorting)
  // ------------------------------------------------------------------

  /**
   * Equality -- two ActionInfo objects are equal if they have the same type
   * and refer to the same object.
   */
  equals(rhs: ActionInfo): boolean {
    return this.type === rhs.type && this.objPtr === rhs.objPtr;
  }

  /**
   * Less-than -- used for sorting the action list.  Actions are sorted by
   * type first, then by the id of the referenced object.
   */
  lessThan(rhs: ActionInfo): boolean {
    if (this.type !== rhs.type) {
      return this.type < rhs.type;
    }

    if (this.type === ConnChange) {
      return this.conn().id() < rhs.conn().id();
    } else if (this.type === ConnectionPinChange) {
      // Pointer comparison -- in JS we fall back to an arbitrary but
      // consistent ordering.  Since the order of ConnectionPins is not
      // significant this is acceptable.
      return false;
    } else {
      return this.obstacle().id() < rhs.obstacle().id();
    }
  }
}
