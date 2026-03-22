/*
 * libavoid-js - Port of libavoid visibility
 * Original: Copyright (C) 2004-2009 Monash University
 * Author: Michael Wybrow
 *
 * The Visibility Sweep technique is based upon the method described
 * in Section 5.2 of:
 *     Lee, D.-T. (1978). Proximity and reachability in the plane.,
 *     PhD thesis, Department of Electrical Engineering,
 *     University of Illinois, Urbana, IL.
 *
 * Licensed under LGPL 2.1
 */

import { AHEAD, BEHIND, DO_INTERSECT } from '../core/constants';
import { Point } from '../core/geomtypes';
import {
  rotationalAngle,
  euclideanDist,
  vecDir,
  segmentIntersect,
  pointOnLine,
  inValidRegion,
  rayIntersectPoint,
} from '../core/geometry';
import { VertInf, VertID } from './vertices';
import { EdgeInf } from './graph';

/**
 * Router interface — use `any` to avoid circular dependency with Router class.
 */
type Router = any;

/**
 * Result type returned by rayIntersectPoint.
 */
interface RayIntersectResult {
  result: number;
  x?: number;
  y?: number;
}

/**
 * Blocker reference — output parameter wrapper.
 */
interface BlockerRef {
  value: number;
}


// ---------------------------------------------------------------------------
//  PointPair -- wraps a vertex together with its angle/distance from a center.
//  Used as elements in the sorted sweep vertex set.
// ---------------------------------------------------------------------------
class PointPair {
  public vInf: VertInf;
  public centerPoint: Point;
  public angle: number;
  public distance: number;

  /**
   * @param centerPoint - The point we are sweeping around.
   * @param inf - A VertInf instance.
   */
  constructor(centerPoint: Point, inf: VertInf) {
    this.vInf = inf;
    this.centerPoint = centerPoint;
    this.angle = rotationalAngle(inf.point.sub(centerPoint));
    this.distance = euclideanDist(centerPoint, inf.point);
  }

  /**
   * Comparison: order by angle first, then distance, then VertID.
   * Returns negative if this < rhs, 0 if equal, positive if this > rhs.
   */
  compareTo(rhs: PointPair): number {
    if (this.angle !== rhs.angle) {
      return this.angle - rhs.angle;
    }
    if (this.distance !== rhs.distance) {
      return this.distance - rhs.distance;
    }
    // Compare by VertID when angle and distance are the same.
    return (this.vInf.id as any).compareTo(rhs.vInf.id);
  }

  /**
   * Mimics C++ operator<
   */
  lessThan(rhs: PointPair): boolean {
    return this.compareTo(rhs) < 0;
  }
}


// ---------------------------------------------------------------------------
//  EdgePair -- represents an edge between two vertices that may block
//  visibility during the sweep.
// ---------------------------------------------------------------------------
class EdgePair {
  public vInf1: VertInf | null;
  public vInf2: VertInf | null;
  public dist1: number;
  public dist2: number;
  public angle: number;
  public angleDist: number;
  public centerPoint: Point | null;

  /**
   * @param p1 - The PointPair for the first vertex of the edge.
   * @param v - A VertInf instance for the second vertex.
   */
  constructor(p1?: PointPair, v?: VertInf) {
    if (p1 === undefined && v === undefined) {
      // Default (should not normally be used).
      this.vInf1 = null;
      this.vInf2 = null;
      this.dist1 = 0.0;
      this.dist2 = 0.0;
      this.angle = 0.0;
      this.angleDist = 0.0;
      this.centerPoint = null;
      return;
    }

    this.vInf1 = p1!.vInf;
    this.vInf2 = v!;
    this.dist1 = p1!.distance;
    this.dist2 = euclideanDist(v!.point, p1!.centerPoint);
    this.angle = p1!.angle;
    this.angleDist = p1!.distance;
    this.centerPoint = p1!.centerPoint;
  }

