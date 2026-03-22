/*
 * libavoid-js - Port of libavoid geomtypes
 * Original: Copyright (C) 2004-2014 Monash University
 * Author: Michael Wybrow
 */

import { XDIM, YDIM, kUnassignedVertexNumber } from './constants';

/** Interface for objects that behave like a polygon (used for fromPolygonInterface). */
export interface PolygonInterface {
  id(): number;
  size(): number;
  at(index: number): Point;
}

export class Point {
  public x: number;
  public y: number;
  public id: number;
  public vn: number;

  constructor(xv: number = 0, yv: number = 0) {
    this.x = xv;
    this.y = yv;
    this.id = 0;
    this.vn = kUnassignedVertexNumber;
  }

  equals(rhs: Point, epsilon: number = 0.0001): boolean {
    if (epsilon === 0) {
      return (this.x === rhs.x && this.y === rhs.y);
    }
    return (Math.abs(this.x - rhs.x) < epsilon &&
            Math.abs(this.y - rhs.y) < epsilon);
  }

  eq(rhs: Point): boolean {
    return this.x === rhs.x && this.y === rhs.y;
  }

  neq(rhs: Point): boolean {
    return !this.eq(rhs);
  }

  lessThan(rhs: Point): boolean {
    if (this.x !== rhs.x) return this.x < rhs.x;
    return this.y < rhs.y;
  }

  dim(dimension: number): number {
    return dimension === XDIM ? this.x : this.y;
  }

  setDim(dimension: number, val: number): void {
    if (dimension === XDIM) this.x = val;
    else this.y = val;
  }

  add(rhs: Point): Point {
    return new Point(this.x + rhs.x, this.y + rhs.y);
  }

  sub(rhs: Point): Point {
    return new Point(this.x - rhs.x, this.y - rhs.y);
  }

  clone(): Point {
    const p: Point = new Point(this.x, this.y);
    p.id = this.id;
    p.vn = this.vn;
    return p;
  }
}

export class Box {
  public min: Point;
  public max: Point;

  constructor() {
    this.min = new Point();
    this.max = new Point();
  }

  length(dimension: number): number {
    return this.max.dim(dimension) - this.min.dim(dimension);
  }

  width(): number {
    return this.length(XDIM);
  }

  height(): number {
    return this.length(YDIM);
  }
}

export class Edge {
  public a: Point;
  public b: Point;

  constructor() {
    this.a = new Point();
    this.b = new Point();
  }
}

export class Polygon implements PolygonInterface {
  public _id: number;
  public ps: Point[];
  public ts: string[];
  public checkpointsOnRoute: [number, Point][];

  constructor(n: number = 0) {
    this._id = 0;
    this.ps = [];
    this.ts = [];
    this.checkpointsOnRoute = [];
    if (n > 0) {
      this.ps = new Array<Point>(n);
      for (let i = 0; i < n; i++) {
        this.ps[i] = new Point();
      }
    }
  }

  static fromPolygonInterface(poly: PolygonInterface): Polygon {
    const p: Polygon = new Polygon(poly.size());
    p._id = poly.id();
    for (let i = 0; i < poly.size(); i++) {
      p.ps[i] = poly.at(i).clone();
    }
    return p;
  }

  clear(): void {
    this.ps = [];
    this.ts = [];
    this.checkpointsOnRoute = [];
  }

  empty(): boolean {
    return this.ps.length === 0;
  }

  size(): number {
    return this.ps.length;
  }

  id(): number {
    return this._id;
  }

  at(index: number): Point {
    return this.ps[index];
  }

  setPoint(index: number, point: Point): void {
    this.ps[index] = point.clone();
  }

  boundingRectPolygon(): Rectangle {
    const box: Box = this.offsetBoundingBox(0);
    return new Rectangle(box.min, box.max);
  }

