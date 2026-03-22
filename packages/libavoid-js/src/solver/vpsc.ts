/*
 * libavoid - Fast, Incremental, Object-avoiding Line Router
 *
 * Copyright (C) 2005-2014  Monash University
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * Author(s):   Tim Dwyer
 *              Michael Wybrow
 *
 * Ported to JavaScript from the Adaptagrams C++ VPSC implementation.
 * A solver for Variable Placement with Separation Constraints.
 */

const ZERO_UPPERBOUND: number = -1e-10;
const LAGRANGIAN_TOLERANCE: number = -1e-4;

// ---------------------------------------------------------------------------
// PositionStats
// ---------------------------------------------------------------------------

class PositionStats {
    public scale: number;
    public AB: number;
    public AD: number;
    public A2: number;

    constructor() {
        this.scale = 0;
        this.AB = 0;
        this.AD = 0;
        this.A2 = 0;
    }

    addVariable(v: Variable): void {
        const ai: number = this.scale / v.scale;
        const bi: number = v.offset / v.scale;
        const wi: number = v.weight;
        this.AB += wi * ai * bi;
        this.AD += wi * ai * v.desiredPosition;
        this.A2 += wi * ai * ai;
    }
}

// ---------------------------------------------------------------------------
// Variable
// ---------------------------------------------------------------------------

class Variable {
    public id: number;
    public desiredPosition: number;
    public finalPosition: number;
    public weight: number;
    public scale: number;
    public offset: number;
    public block: Block | null;
    public visited: boolean;
    public fixedDesiredPosition: boolean;
    public in: Constraint[];
    public out: Constraint[];

    constructor(id: number, desiredPos: number = -1.0, weight: number = 1.0, scale: number = 1.0) {
        this.id = id;
        this.desiredPosition = desiredPos;
        this.finalPosition = 0;
        this.weight = weight;
        this.scale = scale;
        this.offset = 0;
        this.block = null;
        this.visited = false;
        this.fixedDesiredPosition = false;
        this.in = [];
        this.out = [];
    }

    dfdv(): number {
        return 2.0 * this.weight * (this.position() - this.desiredPosition);
    }

    position(): number {
        return (this.block!.ps.scale * this.block!.posn + this.offset) / this.scale;
    }

    unscaledPosition(): number {
        return this.block!.posn + this.offset;
    }

    toString(): string {
        if (this.block) {
            return `(${this.id}=${this.position()})`;
        }
        return `(${this.id}=${this.desiredPosition})`;
    }
}

// ---------------------------------------------------------------------------
// Constraint
// ---------------------------------------------------------------------------

class Constraint {
    public left: Variable;
    public right: Variable;
    public gap: number;
    public lm: number;
    public timeStamp: number;
    public active: boolean;
    public equality: boolean;
    public unsatisfiable: boolean;
    public needsScaling: boolean;
    public creator: any;

    constructor(left: Variable, right: Variable, gap: number, equality: boolean = false) {
        this.left = left;
        this.right = right;
        this.gap = gap;
        this.lm = 0;
        this.timeStamp = 0;
        this.active = false;
        this.equality = equality;
        this.unsatisfiable = false;
        this.needsScaling = true;
        this.creator = null;
    }

    slack(): number {
        if (this.unsatisfiable) {
            return Number.MAX_VALUE;
        }
        if (this.needsScaling) {
            return this.right.scale * this.right.position() - this.gap -
                   this.left.scale * this.left.position();
        }
        return this.right.unscaledPosition() - this.gap - this.left.unscaledPosition();
    }

    toString(): string {
        const type: string = this.equality ? '==' : '<=';
        let lscale: string = '';
        let rscale: string = '';
        if (this.left.scale !== 1) {
            lscale = `${this.left.scale}*`;
        }
        if (this.right.scale !== 1) {
            rscale = `${this.right.scale}*`;
        }
        return `Constraint: ${lscale}var(${this.left.id})+${this.gap}${type}${rscale}var(${this.right.id})`;
    }
}