  /**
   * Comparison used for sorting the sweep-edge list.
   * Both edges are assumed to share the same current angle.
   */
  compareTo(rhs: EdgePair): number {
    // COLA_ASSERT(this.angle === rhs.angle);
    if (this.angleDist !== rhs.angleDist) {
      return this.angleDist - rhs.angleDist;
    }
    return this.dist2 - rhs.dist2;
  }

  lessThan(rhs: EdgePair): boolean {
    return this.compareTo(rhs) < 0;
  }

  /**
   * Two EdgePairs are equal if they reference the same pair of vertices
   * (in either order).
   */
  equals(rhs: EdgePair): boolean {
    if ((this.vInf1!.id.equals(rhs.vInf1!.id) &&
         this.vInf2!.id.equals(rhs.vInf2!.id)) ||
        (this.vInf1!.id.equals(rhs.vInf2!.id) &&
         this.vInf2!.id.equals(rhs.vInf1!.id))) {
      return true;
    }
    return false;
  }

  setNegativeAngle(): void {
    this.angle = -1.0;
  }

  /**
   * Update the current angle/angleDist based on the given PointPair.
   * If the edge endpoint matches p, use the pre-computed distance;
   * otherwise compute the ray-intersection distance.
   */
  setCurrAngle(p: PointPair): number {
    if (p.vInf.point.eq(this.vInf1!.point)) {
      this.angleDist = this.dist1;
      this.angle = p.angle;
    } else if (p.vInf.point.eq(this.vInf2!.point)) {
      this.angleDist = this.dist2;
      this.angle = p.angle;
    } else if (p.angle !== this.angle) {
      // COLA_ASSERT(p.angle > this.angle);
      this.angle = p.angle;
      const res: RayIntersectResult = rayIntersectPoint(
        this.vInf1!.point, this.vInf2!.point,
        this.centerPoint!, p.vInf.point
      );
      if (res.result !== DO_INTERSECT) {
        // This can happen with points that appear to have the
        // same angle but are at slightly different positions.
        this.angleDist = Math.min(this.dist1, this.dist2);
      } else {
        const pp: Point = new Point(res.x, res.y);
        this.angleDist = euclideanDist(pp, this.centerPoint!);
      }
    }

    return this.angleDist;
  }
}


// ---------------------------------------------------------------------------
//  isBoundingShape -- functor that tests whether a PointPair's vertex belongs
//  to one of the shapes in the given ShapeSet.
// ---------------------------------------------------------------------------
class isBoundingShape {
  public ss: Set<number>;

  constructor(shapeSet: Set<number>) {
    this.ss = shapeSet;
  }

  test(pp: PointPair): boolean {
    if (!pp.vInf.id.isConnPt() && this.ss.has(pp.vInf.id.objID)) {
      return true;
    }
    return false;
  }
}


// ---------------------------------------------------------------------------
//  sweepVisible -- Determine whether the current point in the sweep is
//  visible from the center point, given the current set of blocking edges.
// ---------------------------------------------------------------------------