  offsetBoundingBox(offset: number): Box {
    const box: Box = new Box();
    box.min.x = Infinity;
    box.min.y = Infinity;
    box.max.x = -Infinity;
    box.max.y = -Infinity;

    for (let i = 0; i < this.ps.length; i++) {
      box.min.x = Math.min(box.min.x, this.ps[i].x);
      box.min.y = Math.min(box.min.y, this.ps[i].y);
      box.max.x = Math.max(box.max.x, this.ps[i].x);
      box.max.y = Math.max(box.max.y, this.ps[i].y);
    }
    box.min.x -= offset;
    box.min.y -= offset;
    box.max.x += offset;
    box.max.y += offset;
    return box;
  }

  offsetPolygon(offset: number): Polygon {
    if (offset === 0) {
      return Polygon.fromPolygonInterface(this);
    }

    const box: Box = this.offsetBoundingBox(offset);
    return new Rectangle(box.min, box.max);
  }

  simplify(): Polygon {
    const simplified: Polygon = new Polygon();
    simplified._id = this._id;
    if (this.ps.length < 3) {
      simplified.ps = this.ps.map((p: Point) => p.clone());
      return simplified;
    }

    simplified.ps.push(this.ps[0].clone());
    for (let i = 1; i < this.ps.length - 1; i++) {
      if (vecDir(this.ps[i - 1], this.ps[i], this.ps[i + 1]) !== 0) {
        simplified.ps.push(this.ps[i].clone());
      }
    }
    simplified.ps.push(this.ps[this.ps.length - 1].clone());
    return simplified;
  }

  curvedPolyline(curveAmount: number, closed: boolean = false): Polygon {
    const curved: Polygon = new Polygon();
    curved._id = this._id;

    if (this.ps.length < 3) {
      curved.ps = this.ps.map((p: Point) => p.clone());
      for (let i = 0; i < curved.ps.length; i++) {
        curved.ts.push(i === 0 ? 'M' : 'L');
      }
      return curved;
    }

    curved.ps.push(this.ps[0].clone());
    curved.ts.push('M');

    for (let j = 1; j < this.ps.length - 1; j++) {
      const prev: Point = this.ps[j - 1];
      const curr: Point = this.ps[j];
      const next: Point = this.ps[j + 1];

      const d1: number = euclideanDist(prev, curr);
      const d2: number = euclideanDist(curr, next);

      const amount1: number = Math.min(curveAmount, d1 / 2);
      const amount2: number = Math.min(curveAmount, d2 / 2);

      // Start of curve
      const ratio1: number = amount1 / d1;
      const cp1: Point = new Point(
        curr.x + ratio1 * (prev.x - curr.x),
        curr.y + ratio1 * (prev.y - curr.y)
      );

      // End of curve
      const ratio2: number = amount2 / d2;
      const cp2: Point = new Point(
        curr.x + ratio2 * (next.x - curr.x),
        curr.y + ratio2 * (next.y - curr.y)
      );

      // Line to start of curve
      curved.ps.push(cp1);
      curved.ts.push('L');

      // Bezier curve
      curved.ps.push(curr.clone());
      curved.ts.push('C');
      curved.ps.push(curr.clone());
      curved.ts.push('C');
      curved.ps.push(cp2);
      curved.ts.push('C');
    }

    curved.ps.push(this.ps[this.ps.length - 1].clone());
    curved.ts.push('L');

    if (closed) {
      curved.ts.push('Z');
    }

    return curved;
  }

  translate(xDist: number, yDist: number): void {
    for (let i = 0; i < this.ps.length; i++) {
      this.ps[i].x += xDist;
      this.ps[i].y += yDist;
    }
  }

  checkpointsOnSegment(segmentLowerIndex: number, indexModifier: number = 0): Point[] {
    const result: Point[] = [];
    for (const [segIdx, pt] of this.checkpointsOnRoute) {
      const segLower: number = segmentLowerIndex * 2 + 1;
      const segUpper: number = segLower;

      if (indexModifier === 1 && segIdx === segmentLowerIndex * 2) {
        continue;
      }
      if (indexModifier === -1 && segIdx === (segmentLowerIndex + 1) * 2) {
        continue;
      }

      if (segIdx >= segmentLowerIndex * 2 && segIdx <= (segmentLowerIndex + 1) * 2) {
        result.push(pt.clone());
      }
    }
    return result;
  }
}