// ---------------------------------------------------------------------------
// CompareConstraints  (for the priority queue / heap)
// ---------------------------------------------------------------------------

function compareConstraints(l: Constraint, r: Constraint): number {
    let sl: number;
    if (l.left.block!.timeStamp > l.timeStamp || l.left.block === l.right.block) {
        sl = -Number.MAX_VALUE;
    } else {
        sl = l.slack();
    }
    let sr: number;
    if (r.left.block!.timeStamp > r.timeStamp || r.left.block === r.right.block) {
        sr = -Number.MAX_VALUE;
    } else {
        sr = r.slack();
    }
    if (sl === sr) {
        if (l.left.id === r.left.id) {
            return l.right.id - r.right.id;
        }
        return l.left.id - r.left.id;
    }
    return sl - sr;
}

// ---------------------------------------------------------------------------
// Heap  (min-heap by slack, replaces C++ std::priority_queue)
// ---------------------------------------------------------------------------

class Heap {
    private _data: Constraint[];

    constructor() {
        this._data = [];
    }

    private _parent(i: number): number { return (i - 1) >> 1; }
    private _left(i: number): number { return 2 * i + 1; }
    private _right(i: number): number { return 2 * i + 2; }

    private _swap(i: number, j: number): void {
        const tmp: Constraint = this._data[i];
        this._data[i] = this._data[j];
        this._data[j] = tmp;
    }

    private _siftUp(i: number): void {
        while (i > 0) {
            const p: number = this._parent(i);
            if (compareConstraints(this._data[i], this._data[p]) < 0) {
                this._swap(i, p);
                i = p;
            } else {
                break;
            }
        }
    }

    private _siftDown(i: number): void {
        const n: number = this._data.length;
        while (true) {
            let smallest: number = i;
            const l: number = this._left(i);
            const r: number = this._right(i);
            if (l < n && compareConstraints(this._data[l], this._data[smallest]) < 0) {
                smallest = l;
            }
            if (r < n && compareConstraints(this._data[r], this._data[smallest]) < 0) {
                smallest = r;
            }
            if (smallest !== i) {
                this._swap(i, smallest);
                i = smallest;
            } else {
                break;
            }
        }
    }

    push(c: Constraint): void {
        this._data.push(c);
        this._siftUp(this._data.length - 1);
    }

    top(): Constraint {
        return this._data[0];
    }

    pop(): void {
        const n: number = this._data.length;
        if (n === 0) return;
        if (n === 1) {
            this._data.length = 0;
            return;
        }
        this._data[0] = this._data[n - 1];
        this._data.length = n - 1;
        this._siftDown(0);
    }

    empty(): boolean {
        return this._data.length === 0;
    }

    size(): number {
        return this._data.length;
    }
}

// ---------------------------------------------------------------------------
// UnsatisfiableException
// ---------------------------------------------------------------------------

class UnsatisfiableException extends Error {
    public path: Constraint[];

    constructor() {
        super('UnsatisfiableException');
        this.path = [];
    }
}

// ---------------------------------------------------------------------------
// Block
// ---------------------------------------------------------------------------

class Block {
    public vars: Variable[];
    public posn: number;
    public ps: PositionStats;
    public deleted: boolean;
    public timeStamp: number;
    public in: Heap | null;
    public out: Heap | null;
    public blocks: Blocks;

    constructor(blocks: Blocks, v: Variable | null = null) {
        this.vars = [];
        this.posn = 0;
        this.ps = new PositionStats();
        this.deleted = false;
        this.timeStamp = 0;
        this.in = null;
        this.out = null;
        this.blocks = blocks;

        if (v !== null) {
            v.offset = 0;
            this._addVariable(v);
        }
    }

    // ---- private helpers ----

    private _addVariable(v: Variable): void {
        v.block = this;
        this.vars.push(v);
        if (this.ps.A2 === 0) {
            this.ps.scale = v.scale;
        }
        this.ps.addVariable(v);
        this.posn = (this.ps.AD - this.ps.AB) / this.ps.A2;
    }