function sweepVisible(
  T: EdgePair[],
  point: PointPair,
  onBorderIDs: Set<number>,
  blockerRef: BlockerRef
): boolean {
  if (T.length === 0) {
    // No blocking edges.
    return true;
  }

  const router: Router = point.vInf._router;
  let visible: boolean = true;

  // Find the first edge in T that does not share an endpoint with point.
  let closestIdx: number = 0;
  while (closestIdx < T.length) {
    const closest: EdgePair = T[closestIdx];
    if (point.vInf.point.eq(closest.vInf1!.point) ||
        point.vInf.point.eq(closest.vInf2!.point)) {
      // If the ray intersects just the endpoint of a blocking edge,
      // then ignore that edge.
      closestIdx++;
      continue;
    }
    break;
  }

  if (closestIdx >= T.length) {
    return true;
  }

  if (point.vInf.id.isConnPt()) {
    // It's a connector endpoint, so we have to ignore edges of
    // containing shapes for determining visibility.
    const rss: Set<number> = router.contains[point.vInf.id.toString()] || new Set();

    while (closestIdx < T.length) {
      const closest: EdgePair = T[closestIdx];
      if (!rss.has(closest.vInf1!.id.objID)) {
        // This is not a containing edge so do the normal test
        // and then stop.
        if (point.distance > closest.angleDist) {
          visible = false;
        } else if (point.distance === closest.angleDist &&
                   onBorderIDs.has(closest.vInf1!.id.objID)) {
          // Touching, but centerPoint is on another edge of that
          // shape, so count as blocking.
          visible = false;
        }
        break;
      }
      // This was a containing edge, so consider the next along.
      closestIdx++;
    }
  } else {
    // Just test to see if this point is closer than the closest
    // edge blocking this ray.
    const closest: EdgePair = T[closestIdx];
    if (point.distance > closest.angleDist) {
      visible = false;
    } else if (point.distance === closest.angleDist &&
               onBorderIDs.has(closest.vInf1!.id.objID)) {
      // Touching, but centerPoint is on another edge of that
      // shape, so count as blocking.
      visible = false;
    }
  }

  if (!visible) {
    blockerRef.value = T[closestIdx].vInf1!.id.objID;
  }
  return visible;
}


