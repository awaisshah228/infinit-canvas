/*
 * libavoid-js - JavaScript port of libavoid scanline
 * Original C++ library: Copyright (C) 2009-2014 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import {
  XDIM,
  YDIM,
  CHANNEL_MAX,
  Open,
  SegOpen,
  ConnPoint,
  SegClose,
  Close,
  ConnType_Orthogonal,
} from '../core/constants';

import { Point } from '../core/geomtypes';
import { pointOnLine } from '../core/geometry';


// ===========================================================================
// ShiftSegment (abstract base class)
// ===========================================================================

export class ShiftSegment {
  dimension: number;
  minSpaceLimit: number;
  maxSpaceLimit: number;

  constructor(dim: number) {
    this.dimension = dim;
    this.minSpaceLimit = -CHANNEL_MAX;
    this.maxSpaceLimit = CHANNEL_MAX;
  }

  lowPoint(): any {
    throw new Error('ShiftSegment.lowPoint() is abstract');
  }

  highPoint(): any {
    throw new Error('ShiftSegment.highPoint() is abstract');
  }

  overlapsWith(_rhs: ShiftSegment, _dim: number): boolean {
    throw new Error('ShiftSegment.overlapsWith() is abstract');
  }

  immovable(): boolean {
    throw new Error('ShiftSegment.immovable() is abstract');
  }
}


// ===========================================================================
// SortedNodeSet  (replaces std::set<Node*, CmpNodePos>)
// ===========================================================================

let _nodeIdCounter: number = 0;

function cmpNodePos(u: Node, v: Node): number {
  if (u.pos !== v.pos) {
    return u.pos < v.pos ? -1 : 1;
  }
  return u._uid - v._uid;
}

class SortedNodeSet {
  _arr: Node[];

  constructor() {
    this._arr = [];
  }

  size(): number {
    return this._arr.length;
  }

  insert(node: Node): { index: number; inserted: boolean } {
    let lo: number = 0;
    let hi: number = this._arr.length;
    while (lo < hi) {
      const mid: number = (lo + hi) >>> 1;
      if (cmpNodePos(this._arr[mid], node) < 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this._arr.splice(lo, 0, node);
    node._setIndex = lo;
    for (let i: number = lo + 1; i < this._arr.length; i++) {
      this._arr[i]._setIndex = i;
    }
    return { index: lo, inserted: true };
  }

  erase(node: Node): number {
    const idx: number = node._setIndex;
    if (idx < 0 || idx >= this._arr.length || this._arr[idx] !== node) {
      const fi: number = this._arr.indexOf(node);
      if (fi === -1) return 0;
      this._arr.splice(fi, 1);
      for (let i: number = fi; i < this._arr.length; i++) {
        this._arr[i]._setIndex = i;
      }
      return 1;
    }
    this._arr.splice(idx, 1);
    for (let i: number = idx; i < this._arr.length; i++) {
      this._arr[i]._setIndex = i;
    }
    return 1;
  }

  prevNode(node: Node): Node | null {
    const idx: number = node._setIndex;
    return idx > 0 ? this._arr[idx - 1] : null;
  }

  nextNode(node: Node): Node | null {
    const idx: number = node._setIndex;
    return idx < this._arr.length - 1 ? this._arr[idx + 1] : null;
  }
}


// ===========================================================================
// Node
// ===========================================================================

export class Node {
  _uid: number;
  v: any;
  c: any;
  ss: ShiftSegment | null;
  pos: number;
  min: number[];
  max: number[];
  firstAbove: Node | null;
  firstBelow: Node | null;
  _setIndex: number;

  constructor(obstacleOrVertOrSS: any, p: number) {
    this._uid = _nodeIdCounter++;
    this.v = null;
    this.c = null;
    this.ss = null;
    this.pos = p;
    this.min = [0, 0];
    this.max = [0, 0];
    this.firstAbove = null;
    this.firstBelow = null;
    this._setIndex = -1;
  }

  static fromObstacle(obstacle: any, p: number): Node {
    const n: Node = new Node(null, p);
    n.v = obstacle;
    const bBox: any = obstacle.routingBox();
    n.min[XDIM] = bBox.min.x;
    n.min[YDIM] = bBox.min.y;
    n.max[XDIM] = bBox.max.x;
    n.max[YDIM] = bBox.max.y;
    return n;
  }

  static fromVertInf(c: any, p: number): Node {
    const n: Node = new Node(null, p);
    n.c = c;
    n.min[XDIM] = n.max[XDIM] = c.point.x;
    n.min[YDIM] = n.max[YDIM] = c.point.y;
    return n;
  }

  static fromShiftSegment(ss: ShiftSegment, p: number): Node {
    const n: Node = new Node(null, p);
    n.ss = ss;
    n.min[XDIM] = n.max[XDIM] = 0;
    n.min[YDIM] = n.max[YDIM] = 0;
    return n;
  }

  firstObstacleAbove(dim: number): number {
    let curr: Node | null = this.firstAbove;
    while (curr && (curr.ss || (curr.max[dim] > this.pos))) {
      curr = curr.firstAbove;
    }
    if (curr) {
      return curr.max[dim];
    }
    return -Number.MAX_VALUE;
  }

  firstObstacleBelow(dim: number): number {
    let curr: Node | null = this.firstBelow;
    while (curr && (curr.ss || (curr.min[dim] < this.pos))) {
      curr = curr.firstBelow;
    }
    if (curr) {
      return curr.min[dim];
    }
    return Number.MAX_VALUE;
  }

  markShiftSegmentsAbove(dim: number): void {
    let curr: Node | null = this.firstAbove;
    while (curr && (curr.ss || (curr.pos > this.min[dim]))) {
      if (curr.ss && (curr.pos <= this.min[dim])) {
        curr.ss.maxSpaceLimit =
          Math.min(this.min[dim], curr.ss.maxSpaceLimit);
      }
      curr = curr.firstAbove;
    }
  }

  markShiftSegmentsBelow(dim: number): void {
    let curr: Node | null = this.firstBelow;
    while (curr && (curr.ss || (curr.pos < this.max[dim]))) {
      if (curr.ss && (curr.pos >= this.max[dim])) {
        curr.ss.minSpaceLimit =
          Math.max(this.max[dim], curr.ss.minSpaceLimit);
      }
      curr = curr.firstBelow;
    }
  }

  findFirstPointAboveAndBelow(dim: number, linePos: number): { firstAbovePos: number; firstBelowPos: number; lastAbovePos: number; lastBelowPos: number } {
    let firstAbovePos: number = -Number.MAX_VALUE;
    let firstBelowPos: number = Number.MAX_VALUE;
    let lastAbovePos: number = this.max[dim];
    let lastBelowPos: number = this.min[dim];

    const notDim: number = dim === XDIM ? YDIM : XDIM;

    for (let direction: number = 0; direction < 2; ++direction) {
      let curr: Node | null = (direction === 0) ? this.firstAbove : this.firstBelow;

      while (curr) {
        const eventsAtSamePos: boolean =
          ((linePos === this.max[notDim]) && (linePos === curr.max[notDim])) ||
          ((linePos === this.min[notDim]) && (linePos === curr.min[notDim]));

        if (curr.max[dim] <= this.min[dim]) {
          firstAbovePos = Math.max(curr.max[dim], firstAbovePos);
        } else if (curr.min[dim] >= this.max[dim]) {
          firstBelowPos = Math.min(curr.min[dim], firstBelowPos);
        } else if (!eventsAtSamePos) {
          lastAbovePos = Math.min(curr.min[dim], lastAbovePos);
          lastBelowPos = Math.max(curr.max[dim], lastBelowPos);
        }
        curr = (direction === 0) ? curr.firstAbove : curr.firstBelow;
      }
    }

    return { firstAbovePos, firstBelowPos, lastAbovePos, lastBelowPos };
  }

  firstPointAbove(dim: number): number {
    const altDim: number = (dim + 1) % 2;
    let result: number = -Number.MAX_VALUE;
    let curr: Node | null = this.firstAbove;
    while (curr) {
      const inLineWithEdge: boolean = (this.min[altDim] === curr.min[altDim]) ||
        (this.min[altDim] === curr.max[altDim]);
      if (!inLineWithEdge && (curr.max[dim] <= this.pos)) {
        result = Math.max(curr.max[dim], result);
      }
      curr = curr.firstAbove;
    }
    return result;
  }

  firstPointBelow(dim: number): number {
    const altDim: number = (dim + 1) % 2;
    let result: number = Number.MAX_VALUE;
    let curr: Node | null = this.firstBelow;
    while (curr) {
      const inLineWithEdge: boolean = (this.min[altDim] === curr.min[altDim]) ||
        (this.min[altDim] === curr.max[altDim]);
      if (!inLineWithEdge && (curr.min[dim] >= this.pos)) {
        result = Math.min(curr.min[dim], result);
      }
      curr = curr.firstBelow;
    }
    return result;
  }

  isInsideShape(dimension: number): boolean {
    for (let curr: Node | null = this.firstBelow; curr; curr = curr.firstBelow) {
      if ((curr.min[dimension] < this.pos) && (this.pos < curr.max[dimension])) {
        return true;
      }
    }
    for (let curr: Node | null = this.firstAbove; curr; curr = curr.firstAbove) {
      if ((curr.min[dimension] < this.pos) && (this.pos < curr.max[dimension])) {
        return true;
      }
    }
    return false;
  }
}


// ===========================================================================
// Event
// ===========================================================================

export class Event {
  type: number;
  v: Node;
  pos: number;

  constructor(type: number, v: Node, pos: number) {
    this.type = type;
    this.v = v;
    this.pos = pos;
  }
}


// ===========================================================================
// compare_events  (for Array.sort)
// ===========================================================================

export function compareEvents(a: Event, b: Event): number {
  if (a.pos !== b.pos) {
    return a.pos < b.pos ? -1 : 1;
  }
  if (a.type !== b.type) {
    return a.type - b.type;
  }
  return a.v._uid - b.v._uid;
}


// ===========================================================================
// processShiftEvent  (static/private helper)
// ===========================================================================

function processShiftEvent(scanline: SortedNodeSet, e: Event, dim: number, pass: number): void {
  const v: Node = e.v;

  if (((pass === 3) && (e.type === Open)) ||
      ((pass === 3) && (e.type === SegOpen))) {
    scanline.insert(v);

    const above: Node | null = scanline.prevNode(v);
    if (above) {
      v.firstAbove = above;
      above.firstBelow = v;
    }
    const below: Node | null = scanline.nextNode(v);
    if (below) {
      v.firstBelow = below;
      below.firstAbove = v;
    }
  }

  if (((pass === 4) && (e.type === Open)) ||
      ((pass === 4) && (e.type === SegOpen)) ||
      ((pass === 1) && (e.type === SegClose)) ||
      ((pass === 1) && (e.type === Close))) {
    if (v.ss) {
      const minLimit: number = v.firstObstacleAbove(dim);
      const maxLimit: number = v.firstObstacleBelow(dim);

      v.ss.minSpaceLimit = Math.max(minLimit, v.ss.minSpaceLimit);
      v.ss.maxSpaceLimit = Math.min(maxLimit, v.ss.maxSpaceLimit);
    } else {
      v.markShiftSegmentsAbove(dim);
      v.markShiftSegmentsBelow(dim);
    }
  }

  if (((pass === 2) && (e.type === SegClose)) ||
      ((pass === 2) && (e.type === Close))) {
    const l: Node | null = v.firstAbove;
    const r: Node | null = v.firstBelow;
    if (l !== null) {
      l.firstBelow = v.firstBelow;
    }
    if (r !== null) {
      r.firstAbove = v.firstAbove;
    }

    scanline.erase(v);
  }
}


// ===========================================================================
// buildOrthogonalChannelInfo
// ===========================================================================

export function buildOrthogonalChannelInfo(router: any, dim: number, segmentList: ShiftSegment[]): void {
  if (segmentList.length === 0) {
    return;
  }

  const altDim: number = (dim + 1) % 2;
  const obstacles: any[] = router.m_obstacles;
  const n: number = obstacles.length;
  const cpn: number = segmentList.length;

  let totalEvents: number = 2 * (n + cpn);
  const events: Event[] = [];

  for (let i: number = 0; i < n; i++) {
    const obstacle: any = obstacles[i];
    if (obstacle.isJunction && !obstacle.positionFixed()) {
      totalEvents -= 2;
      continue;
    }
    const bBox: any = obstacle.routingBox();
    const minPt: any = bBox.min;
    const maxPt: any = bBox.max;
    const mid: number = minPt.dim(dim) + ((maxPt.dim(dim) - minPt.dim(dim)) / 2);
    const v: Node = Node.fromObstacle(obstacle, mid);
    events.push(new Event(Open, v, minPt.dim(altDim)));
    events.push(new Event(Close, v, maxPt.dim(altDim)));
  }

  for (let i: number = 0; i < cpn; i++) {
    const seg: ShiftSegment = segmentList[i];
    const lowPt: any = seg.lowPoint();
    const highPt: any = seg.highPoint();

    console.assert(lowPt.dim(dim) === highPt.dim(dim));
    console.assert(lowPt.dim(altDim) < highPt.dim(altDim));

    const v: Node = Node.fromShiftSegment(seg, lowPt.dim(dim));
    events.push(new Event(SegOpen, v, lowPt.dim(altDim)));
    events.push(new Event(SegClose, v, highPt.dim(altDim)));
  }

  totalEvents = events.length;
  events.sort(compareEvents);

  const scanline: SortedNodeSet = new SortedNodeSet();
  let thisPos: number = (totalEvents > 0) ? events[0].pos : 0;
  let posStartIndex: number = 0;
  let posFinishIndex: number = 0;

  for (let i: number = 0; i <= totalEvents; ++i) {
    if ((i === totalEvents) || (events[i].pos !== thisPos)) {
      posFinishIndex = i;
      for (let pass: number = 2; pass <= 4; ++pass) {
        for (let j: number = posStartIndex; j < posFinishIndex; ++j) {
          processShiftEvent(scanline, events[j], dim, pass);
        }
      }

      if (i === totalEvents) {
        break;
      }

      thisPos = events[i].pos;
      posStartIndex = i;
    }

    processShiftEvent(scanline, events[i], dim, 1);
  }

  console.assert(scanline.size() === 0);
}


// ===========================================================================
// buildConnectorRouteCheckpointCache
// ===========================================================================

export function buildConnectorRouteCheckpointCache(router: any): void {
  for (const conn of router.connRefs) {
    if (conn.routingType() !== ConnType_Orthogonal) {
      continue;
    }

    const displayRoute: any = conn.displayRoute();
    const checkpoints: any[] = conn.routingCheckpoints();

    displayRoute.checkpointsOnRoute = [];

    for (let ind: number = 0; ind < displayRoute.size(); ++ind) {
      if (ind > 0) {
        for (let cpi: number = 0; cpi < checkpoints.length; ++cpi) {
          if (pointOnLine(displayRoute.ps[ind - 1],
            displayRoute.ps[ind], checkpoints[cpi].point)) {
            displayRoute.checkpointsOnRoute.push(
              [(ind * 2) - 1, checkpoints[cpi].point]);
          }
        }
      }

      for (let cpi: number = 0; cpi < checkpoints.length; ++cpi) {
        if (displayRoute.ps[ind].equals(checkpoints[cpi].point)) {
          displayRoute.checkpointsOnRoute.push(
            [ind * 2, checkpoints[cpi].point]);
        }
      }
    }
  }
}


// ===========================================================================
// clearConnectorRouteCheckpointCache
// ===========================================================================

export function clearConnectorRouteCheckpointCache(router: any): void {
  for (const conn of router.connRefs) {
    if (conn.routingType() !== ConnType_Orthogonal) {
      continue;
    }
    const displayRoute: any = conn.displayRoute();
    displayRoute.checkpointsOnRoute = [];
  }
}
