/*
 * libavoid-js - Port of libavoid shape
 * Original: Copyright (C) 2004-2013 Monash University
 * Author: Michael Wybrow
 *
 * The ShapeRef class represents a shape object (an obstacle that connectors
 * must be routed around). Extends Obstacle.
 */

import {
  XDIM,
  YDIM,
  ConnDirNone,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  ConnDirAll,
  TransformationType_CW90,
  TransformationType_CW180,
  TransformationType_CW270,
  TransformationType_FlipX,
  TransformationType_FlipY,
} from '../core/constants';
import { Point, Box, Polygon } from '../core/geomtypes';
import { Obstacle, VertInf, IRouter, ShapeConnectionPin } from './obstacle';

// TODO: Import from './connectionpin' once ported.
// import { ShapeConnectionPin } from './connectionpin';

// Connection pin attachment position constants (from connectionpin.h)
const ATTACH_POS_MIN_OFFSET: number = 0;
const ATTACH_POS_MAX_OFFSET: number = -1;

/**
 * ShapeTransformationType enum values are imported from constants.js:
 *   TransformationType_CW90   = 0  (rotated clockwise 90 degrees)
 *   TransformationType_CW180  = 1  (rotated clockwise 180 degrees)
 *   TransformationType_CW270  = 2  (rotated clockwise 270 degrees)
 *   TransformationType_FlipX  = 3  (flipped horizontally)
 *   TransformationType_FlipY  = 4  (flipped vertically)
 */

/**
 * Helper: compute the inverse of an absolute offset for shape transformation.
 * @param offset - The offset value.
 * @param shapeBox - The shape's bounding box.
 * @param toDim - The dimension (XDIM or YDIM).
 * @returns The inverse offset.
 */
function absoluteOffsetInverse(offset: number, shapeBox: Box, toDim: number): number {
  if (offset === ATTACH_POS_MIN_OFFSET) {
    return ATTACH_POS_MAX_OFFSET;
  }

  if (offset === ATTACH_POS_MAX_OFFSET) {
    return ATTACH_POS_MIN_OFFSET;
  }

  return shapeBox.length(toDim) - offset;
}

/**
 * ShapeRef - Represents a shape obstacle.
 *
 * Shapes are obstacles that connectors must be routed around. They can be
 * placed into a Router scene and can be repositioned or resized (via
 * Router.moveShape()).
 *
 * Usually, it is expected that you would create a ShapeRef for each shape
 * in your diagram and keep that reference in your own shape class.
 */
export class ShapeRef extends Obstacle {
  /**
   * @param router - The router scene to place the shape into.
   * @param poly - A Polygon representing the boundary of the shape.
   * @param id - Optionally, a positive integer ID unique among all objects.
   */
  constructor(router: IRouter, poly: Polygon, id: number = 0) {
    super(router, poly, id);
    this.m_router.addShape(this);
  }

  /**
   * Destructor equivalent.
   * Do not call this directly - call Router.deleteShape() instead.
   */
  destroy(): void {
    if (this.m_router.m_currently_calling_destructors === false) {
      console.error(
        "ERROR: ShapeRef.destroy() shouldn't be called directly.\n" +
        "       It is owned by the router. Call Router.deleteShape() instead."
      );
      throw new Error('ShapeRef.destroy() called directly');
    }
    super.destroy();
  }

  /**
   * Move attached connectors when the shape polygon changes.
   * @param newPoly - The new polygon boundary.
   */
  moveAttachedConns(newPoly: Polygon): void {
    // Update positions of attached connector ends.
    for (const connEnd of this.m_following_conns) {
      console.assert(connEnd.m_conn_ref !== null,
        'ShapeRef.moveAttachedConns: connEnd must have a conn_ref');
      const connPinUpdate: boolean = true;
      this.m_router.modifyConnector(
        connEnd.m_conn_ref,
        connEnd.endpointType(),
        connEnd,
        connPinUpdate
      );
    }

    // Update pin positions for the new polygon.
    for (const pin of this.m_connection_pins) {
      pin.updatePosition(newPoly);
    }
  }