// ---------------------------------------------------------------------------
//  Sorted-insert helper (binary-search insertion into a sorted array).
// ---------------------------------------------------------------------------
function sortedInsert(arr: PointPair[], item: PointPair): void {
  let lo: number = 0;
  let hi: number = arr.length;
  while (lo < hi) {
    const mid: number = (lo + hi) >>> 1;
    if (item.compareTo(arr[mid]) > 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  arr.splice(lo, 0, item);
}


// ---------------------------------------------------------------------------
//  vertexSweep -- Perform the rotational sweep around a single vertex,
//  establishing visibility edges to all other reachable vertices.
// ---------------------------------------------------------------------------
function vertexSweep(vert: VertInf): void {
  const router: Router = vert._router;
  const pID: VertID = vert.id;
  const pPoint: Point = vert.point;

  const centerInf: VertInf = vert;
  const centerID: VertID = pID;
  const centerPoint: Point = pPoint;

  // Build the sorted set of vertices to sweep over (excluding vert itself).
  const v: PointPair[] = []; // sorted array of PointPair

  const ss: Set<number> = router.contains[centerID.toString()] || new Set();
  let inf: VertInf | null = router.vertices.connsBegin();
  const endVert: VertInf | null = router.vertices.end();

  while (inf !== endVert) {
    if (inf === centerInf) {
      inf = inf!.lstNext;
      continue;
    }

    if ((inf! as any).id.isDummyOrthogID && (inf! as any).id.isDummyOrthogID()) {
      // Don't include orthogonal dummy vertices.
      inf = inf!.lstNext;
      continue;
    }

    if (centerID.isConnPt() && ss.has(inf!.id.objID) && !inf!.id.isConnPt()) {
      // Don't include edge points of containing shapes.
      inf = inf!.lstNext;
      continue;
    }

    if (inf!.id.isConnPt()) {
      // Add connector endpoint.
      if (centerID.isConnPt()) {
        if (inf!.id.isConnectionPin()) {
          sortedInsert(v, new PointPair(centerPoint, inf!));
        } else if (centerID.isConnectionPin()) {
          // Connection pins have visibility to everything.
          sortedInsert(v, new PointPair(centerPoint, inf!));
        } else if (inf!.id.objID === centerID.objID) {
          // Center is an endpoint, so only include the other
          // endpoints or checkpoints from the matching connector.
          sortedInsert(v, new PointPair(centerPoint, inf!));
        }
      } else {
        // Center is a shape vertex, so add all endpoint vertices.
        sortedInsert(v, new PointPair(centerPoint, inf!));
      }
    } else {
      // Add shape vertex.
      sortedInsert(v, new PointPair(centerPoint, inf!));
    }

    inf = inf!.lstNext;
  }

  const onBorderIDs: Set<number> = new Set();

  // Add edges to the sweep-edge list that intersect the initial ray
  // (from centerPoint along the positive x-axis).
  const e: EdgePair[] = []; // SweepEdgeList (array of EdgePair)
  const xaxis: Point = new Point(Number.MAX_VALUE, centerInf.point.y);

  for (let ti: number = 0; ti < v.length; ti++) {
    const t: PointPair = v[ti];
    const k: VertInf = t.vInf;

    // COLA_ASSERT(centerInf !== k);

    const kPrev: VertInf | null = k.shPrev;
    const kNext: VertInf | null = k.shNext;

    if (kPrev && (kPrev !== centerInf) &&
        (vecDir(centerInf.point, xaxis, kPrev.point) === AHEAD)) {
      if (segmentIntersect(centerInf.point, xaxis, kPrev.point, k.point)) {
        const intPair: EdgePair = new EdgePair(t, kPrev);
        e.push(intPair);
      }
      if (pointOnLine(kPrev.point, k.point, centerInf.point)) {
        // Record that centerPoint is on an obstacle line.
        onBorderIDs.add(k.id.objID);
      }
    } else if (kNext && (kNext !== centerInf) &&
               (vecDir(centerInf.point, xaxis, kNext.point) === AHEAD)) {
      if (segmentIntersect(centerInf.point, xaxis, kNext.point, k.point)) {
        const intPair: EdgePair = new EdgePair(t, kNext);
        e.push(intPair);
      }
      if (pointOnLine(kNext.point, k.point, centerInf.point)) {
        // Record that centerPoint is on an obstacle line.
        onBorderIDs.add(k.id.objID);
      }
    }
  }

  // Set initial edges to negative angle so they sort before anything at angle 0.
  for (let ci: number = 0; ci < e.length; ci++) {
    e[ci].setNegativeAngle();
  }

  // --- Start the actual sweep ---

  const isBounding: isBoundingShape = new isBoundingShape(ss);

  for (let ti: number = 0; ti < v.length; ti++) {
    const t: PointPair = v[ti];
    const currInf: VertInf = t.vInf;
    const currID: VertID = currInf.id;
    const currPt: Point = currInf.point;
    const currDist: number = t.distance;

    // Get or create the edge between center and current vertex.
    let edge: EdgeInf | null = null;
    if (typeof EdgeInf !== 'undefined') {
      edge = EdgeInf.existingEdge(centerInf, currInf);
      if (edge === null) {
        edge = new EdgeInf(centerInf, currInf);
      }
    } else {
      // Fallback: look for existingEdge on the imported module or on the
      // router. This allows the code to work even before graph.js is fully
      // ported -- callers can monkey-patch as needed.
      if (router.EdgeInf) {
        edge = router.EdgeInf.existingEdge(centerInf, currInf);
        if (edge === null) {
          edge = new router.EdgeInf(centerInf, currInf);
        }
      }
    }

    // Update angles for every edge in the sweep-edge list.
    for (let ci: number = 0; ci < e.length; ci++) {
      e[ci].setCurrAngle(t);
    }
    // Re-sort the sweep edge list.
    e.sort((a: EdgePair, b: EdgePair) => a.compareTo(b));

    // Check visibility.
    const blockerRef: BlockerRef = { value: 0 };
    const currVisible: boolean = sweepVisible(e, t, onBorderIDs, blockerRef);

    let cone1: boolean = true;
    let cone2: boolean = true;

    if (!centerID.isConnPt()) {
      cone1 = inValidRegion(
        router.IgnoreRegions,
        centerInf.shPrev!.point, centerPoint,
        centerInf.shNext!.point, currInf.point
      );
    }
    if (!currInf.id.isConnPt()) {
      cone2 = inValidRegion(
        router.IgnoreRegions,
        currInf.shPrev!.point, currInf.point,
        currInf.shNext!.point, centerPoint
      );
    }

    if (!cone1 || !cone2) {
      if (router.InvisibilityGrph && edge) {
        edge.addBlocker(0);
      }
    } else {
      if (currVisible) {
        if (edge) {
          edge.setDist(currDist);
        }
      } else if (router.InvisibilityGrph && edge) {
        edge.addBlocker(blockerRef.value);
      }
    }

    if (edge && !edge.added() && !router.InvisibilityGrph) {
      // Edge was not added to the graph -- discard it.
      edge = null;
    }

    if (!currID.isConnPt()) {
      // This is a shape edge -- update the sweep-edge list.

      if (currInf.shPrev !== centerInf) {
        const prevPt: Point = currInf.shPrev!.point;
        const prevDir: number = vecDir(centerPoint, currPt, prevPt);
        const prevPair: EdgePair = new EdgePair(t, currInf.shPrev!);

        if (prevDir === BEHIND) {
          // Remove matching edge from e.
          for (let ri: number = e.length - 1; ri >= 0; ri--) {
            if (e[ri].equals(prevPair)) {
              e.splice(ri, 1);
              break;
            }
          }
        } else if (prevDir === AHEAD) {
          e.unshift(prevPair);
        }
      }

      if (currInf.shNext !== centerInf) {
        const nextPt: Point = currInf.shNext!.point;
        const nextDir: number = vecDir(centerPoint, currPt, nextPt);
        const nextPair: EdgePair = new EdgePair(t, currInf.shNext!);

        if (nextDir === BEHIND) {
          // Remove matching edge from e.
          for (let ri: number = e.length - 1; ri >= 0; ri--) {
            if (e[ri].equals(nextPair)) {
              e.splice(ri, 1);
              break;
            }
          }
        } else if (nextDir === AHEAD) {
          e.unshift(nextPair);
        }
      }
    }
  }
}


// ---------------------------------------------------------------------------
//  vertexVisibility -- Main public function.
//  Computes visibility for a single connector endpoint vertex, either via
//  Lee's sweep algorithm or naive pairwise checking.
// ---------------------------------------------------------------------------

export function vertexVisibility(
  point: VertInf,
  partner: VertInf | null,
  knownNew: boolean,
  gen_contains: boolean = false
): void {
  const router: Router = point._router;
  const pID: VertID = point.id;

  // Make sure we're only doing ptVis for endpoints.
  // COLA_ASSERT(pID.isConnPt());

  if (!router.InvisibilityGrph) {
    point.removeFromGraph();
  }

  if (gen_contains && pID.isConnPt()) {
    router.generateContains(point);
  }

  if (router.UseLeesAlgorithm) {
    vertexSweep(point);
  } else {
    const shapesEnd: VertInf | null = router.vertices.end();
    let k: VertInf | null = router.vertices.connsBegin();
    while (k !== shapesEnd) {
      if ((k! as any).id.isDummyOrthogID && (k! as any).id.isDummyOrthogID()) {
        // Don't include orthogonal dummy vertices.
        k = k!.lstNext;
        continue;
      } else if (k!.id.isConnPt() && !k!.id.isConnectionPin() &&
                 !(k!.id.isConnCheckpoint && k!.id.isConnCheckpoint() &&
                   k!.id.objID === pID.objID)) {
        // Include connection pins, but not connectors.
        // Also include checkpoints with same ID as sweep point.
        k = k!.lstNext;
        continue;
      }
      // EdgeInf.checkEdgeVisibility must be provided by graph.ts.
      if (router.EdgeInf) {
        router.EdgeInf.checkEdgeVisibility(point, k!, knownNew);
      }
      k = k!.lstNext;
    }
    if (partner) {
      if (router.EdgeInf) {
        router.EdgeInf.checkEdgeVisibility(point, partner, knownNew);
      }
    }
  }
}
