/*
 * libavoid-js - Port of libavoid geometry
 * Original: Copyright (C) 2004-2011 Monash University
 * Author: Michael Wybrow
 * Based on "Computational Geometry in C" (Second Edition) by Joseph O'Rourke
 * Segment intersection from Franklin Antonio, Graphics Gems III
 */

import { Point, Polygon, PolygonInterface } from './geomtypes';
import { DONT_INTERSECT, DO_INTERSECT, PARALLEL } from './constants';

/** Result of a segment intersection point calculation. */
export interface SegmentIntersectResult {
  result: typeof DONT_INTERSECT | typeof DO_INTERSECT | typeof PARALLEL;
  x?: number;
  y?: number;
}

/** State object passed to segmentShapeIntersect to track endpoint intersections. */
export interface SegmentShapeState {
  seenIntersectionAtEndpoint: boolean;
}

// Direction from vector.
// Returns: 1 (counterclockwise), 0 (collinear), -1 (clockwise)
export function vecDir(a: Point, b: Point, c: Point, maybeZero: number = 0): number {
  const area2: number = ((b.x - a.x) * (c.y - a.y)) - ((c.x - a.x) * (b.y - a.y));
  if (area2 < -maybeZero) return -1;
  if (area2 > maybeZero) return 1;
  return 0;
}

// Projection of (a,b) onto (a,c)
export function projection(a: Point, b: Point, c: Point): Point {
  const ux: number = c.x - a.x;
  const uy: number = c.y - a.y;
  const vx: number = b.x - a.x;
  const vy: number = b.y - a.y;
  let scalarProj: number = ux * vx + uy * vy;
  scalarProj /= (ux * ux + uy * uy);
  return new Point(scalarProj * ux + a.x, scalarProj * uy + a.y);
}