    private _canFollowLeft(c: Constraint, last: Variable | null): boolean {
        return c.left.block === this && c.active && last !== c.left;
    }

    private _canFollowRight(c: Constraint, last: Variable | null): boolean {
        return c.right.block === this && c.active && last !== c.right;
    }

    private _compute_dfdv_minlm(
        v: Variable,
        u: Variable | null,
        result: { min_lm: Constraint | null },
    ): number {
        let dfdv: number = v.dfdv();
        for (let i = 0; i < v.out.length; i++) {
            const c: Constraint = v.out[i];
            if (this._canFollowRight(c, u)) {
                c.lm = this._compute_dfdv_minlm(c.right, v, result);
                dfdv += c.lm * c.left.scale;
                if (!c.equality && (result.min_lm === null || c.lm < result.min_lm.lm)) {
                    result.min_lm = c;
                }
            }
        }
        for (let i = 0; i < v.in.length; i++) {
            const c: Constraint = v.in[i];
            if (this._canFollowLeft(c, u)) {
                c.lm = -this._compute_dfdv_minlm(c.left, v, result);
                dfdv -= c.lm * c.right.scale;
                if (!c.equality && (result.min_lm === null || c.lm < result.min_lm.lm)) {
                    result.min_lm = c;
                }
            }
        }
        return dfdv / v.scale;
    }

    private _compute_dfdv(v: Variable, u: Variable | null): number {
        let dfdv: number = v.dfdv();
        for (let i = 0; i < v.out.length; i++) {
            const c: Constraint = v.out[i];
            if (this._canFollowRight(c, u)) {
                c.lm = this._compute_dfdv(c.right, v);
                dfdv += c.lm * c.left.scale;
            }
        }
        for (let i = 0; i < v.in.length; i++) {
            const c: Constraint = v.in[i];
            if (this._canFollowLeft(c, u)) {
                c.lm = -this._compute_dfdv(c.left, v);
                dfdv -= c.lm * c.right.scale;
            }
        }
        return dfdv / v.scale;
    }

    private _reset_active_lm(v: Variable, u: Variable | null): void {
        for (let i = 0; i < v.out.length; i++) {
            const c: Constraint = v.out[i];
            if (this._canFollowRight(c, u)) {
                c.lm = 0;
                this._reset_active_lm(c.right, v);
            }
        }
        for (let i = 0; i < v.in.length; i++) {
            const c: Constraint = v.in[i];
            if (this._canFollowLeft(c, u)) {
                c.lm = 0;
                this._reset_active_lm(c.left, v);
            }
        }
    }