  /**
   * Adjusts all of the shape's connection pin positions and visibility
   * directions for a given transformation type.
   *
   * @param transform - A ShapeTransformationType value specifying
   *   the type of transform to be applied to all connection pins for the shape.
   */
  transformConnectionPinPositions(transform: number): void {
    for (const pin of this.m_connection_pins) {
      const usingProportionalOffsets: boolean = pin.m_using_proportional_offsets;
      // We modify these in place on the pin object (like C++ references)
      let xOffset: number = pin.m_x_offset;
      let yOffset: number = pin.m_y_offset;
      let visDirs: number = pin.m_visibility_directions;
      let tmpOffset: number;

      // Number of clockwise 90 degree rotations
      let rotationN: number = 0;

      if (usingProportionalOffsets) {
        // Translate to Origin.
        xOffset -= 0.5;
        yOffset -= 0.5;

        switch (transform) {
          case TransformationType_CW90:
            rotationN = 3;
            // Y <- inverse X, X <- inverse Y
            tmpOffset = yOffset;
            yOffset = xOffset;
            xOffset = -tmpOffset;
            break;
          case TransformationType_CW180:
            rotationN = 2;
            // Y <- inverse Y, X <- inverse X
            yOffset = -yOffset;
            xOffset = -xOffset;
            break;
          case TransformationType_CW270:
            rotationN = 1;
            // Y <- X, X <- Y
            tmpOffset = yOffset;
            yOffset = -xOffset;
            xOffset = tmpOffset;
            break;
          case TransformationType_FlipX:
            // Y <- Y, X <- inverse X
            xOffset = -xOffset;
            break;
          case TransformationType_FlipY:
            // X <- inverse X, Y <- Y
            yOffset = -yOffset;
            break;
        }
        // Translate back.
        xOffset += 0.5;
        yOffset += 0.5;
      } else {
        // Using absolute offsets for pin.
        const shapeBox: Box = pin.m_shape.polygon().offsetBoundingBox(0.0);

        switch (transform) {
          case TransformationType_CW90:
            rotationN = 3;
            // Y <- inverse X, X <- inverse Y
            tmpOffset = yOffset;
            yOffset = xOffset;
            xOffset = absoluteOffsetInverse(tmpOffset, shapeBox, XDIM);
            break;
          case TransformationType_CW180:
            rotationN = 2;
            // Y <- inverse Y, X <- inverse X
            yOffset = absoluteOffsetInverse(yOffset, shapeBox, YDIM);
            xOffset = absoluteOffsetInverse(xOffset, shapeBox, XDIM);
            break;
          case TransformationType_CW270:
            rotationN = 1;
            // Y <- X, X <- Y
            tmpOffset = yOffset;
            yOffset = absoluteOffsetInverse(xOffset, shapeBox, YDIM);
            xOffset = tmpOffset;
            break;
          case TransformationType_FlipX:
            // Y <- Y, X <- inverse X
            xOffset = absoluteOffsetInverse(xOffset, shapeBox, XDIM);
            break;
          case TransformationType_FlipY:
            // X <- inverse X, Y <- Y
            yOffset = absoluteOffsetInverse(yOffset, shapeBox, YDIM);
            break;
        }
      }

      // Write back modified offsets to the pin
      pin.m_x_offset = xOffset;
      pin.m_y_offset = yOffset;

      // Transform visibility directions
      if ((visDirs & ConnDirAll) && (visDirs !== ConnDirAll)) {
        // Visibility is set, but not in all directions.
        const dirU: number = 0;
        const dirR: number = 1;
        const dirD: number = 2;
        const dirL: number = 3;

        const visInDir: boolean[] = [false, false, false, false];
        if (visDirs & ConnDirUp)    visInDir[dirU] = true;
        if (visDirs & ConnDirRight) visInDir[dirR] = true;
        if (visDirs & ConnDirDown)  visInDir[dirD] = true;
        if (visDirs & ConnDirLeft)  visInDir[dirL] = true;

        if (transform === TransformationType_FlipY) {
          const tmpBool: boolean = visInDir[dirU];
          visInDir[dirU] = visInDir[dirD];
          visInDir[dirD] = tmpBool;
        } else if (transform === TransformationType_FlipX) {
          const tmpBool: boolean = visInDir[dirL];
          visInDir[dirL] = visInDir[dirR];
          visInDir[dirR] = tmpBool;
        }

        visDirs = ConnDirNone;
        if (visInDir[(rotationN + dirU) % 4]) visDirs |= ConnDirUp;
        if (visInDir[(rotationN + dirR) % 4]) visDirs |= ConnDirRight;
        if (visInDir[(rotationN + dirD) % 4]) visDirs |= ConnDirDown;
        if (visInDir[(rotationN + dirL) % 4]) visDirs |= ConnDirLeft;
      }

      // Write back modified visibility directions to the pin
      pin.m_visibility_directions = visDirs;

      pin.updatePositionAndVisibility();
      this.m_router.modifyConnectionPin(pin);
    }
  }

  /**
   * Returns a reference to the polygon boundary of this shape.
   */
  polygon(): Polygon {
    return this.m_polygon;
  }

  /**
   * Output code representation for debugging.
   */
  outputCode(): string {
    const lines: string[] = [];
    lines.push(`    // shapeRef${this.id()}`);
    lines.push(`    polygon = Polygon(${this.polygon().size()});`);
    for (let i = 0; i < this.polygon().size(); i++) {
      lines.push(`    polygon.ps[${i}] = Point(${this.polygon().at(i).x}, ${this.polygon().at(i).y});`);
    }

    let prefix: string = '    ';
    if (this.m_connection_pins.size > 0) {
      prefix += `ShapeRef shapeRef${this.id()} = `;
    }
    lines.push(`${prefix}new ShapeRef(router, polygon, ${this.id()});`);

    for (const pin of this.m_connection_pins) {
      if (typeof pin.outputCode === 'function') {
        lines.push(pin.outputCode());
      }
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Returns the position of this shape (centre of its routing bounding box).
   */
  position(): Point {
    const bBox: Box = this.routingBox();
    const centre: Point = new Point();
    centre.x = bBox.min.x + (0.5 * (bBox.max.x - bBox.min.x));
    centre.y = bBox.min.y + (0.5 * (bBox.max.y - bBox.min.y));
    return centre;
  }

  /**
   * Set the centre position of this shape, translating the polygon.
   * @param newCentre - The new centre position.
   */
  setCentrePos(newCentre: Point): void {
    const diff: Point = newCentre.sub(this.position());
    this.m_polygon.translate(diff.x, diff.y);
  }

  /**
   * Assign pin visibility to a dummy connection vertex for a given pin class.
   * Overrides the base Obstacle method.
   */
  assignPinVisibilityTo(pinClassId: number, dummyConnectionVert: VertInf): void {
    for (const pin of this.m_connection_pins) {
      if (pin.m_class_id === pinClassId) {
        pin.assignVisibilityTo(dummyConnectionVert);
      }
    }
  }
}