export function euclideanDist(a: Point, b: Point): number {
  const dx: number = a.x - b.x;
  const dy: number = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function manhattanDist(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function totalLength(poly: Polygon): number {
  let l: number = 0;
  for (let i = 1; i < poly.size(); i++) {
    l += euclideanDist(poly.ps[i - 1], poly.ps[i]);
  }
  return l;
}

export function angle(a: Point, b: Point, c: Point): number {
  const ux: number = b.x - a.x;
  const uy: number = b.y - a.y;
  const vx: number = c.x - b.x;
  const vy: number = c.y - b.y;
  const lu: number = Math.sqrt(ux * ux + uy * uy);
  const lv: number = Math.sqrt(vx * vx + vy * vy);
  const udotv: number = ux * vx + uy * vy;
  const costheta: number = udotv / (lu * lv);
  return Math.acos(Math.max(-1, Math.min(1, costheta)));
}

// Returns true iff point c lies on closed segment ab (known collinear)
export function inBetween(a: Point, b: Point, c: Point): boolean {
  const epsilon: number = Number.EPSILON;
  if (Math.abs(a.x - b.x) > epsilon) {
    return ((a.x < c.x && c.x < b.x) || (b.x < c.x && c.x < a.x));
  }
  return ((a.y < c.y && c.y < b.y) || (b.y < c.y && c.y < a.y));
}

export function colinear(a: Point, b: Point, c: Point, tolerance: number = 0): boolean {
  if (a.x === b.x && a.y === b.y) return true;
  if (a.x === b.x) return a.x === c.x;
  if (a.y === b.y) return a.y === c.y;
  return vecDir(a, b, c, tolerance) === 0;
}

export function pointOnLine(a: Point, b: Point, c: Point, tolerance: number = 0): boolean {
  if (a.x === b.x) {
    return (a.x === c.x) &&
      ((a.y < c.y && c.y < b.y) || (b.y < c.y && c.y < a.y));
  }
  if (a.y === b.y) {
    return (a.y === c.y) &&
      ((a.x < c.x && c.x < b.x) || (b.x < c.x && c.x < a.x));
  }
  return (vecDir(a, b, c, tolerance) === 0) && inBetween(a, b, c);
}

export function segmentIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const ab_c: number = vecDir(a, b, c);
  if (ab_c === 0) return false;
  const ab_d: number = vecDir(a, b, d);
  if (ab_d === 0) return false;
  const cd_a: number = vecDir(c, d, a);
  const cd_b: number = vecDir(c, d, b);
  return ((ab_c * ab_d) < 0) && ((cd_a * cd_b) < 0);
}

export function segmentShapeIntersect(
  e1: Point,
  e2: Point,
  s1: Point,
  s2: Point,
  state: SegmentShapeState
): boolean {
  if (segmentIntersect(e1, e2, s1, s2)) {
    return true;
  }
  if (((s2.eq(e1) || pointOnLine(s1, s2, e1)) && vecDir(s1, s2, e2) !== 0) ||
      ((s2.eq(e2) || pointOnLine(s1, s2, e2)) && vecDir(s1, s2, e1) !== 0)) {
    if (state.seenIntersectionAtEndpoint) {
      return true;
    }
    state.seenIntersectionAtEndpoint = true;
  }
  return false;
}

export function inValidRegion(
  ignoreRegions: boolean,
  a0: Point,
  a1: Point,
  a2: Point,
  b: Point
): boolean {
  const rSide: number = vecDir(b, a0, a1);
  const sSide: number = vecDir(b, a1, a2);

  const rOutOn: boolean = (rSide <= 0);
  const sOutOn: boolean = (sSide <= 0);
  const rOut: boolean = (rSide < 0);
  const sOut: boolean = (sSide < 0);

  if (vecDir(a0, a1, a2) > 0) {
    // Convex at a1
    if (ignoreRegions) {
      return (rOutOn && !sOut) || (!rOut && sOutOn);
    }
    return rOutOn || sOutOn;
  } else {
    // Concave at a1
    return ignoreRegions ? false : (rOutOn && sOutOn);
  }
}

export function cornerSide(c1: Point, c2: Point, c3: Point, p: Point): number {
  const s123: number = vecDir(c1, c2, c3);
  const s12p: number = vecDir(c1, c2, p);
  const s23p: number = vecDir(c2, c3, p);

  if (s123 === 1) {
    if (s12p >= 0 && s23p >= 0) return 1;
    return -1;
  } else if (s123 === -1) {
    if (s12p <= 0 && s23p <= 0) return -1;
    return 1;
  }
  return s12p;
}

// Fast version for convex polygons
export function inPoly(poly: Polygon, q: Point, countBorder: boolean = true): boolean {
  const n: number = poly.size();
  const P: Point[] = poly.ps;
  let onBorder: boolean = false;
  for (let i = 0; i < n; i++) {
    const prev: number = (i + n - 1) % n;
    const dir: number = vecDir(P[prev], P[i], q);
    if (dir === -1) return false;
    onBorder = onBorder || (dir === 0);
  }
  if (!countBorder && onBorder) return false;
  return true;
}

// General version using ray casting
export function inPolyGen(argpoly: PolygonInterface, q: Point): boolean {
  let Rcross: number = 0;
  let Lcross: number = 0;

  const poly: Polygon = Polygon.fromPolygonInterface(argpoly);
  const P: Point[] = poly.ps;
  const n: number = poly.size();

  // Shift so q is origin
  for (let i = 0; i < n; i++) {
    P[i].x -= q.x;
    P[i].y -= q.y;
  }

  for (let i = 0; i < n; i++) {
    if (P[i].x === 0 && P[i].y === 0) return true;

    const i1: number = (i + n - 1) % n;

    if ((P[i].y > 0) !== (P[i1].y > 0)) {
      const x: number = (P[i].x * P[i1].y - P[i1].x * P[i].y) / (P[i1].y - P[i].y);
      if (x > 0) Rcross++;
    }

    if ((P[i].y < 0) !== (P[i1].y < 0)) {
      const x: number = (P[i].x * P[i1].y - P[i1].x * P[i].y) / (P[i1].y - P[i].y);
      if (x < 0) Lcross++;
    }
  }

  if ((Rcross % 2) !== (Lcross % 2)) return true;
  if ((Rcross % 2) === 1) return true;
  return false;
}

export function segmentIntersectPoint(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): SegmentIntersectResult {
  let Ax: number = a2.x - a1.x;
  let Bx: number = b1.x - b2.x;
  let x1lo: number, x1hi: number;

  if (Ax < 0) { x1lo = a2.x; x1hi = a1.x; }
  else { x1hi = a2.x; x1lo = a1.x; }

  if (Bx > 0) {
    if (x1hi < b2.x || b1.x < x1lo) return { result: DONT_INTERSECT };
  } else {
    if (x1hi < b1.x || b2.x < x1lo) return { result: DONT_INTERSECT };
  }

  let Ay: number = a2.y - a1.y;
  let By: number = b1.y - b2.y;
  let y1lo: number, y1hi: number;

  if (Ay < 0) { y1lo = a2.y; y1hi = a1.y; }
  else { y1hi = a2.y; y1lo = a1.y; }

  if (By > 0) {
    if (y1hi < b2.y || b1.y < y1lo) return { result: DONT_INTERSECT };
  } else {
    if (y1hi < b1.y || b2.y < y1lo) return { result: DONT_INTERSECT };
  }

  const Cx: number = a1.x - b1.x;
  const Cy: number = a1.y - b1.y;
  const d: number = By * Cx - Bx * Cy;
  const f: number = Ay * Bx - Ax * By;

  if (f > 0) {
    if (d < 0 || d > f) return { result: DONT_INTERSECT };
  } else {
    if (d > 0 || d < f) return { result: DONT_INTERSECT };
  }

  const e: number = Ax * Cy - Ay * Cx;
  if (f > 0) {
    if (e < 0 || e > f) return { result: DONT_INTERSECT };
  } else {
    if (e > 0 || e < f) return { result: DONT_INTERSECT };
  }

  if (f === 0) return { result: PARALLEL };

  const x: number = a1.x + (d * Ax) / f;
  const y: number = a1.y + (d * Ay) / f;

  return { result: DO_INTERSECT, x, y };
}

export function rayIntersectPoint(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): SegmentIntersectResult {
  const Ay: number = a2.y - a1.y;
  const By: number = b1.y - b2.y;
  const Ax: number = a2.x - a1.x;
  const Bx: number = b1.x - b2.x;

  const Cx: number = a1.x - b1.x;
  const Cy: number = a1.y - b1.y;
  const d: number = By * Cx - Bx * Cy;
  const f: number = Ay * Bx - Ax * By;

  if (f === 0) return { result: PARALLEL };

  const x: number = a1.x + (d * Ax) / f;
  const y: number = a1.y + (d * Ay) / f;

  return { result: DO_INTERSECT, x, y };
}

export function rotationalAngle(p: Point): number {
  if (p.y === 0) {
    return p.x < 0 ? 180 : 0;
  }
  if (p.x === 0) {
    return p.y < 0 ? 270 : 90;
  }

  let ang: number = Math.atan(p.y / p.x) * 180 / Math.PI;

  if (p.x < 0) {
    ang += 180;
  } else if (p.y < 0) {
    ang += 360;
  }
  return ang;
}