    private _split_path(
        r: Variable,
        v: Variable,
        u: Variable | null,
        result: { min_lm: Constraint | null },
        desperation: boolean = false,
    ): boolean {
        for (let i = 0; i < v.in.length; i++) {
            const c: Constraint = v.in[i];
            if (this._canFollowLeft(c, u)) {
                if (c.left === r) {
                    if (desperation && !c.equality) result.min_lm = c;
                    return true;
                } else {
                    if (this._split_path(r, c.left, v, result, desperation)) {
                        if (desperation && !c.equality && (!result.min_lm || c.lm < result.min_lm.lm)) {
                            result.min_lm = c;
                        }
                        return true;
                    }
                }
            }
        }
        for (let i = 0; i < v.out.length; i++) {
            const c: Constraint = v.out[i];
            if (this._canFollowRight(c, u)) {
                if (c.right === r) {
                    if (!c.equality) result.min_lm = c;
                    return true;
                } else {
                    if (this._split_path(r, c.right, v, result, desperation)) {
                        if (!c.equality && (!result.min_lm || c.lm < result.min_lm.lm)) {
                            result.min_lm = c;
                        }
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private _populateSplitBlock(b: Block, v: Variable, u: Variable | null): void {
        b._addVariable(v);
        for (let i = 0; i < v.in.length; i++) {
            const c: Constraint = v.in[i];
            if (this._canFollowLeft(c, u)) {
                this._populateSplitBlock(b, c.left, v);
            }
        }
        for (let i = 0; i < v.out.length; i++) {
            const c: Constraint = v.out[i];
            if (this._canFollowRight(c, u)) {
                this._populateSplitBlock(b, c.right, v);
            }
        }
    }

    private _setUpConstraintHeap(isIn: boolean): Heap {
        const h: Heap = new Heap();
        for (let i = 0; i < this.vars.length; i++) {
            const v: Variable = this.vars[i];
            const cs: Constraint[] = isIn ? v.in : v.out;
            for (let j = 0; j < cs.length; j++) {
                const c: Constraint = cs[j];
                c.timeStamp = this.blocks.blockTimeCtr;
                if ((c.left.block !== this && isIn) ||
                    (c.right.block !== this && !isIn)) {
                    h.push(c);
                }
            }
        }
        return h;
    }

    // ---- public methods ----

    updateWeightedPosition(): void {
        this.ps.AB = 0;
        this.ps.AD = 0;
        this.ps.A2 = 0;
        for (let i = 0; i < this.vars.length; i++) {
            this.ps.addVariable(this.vars[i]);
        }
        this.posn = (this.ps.AD - this.ps.AB) / this.ps.A2;
    }

    setUpInConstraints(): void {
        this.in = this._setUpConstraintHeap(true);
    }

    setUpOutConstraints(): void {
        this.out = this._setUpConstraintHeap(false);
    }

    findMinInConstraint(): Constraint | null {
        let v: Constraint | null = null;
        const outOfDate: Constraint[] = [];
        while (!this.in!.empty()) {
            v = this.in!.top();
            const lb: Block = v.left.block!;
            const rb: Block = v.right.block!;
            if (lb === rb) {
                this.in!.pop();
            } else if (v.timeStamp < lb.timeStamp) {
                this.in!.pop();
                outOfDate.push(v);
            } else {
                break;
            }
        }
        for (let i = 0; i < outOfDate.length; i++) {
            const c: Constraint = outOfDate[i];
            c.timeStamp = this.blocks.blockTimeCtr;
            this.in!.push(c);
        }
        if (this.in!.empty()) {
            v = null;
        } else {
            v = this.in!.top();
        }
        return v;
    }

    findMinOutConstraint(): Constraint | null {
        if (this.out!.empty()) return null;
        let v: Constraint = this.out!.top();
        while (v.left.block === v.right.block) {
            this.out!.pop();
            if (this.out!.empty()) return null;
            v = this.out!.top();
        }
        return v;
    }

    deleteMinInConstraint(): void {
        this.in!.pop();
    }

    deleteMinOutConstraint(): void {
        this.out!.pop();
    }

    findMinLM(): Constraint | null {
        const result: { min_lm: Constraint | null } = { min_lm: null };
        this._reset_active_lm(this.vars[0], null);
        this._compute_dfdv_minlm(this.vars[0], null, result);
        return result.min_lm;
    }

    findMinLMBetween(lv: Variable, rv: Variable): Constraint | null {
        this._reset_active_lm(this.vars[0], null);
        this._compute_dfdv(this.vars[0], null);
        const result: { min_lm: Constraint | null } = { min_lm: null };
        this._split_path(rv, lv, null, result);
        if (result.min_lm === null) {
            const e: UnsatisfiableException = new UnsatisfiableException();
            this.getActivePathBetween(e.path, lv, rv, null);
            throw e;
        }
        return result.min_lm;
    }

    mergeBlock(b: Block, c: Constraint): Block {
        const dist: number = c.right.offset - c.left.offset - c.gap;
        const l: Block = c.left.block!;
        const r: Block = c.right.block!;
        if (l.vars.length < r.vars.length) {
            r.mergeWith(l, c, dist);
        } else {
            l.mergeWith(r, c, -dist);
        }
        const result: Block = b.deleted ? this : b;
        return result;
    }

    mergeWith(b: Block, c: Constraint, dist: number): void {
        c.active = true;
        for (let i = 0; i < b.vars.length; i++) {
            const v: Variable = b.vars[i];
            v.offset += dist;
            this._addVariable(v);
        }
        this.posn = (this.ps.AD - this.ps.AB) / this.ps.A2;
        b.deleted = true;
    }

    mergeIn(b: Block): void {
        this.findMinInConstraint();
        b.findMinInConstraint();
        while (!b.in!.empty()) {
            this.in!.push(b.in!.top());
            b.in!.pop();
        }
    }

    mergeOut(b: Block): void {
        this.findMinOutConstraint();
        b.findMinOutConstraint();
        while (!b.out!.empty()) {
            this.out!.push(b.out!.top());
            b.out!.pop();
        }
    }

    split(c: Constraint): { l: Block; r: Block } {
        c.active = false;
        const l: Block = new Block(this.blocks);
        this._populateSplitBlock(l, c.left, c.right);
        const r: Block = new Block(this.blocks);
        this._populateSplitBlock(r, c.right, c.left);
        return { l, r };
    }

    splitBetween(
        vl: Variable,
        vr: Variable,
    ): { splitConstraint: Constraint | null; lb: Block | null; rb: Block | null } {
        const c: Constraint | null = this.findMinLMBetween(vl, vr);
        let lb: Block | null = null;
        let rb: Block | null = null;
        if (c !== null) {
            const result: { l: Block; r: Block } = this.split(c);
            lb = result.l;
            rb = result.r;
            this.deleted = true;
        }
        return { splitConstraint: c, lb, rb };
    }

    getActivePathBetween(path: Constraint[], u: Variable, v: Variable, w: Variable | null): boolean {
        if (u === v) return true;
        for (let i = 0; i < u.in.length; i++) {
            const c: Constraint = u.in[i];
            if (this._canFollowLeft(c, w)) {
                if (this.getActivePathBetween(path, c.left, v, u)) {
                    path.push(c);
                    return true;
                }
            }
        }
        for (let i = 0; i < u.out.length; i++) {
            const c: Constraint = u.out[i];
            if (this._canFollowRight(c, w)) {
                if (this.getActivePathBetween(path, c.right, v, u)) {
                    path.push(c);
                    return true;
                }
            }
        }
        return false;
    }

    isActiveDirectedPathBetween(u: Variable, v: Variable): boolean {
        if (u === v) return true;
        for (let i = 0; i < u.out.length; i++) {
            const c: Constraint = u.out[i];
            if (this._canFollowRight(c, null)) {
                if (this.isActiveDirectedPathBetween(c.right, v)) {
                    return true;
                }
            }
        }
        return false;
    }

    getActiveDirectedPathBetween(path: Constraint[], u: Variable, v: Variable): boolean {
        if (u === v) return true;
        for (let i = 0; i < u.out.length; i++) {
            const c: Constraint = u.out[i];
            if (this._canFollowRight(c, null)) {
                if (this.getActiveDirectedPathBetween(path, c.right, v)) {
                    path.push(c);
                    return true;
                }
            }
        }
        return false;
    }

    cost(): number {
        let c: number = 0;
        for (let i = 0; i < this.vars.length; i++) {
            const v: Variable = this.vars[i];
            const diff: number = v.position() - v.desiredPosition;
            c += v.weight * diff * diff;
        }
        return c;
    }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

class Blocks {
    public vs: Variable[];
    public nvs: number;
    public blockTimeCtr: number;
    private _blocks: Block[];

    constructor(vs: Variable[]) {
        this.vs = vs;
        this.nvs = vs.length;
        this.blockTimeCtr = 0;
        this._blocks = new Array<Block>(this.nvs);
        for (let i = 0; i < this.nvs; i++) {
            this._blocks[i] = new Block(this, vs[i]);
        }
    }

    size(): number {
        return this._blocks.length;
    }

    at(index: number): Block {
        return this._blocks[index];
    }

    insert(block: Block): void {
        this._blocks.push(block);
    }

    private _removeBlock(doomed: Block): void {
        doomed.deleted = true;
    }

    cleanup(): void {
        let i: number = 0;
        const length: number = this._blocks.length;
        for (let j = 0; j < length; j++) {
            if (this._blocks[j].deleted) {
                // skip deleted block
            } else {
                if (j > i) {
                    this._blocks[i] = this._blocks[j];
                }
                i++;
            }
        }
        this._blocks.length = i;
    }

    cost(): number {
        let c: number = 0;
        for (let i = 0; i < this._blocks.length; i++) {
            c += this._blocks[i].cost();
        }
        return c;
    }

    totalOrder(): Variable[] {
        const order: Variable[] = [];
        for (let i = 0; i < this.nvs; i++) {
            this.vs[i].visited = false;
        }
        for (let i = 0; i < this.nvs; i++) {
            if (this.vs[i].in.length === 0) {
                this._dfsVisit(this.vs[i], order);
            }
        }
        return order;
    }

    private _dfsVisit(v: Variable, order: Variable[]): void {
        v.visited = true;
        for (let i = 0; i < v.out.length; i++) {
            const c: Constraint = v.out[i];
            if (!c.right.visited) {
                this._dfsVisit(c.right, order);
            }
        }
        order.unshift(v);
    }

    mergeLeft(r: Block): void {
        r.timeStamp = ++this.blockTimeCtr;
        r.setUpInConstraints();
        let c: Constraint | null = r.findMinInConstraint();
        while (c !== null && c.slack() < 0) {
            r.deleteMinInConstraint();
            let l: Block = c.left.block!;
            if (l.in === null) l.setUpInConstraints();
            let dist: number = c.right.offset - c.left.offset - c.gap;
            if (r.vars.length < l.vars.length) {
                dist = -dist;
                const tmp: Block = l; l = r; r = tmp;
            }
            this.blockTimeCtr++;
            r.mergeWith(l, c, dist);
            r.mergeIn(l);
            r.timeStamp = this.blockTimeCtr;
            this._removeBlock(l);
            c = r.findMinInConstraint();
        }
    }

    mergeRight(l: Block): void {
        l.setUpOutConstraints();
        let c: Constraint | null = l.findMinOutConstraint();
        while (c !== null && c.slack() < 0) {
            l.deleteMinOutConstraint();
            let r: Block = c.right.block!;
            r.setUpOutConstraints();
            let dist: number = c.left.offset + c.gap - c.right.offset;
            if (l.vars.length > r.vars.length) {
                dist = -dist;
                const tmp: Block = l; l = r; r = tmp;
            }
            l.mergeWith(r, c, dist);
            l.mergeOut(r);
            this._removeBlock(r);
            c = l.findMinOutConstraint();
        }
    }

    splitBlock(b: Block, c: Constraint): { l: Block; r: Block } {
        const result: { l: Block; r: Block } = b.split(c);
        let l: Block = result.l;
        let r: Block = result.r;
        this._blocks.push(l);
        this._blocks.push(r);
        r.posn = b.posn;
        this.mergeLeft(l);
        // r may have been merged
        r = c.right.block!;
        r.updateWeightedPosition();
        this.mergeRight(r);
        this._removeBlock(b);
        return { l, r };
    }
}

// ---------------------------------------------------------------------------
// EqualityConstraintSet (helper for constraintsRemovingRedundantEqualities)
// ---------------------------------------------------------------------------

class EqualityConstraintSet {
    private _groups: Map<Variable, number>[];

    constructor(vs: Variable[]) {
        this._groups = [];
        for (let i = 0; i < vs.length; i++) {
            const m: Map<Variable, number> = new Map();
            m.set(vs[i], 0);
            this._groups.push(m);
        }
    }

    private _groupIndexForVar(v: Variable): number {
        for (let i = 0; i < this._groups.length; i++) {
            if (this._groups[i].has(v)) return i;
        }
        return -1;
    }

    isRedundant(lhs: Variable, rhs: Variable, sep: number): boolean {
        const li: number = this._groupIndexForVar(lhs);
        const ri: number = this._groupIndexForVar(rhs);
        if (li === ri && li !== -1) {
            if (Math.abs((this._groups[li].get(lhs)! + sep) - this._groups[ri].get(rhs)!) < 0.0001) {
                return true;
            }
        }
        return false;
    }

    mergeSets(lhs: Variable, rhs: Variable, sep: number): void {
        const li: number = this._groupIndexForVar(lhs);
        const ri: number = this._groupIndexForVar(rhs);
        if (li === ri) return;

        const lhsGroup: Map<Variable, number> = this._groups[li];
        const rhsGroup: Map<Variable, number> = this._groups[ri];

        const rhsOldOffset: number = rhsGroup.get(rhs)!;
        const rhsNewOffset: number = lhsGroup.get(lhs)! + sep;
        const offset: number = rhsNewOffset - rhsOldOffset;

        for (const [key, val] of rhsGroup) {
            rhsGroup.set(key, val + offset);
        }

        // Merge rhsGroup into lhsGroup
        for (const [key, val] of rhsGroup) {
            lhsGroup.set(key, val);
        }
        // Remove rhsGroup
        this._groups.splice(ri, 1);
    }
}

// ---------------------------------------------------------------------------
// constraintsRemovingRedundantEqualities
// ---------------------------------------------------------------------------

function constraintsRemovingRedundantEqualities(
    vars: Variable[],
    constraints: Constraint[],
): Constraint[] {
    const equalitySets: EqualityConstraintSet = new EqualityConstraintSet(vars);
    const cs: Constraint[] = [];
    for (let i = 0; i < constraints.length; i++) {
        const c: Constraint = constraints[i];
        if (c.equality) {
            if (!equalitySets.isRedundant(c.left, c.right, c.gap)) {
                equalitySets.mergeSets(c.left, c.right, c.gap);
                cs.push(c);
            }
        } else {
            cs.push(c);
        }
    }
    return cs;
}

// ---------------------------------------------------------------------------
// IncSolver
// ---------------------------------------------------------------------------

class IncSolver {
    public vs: Variable[];
    public cs: Constraint[];
    public n: number;
    public m: number;
    public needsScaling: boolean;
    public splitCnt: number;
    public inactive: Constraint[];
    public violated: Constraint[];
    private bs: Blocks;

    constructor(vs: Variable[], cs: Constraint[]) {
        this.vs = vs;
        this.cs = cs;
        this.n = vs.length;
        this.m = cs.length;
        this.needsScaling = false;
        this.splitCnt = 0;
        this.inactive = [];
        this.violated = [];

        for (let i = 0; i < this.n; i++) {
            vs[i].in = [];
            vs[i].out = [];
            this.needsScaling = this.needsScaling || (vs[i].scale !== 1);
        }
        for (let i = 0; i < this.m; i++) {
            const c: Constraint = cs[i];
            c.left.out.push(c);
            c.right.in.push(c);
            c.needsScaling = this.needsScaling;
        }

        this.bs = new Blocks(vs);

        // All constraints start inactive
        this.inactive = cs.slice();
        for (let i = 0; i < this.inactive.length; i++) {
            this.inactive[i].active = false;
        }
    }

    addConstraint(c: Constraint): void {
        this.m++;
        c.active = false;
        this.inactive.push(c);
        c.left.out.push(c);
        c.right.in.push(c);
        c.needsScaling = this.needsScaling;
    }

    private _copyResult(): void {
        for (let i = 0; i < this.vs.length; i++) {
            const v: Variable = this.vs[i];
            v.finalPosition = v.position();
        }
    }

    private _mostViolated(list: Constraint[]): Constraint | null {
        let slackForMostViolated: number = Number.MAX_VALUE;
        let mostViolatedConstraint: Constraint | null = null;
        let deleteIndex: number = list.length;
        for (let index = 0; index < list.length; index++) {
            const constraint: Constraint = list[index];
            const s: number = constraint.slack();
            if (constraint.equality || s < slackForMostViolated) {
                slackForMostViolated = s;
                mostViolatedConstraint = constraint;
                deleteIndex = index;
                if (constraint.equality) {
                    break;
                }
            }
        }
        // Remove from inactive list using swap-and-pop
        if (deleteIndex < list.length &&
            ((slackForMostViolated < ZERO_UPPERBOUND && !mostViolatedConstraint!.active) ||
             mostViolatedConstraint!.equality)) {
            list[deleteIndex] = list[list.length - 1];
            list.length = list.length - 1;
        }
        return mostViolatedConstraint;
    }

    moveBlocks(): void {
        const length: number = this.bs.size();
        for (let i = 0; i < length; i++) {
            this.bs.at(i).updateWeightedPosition();
        }
    }

    splitBlocks(): void {
        this.moveBlocks();
        this.splitCnt = 0;
        const length: number = this.bs.size();
        for (let i = 0; i < length; i++) {
            const b: Block = this.bs.at(i);
            const v: Constraint | null = b.findMinLM();
            if (v !== null && v.lm < LAGRANGIAN_TOLERANCE) {
                this.splitCnt++;
                const block: Block = v.left.block!;
                const result: { l: Block; r: Block } = block.split(v);
                const l: Block = result.l;
                const r: Block = result.r;
                l.updateWeightedPosition();
                r.updateWeightedPosition();
                this.bs.insert(l);
                this.bs.insert(r);
                block.deleted = true;
                this.inactive.push(v);
            }
        }
        this.bs.cleanup();
    }

    satisfy(): boolean {
        this.splitBlocks();
        let v: Constraint | null = null;
        while ((v = this._mostViolated(this.inactive)) &&
               (v.equality || (v.slack() < ZERO_UPPERBOUND && !v.active))) {
            const lb: Block = v.left.block!;
            const rb: Block = v.right.block!;
            if (lb !== rb) {
                lb.mergeBlock(rb, v);
            } else {
                if (lb.isActiveDirectedPathBetween(v.right, v.left)) {
                    v.unsatisfiable = true;
                    continue;
                }
                try {
                    const splitResult: {
                        splitConstraint: Constraint | null;
                        lb: Block | null;
                        rb: Block | null;
                    } = lb.splitBetween(v.left, v.right);
                    const splitConstraint: Constraint | null = splitResult.splitConstraint;
                    const newLb: Block | null = splitResult.lb;
                    const newRb: Block | null = splitResult.rb;

                    if (splitConstraint !== null) {
                        if (!splitConstraint.active) {
                            this.inactive.push(splitConstraint);
                        }
                    } else {
                        v.unsatisfiable = true;
                        continue;
                    }

                    if (v.slack() >= 0) {
                        this.inactive.push(v);
                        this.bs.insert(newLb!);
                        this.bs.insert(newRb!);
                    } else {
                        this.bs.insert(newLb!.mergeBlock(newRb!, v));
                    }
                } catch (e) {
                    if (e instanceof UnsatisfiableException) {
                        e.path.push(v);
                        v.unsatisfiable = true;
                        continue;
                    }
                    throw e;
                }
            }
        }
        this.bs.cleanup();

        let activeConstraints: boolean = false;
        for (let i = 0; i < this.m; i++) {
            const c: Constraint = this.cs[i];
            if (c.active) activeConstraints = true;
            if (c.slack() < ZERO_UPPERBOUND) {
                throw new Error(`Unsatisfied constraint: ${c.toString()}`);
            }
        }
        this._copyResult();
        return activeConstraints;
    }

    solve(): boolean {
        this.satisfy();
        let lastcost: number = Number.MAX_VALUE;
        let currentCost: number = this.bs.cost();
        while (Math.abs(lastcost - currentCost) > 0.0001) {
            this.satisfy();
            lastcost = currentCost;
            currentCost = this.bs.cost();
        }
        this._copyResult();
        return this.bs.size() !== this.n;
    }

    getVariables(): Variable[] {
        return this.vs;
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Variable, Constraint, IncSolver, constraintsRemovingRedundantEqualities };