export class ReferencingPolygon implements PolygonInterface {
  public _id: number;
  public psRef: [Polygon, number][];
  public psPoints: Point[];

  constructor(poly: PolygonInterface | null = null, router: unknown = null) {
    this._id = 0;
    this.psRef = [];
    this.psPoints = [];

    if (poly) {
      this._id = (poly as Polygon)._id !== undefined ? (poly as Polygon)._id : poly.id();
      if (router) {
        // Build references from obstacle polygons
        for (let i = 0; i < poly.size(); i++) {
          this.psPoints.push(poly.at(i).clone());
        }
      } else {
        for (let i = 0; i < poly.size(); i++) {
          this.psPoints.push(poly.at(i).clone());
        }
      }
    }
  }

  clear(): void {
    this.psRef = [];
    this.psPoints = [];
  }

  empty(): boolean {
    return this.psRef.length === 0 && this.psPoints.length === 0;
  }

  size(): number {
    return Math.max(this.psRef.length, this.psPoints.length);
  }

  id(): number {
    return this._id;
  }

  at(index: number): Point {
    if (index < this.psPoints.length) {
      return this.psPoints[index];
    }
    if (index < this.psRef.length) {
      const [poly, vn]: [Polygon, number] = this.psRef[index];
      return poly.at(vn);
    }
    return new Point();
  }

  boundingRectPolygon(): Rectangle {
    const box: Box = this.offsetBoundingBox(0);
    return new Rectangle(box.min, box.max);
  }

  offsetBoundingBox(offset: number): Box {
    const box: Box = new Box();
    box.min.x = Infinity;
    box.min.y = Infinity;
    box.max.x = -Infinity;
    box.max.y = -Infinity;

    const n: number = this.size();
    for (let i = 0; i < n; i++) {
      const pt: Point = this.at(i);
      box.min.x = Math.min(box.min.x, pt.x);
      box.min.y = Math.min(box.min.y, pt.y);
      box.max.x = Math.max(box.max.x, pt.x);
      box.max.y = Math.max(box.max.y, pt.y);
    }
    box.min.x -= offset;
    box.min.y -= offset;
    box.max.x += offset;
    box.max.y += offset;
    return box;
  }
}

export class Rectangle extends Polygon {
  constructor(topLeftOrCentre: Point, bottomRightOrWidth: Point | number, height?: number) {
    super(4);
    if (height !== undefined) {
      // Centre, width, height constructor
      const centre: Point = topLeftOrCentre;
      const width: number = bottomRightOrWidth as number;
      const halfW: number = width / 2;
      const halfH: number = height / 2;
      this.ps[0] = new Point(centre.x - halfW, centre.y - halfH);
      this.ps[1] = new Point(centre.x + halfW, centre.y - halfH);
      this.ps[2] = new Point(centre.x + halfW, centre.y + halfH);
      this.ps[3] = new Point(centre.x - halfW, centre.y + halfH);
    } else {
      // TopLeft, BottomRight constructor
      const topLeft: Point = topLeftOrCentre;
      const bottomRight: Point = bottomRightOrWidth as Point;
      this.ps[0] = new Point(topLeft.x, topLeft.y);
      this.ps[1] = new Point(bottomRight.x, topLeft.y);
      this.ps[2] = new Point(bottomRight.x, bottomRight.y);
      this.ps[3] = new Point(topLeft.x, bottomRight.y);
    }
  }
}

// Utility functions used by Polygon methods
function vecDir(a: Point, b: Point, c: Point, maybeZero: number = 0): number {
  const area2: number = ((b.x - a.x) * (c.y - a.y)) - ((c.x - a.x) * (b.y - a.y));
  if (area2 < -maybeZero) return -1;
  if (area2 > maybeZero) return 1;
  return 0;
}

function euclideanDist(a: Point, b: Point): number {
  const dx: number = a.x - b.x;
  const dy: number = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
