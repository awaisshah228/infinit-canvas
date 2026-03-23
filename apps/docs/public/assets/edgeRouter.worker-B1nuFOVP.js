var z = 160, B = 60, X = 20, tr = 12, q = 20;
function er(r, e, u) {
  var i = r.width || r.measured && r.measured.width || z, a = r.height || r.measured && r.measured.height || B, t = r._absolutePosition || r.position;
  if (r.handles && r.handles.length > 0)
    for (var f = 0; f < r.handles.length; f++) {
      var n = r.handles[f];
      if (n.type === e && (!u || n.id === u)) {
        if (n.x !== void 0 && n.y !== void 0)
          return { x: t.x + n.x, y: t.y + n.y, dir: n.position || (e === "source" ? "right" : "left") };
        var o = n.position || (e === "source" ? "right" : "left");
        switch (o) {
          case "top":
            return { x: t.x + i / 2, y: t.y, dir: "top" };
          case "bottom":
            return { x: t.x + i / 2, y: t.y + a, dir: "bottom" };
          case "left":
            return { x: t.x, y: t.y + a / 2, dir: "left" };
          default:
            return { x: t.x + i, y: t.y + a / 2, dir: "right" };
        }
      }
    }
  return e === "source" ? { x: t.x + i, y: t.y + a / 2, dir: "right" } : { x: t.x, y: t.y + a / 2, dir: "left" };
}
function J(r, e) {
  switch (r.dir) {
    case "right":
      return { x: r.x + e, y: r.y, dir: r.dir };
    case "left":
      return { x: r.x - e, y: r.y, dir: r.dir };
    case "bottom":
      return { x: r.x, y: r.y + e, dir: r.dir };
    case "top":
      return { x: r.x, y: r.y - e, dir: r.dir };
    default:
      return { x: r.x + e, y: r.y, dir: r.dir };
  }
}
function sr(r, e, u, i, a, t, f, n) {
  var o = Math.min(r, u), v = Math.max(r, u), s = Math.min(e, i), m = Math.max(e, i);
  if (v <= a || o >= a + f || m <= t || s >= t + n) return !1;
  var d = 0.5;
  if (r > a + d && r < a + f - d && e > t + d && e < t + n - d || u > a + d && u < a + f - d && i > t + d && i < t + n - d) return !0;
  var h = (r + u) / 2, g = (e + i) / 2;
  if (h > a + d && h < a + f - d && g > t + d && g < t + n - d) return !0;
  for (var l = [[a, t], [a + f, t], [a + f, t + n], [a, t + n]], y = 0; y < 4; y++)
    if (dr(r, e, u, i, l[y][0], l[y][1], l[(y + 1) % 4][0], l[(y + 1) % 4][1])) return !0;
  return !1;
}
function dr(r, e, u, i, a, t, f, n) {
  var o = (f - a) * (e - t) - (n - t) * (r - a), v = (f - a) * (i - t) - (n - t) * (u - a), s = (u - r) * (t - e) - (i - e) * (a - r), m = (u - r) * (n - e) - (i - e) * (f - r);
  return (o > 0 && v < 0 || o < 0 && v > 0) && (s > 0 && m < 0 || s < 0 && m > 0);
}
function V(r, e, u, i, a) {
  for (var t = 0; t < a.length; t++) {
    var f = a[t];
    if (sr(r, e, u, i, f.x, f.y, f.w, f.h)) return !1;
  }
  return !0;
}
function lr(r, e, u) {
  for (var i = 0; i < u.length; i++) {
    var a = u[i];
    if (r > a.x && r < a.x + a.w && e > a.y && e < a.y + a.h) return !0;
  }
  return !1;
}
function ar(r, e) {
  for (var u = [], i = 0; i < r.length; i++) {
    var a = r[i];
    if (!(a.hidden || e && e.has(a.id)) && a.type !== "group") {
      var t = a._absolutePosition || a.position, f = a.width || a.measured && a.measured.width || z, n = a.height || a.measured && a.measured.height || B;
      u.push({
        id: a.id,
        x: t.x - X,
        y: t.y - X,
        w: f + 2 * X,
        h: n + 2 * X
      });
    }
  }
  return u;
}
function nr(r, e, u) {
  if (V(r.x, r.y, e.x, e.y, u))
    return null;
  var i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set();
  i.add(r.x), i.add(e.x), a.add(r.y), a.add(e.y);
  var t = X + 5;
  r.dir === "right" ? i.add(r.x + t) : r.dir === "left" ? i.add(r.x - t) : r.dir === "top" ? a.add(r.y - t) : r.dir === "bottom" && a.add(r.y + t), e.dir === "right" ? i.add(e.x + t) : e.dir === "left" ? i.add(e.x - t) : e.dir === "top" ? a.add(e.y - t) : e.dir === "bottom" && a.add(e.y + t);
  for (var f = 0; f < u.length; f++) {
    var n = u[f];
    i.add(n.x), i.add(n.x + n.w), a.add(n.y), a.add(n.y + n.h);
  }
  for (var o = Array.from(i).sort(function(F, T) {
    return F - T;
  }), v = Array.from(a).sort(function(F, T) {
    return F - T;
  }), s = /* @__PURE__ */ new Map(), m = /* @__PURE__ */ new Map(), d = 0; d < o.length; d++) s.set(o[d], d);
  for (var h = 0; h < v.length; h++) m.set(v[h], h);
  var g = o.length, l = v.length, y = function(F, T) {
    return T * g + F;
  }, O = s.get(r.x), A = m.get(r.y), c = s.get(e.x), w = m.get(e.y);
  if (O === void 0 || A === void 0 || c === void 0 || w === void 0) return null;
  var M = y(O, A), x = y(c, w), b = new Float64Array(g * l).fill(1 / 0), P = new Float64Array(g * l).fill(1 / 0), E = new Int32Array(g * l).fill(-1), N = new Int8Array(g * l).fill(-1), _ = new Uint8Array(g * l);
  b[M] = 0, P[M] = Math.abs(o[c] - r.x) + Math.abs(v[w] - r.y);
  for (var p = [M], ir = 15, W = [[1, 0], [-1, 0], [0, 1], [0, -1]]; p.length > 0; ) {
    for (var G = 0, Y = 1; Y < p.length; Y++)
      P[p[Y]] < P[p[G]] && (G = Y);
    var S = p[G];
    if (p[G] = p[p.length - 1], p.pop(), S === x) {
      for (var Q = [], D = x; D !== -1 && D !== M; ) {
        var ur = D / g | 0, fr = D % g;
        Q.unshift({ x: o[fr], y: v[ur] }), D = E[D];
      }
      return Q.unshift({ x: r.x, y: r.y }), hr(Q, u);
    }
    if (!_[S]) {
      _[S] = 1;
      for (var Z = S / g | 0, $ = S % g, K = o[$], k = v[Z], rr = N[S], H = 0; H < 4; H++) {
        var L = $ + W[H][0], C = Z + W[H][1];
        if (!(L < 0 || L >= g || C < 0 || C >= l)) {
          var I = y(L, C);
          if (!_[I]) {
            var U = o[L], j = v[C];
            if (!lr(U, j, u) && V(K, k, U, j, u)) {
              var vr = Math.abs(U - K) + Math.abs(j - k), or = rr >= 0 && rr !== H ? ir : 0, R = b[S] + vr + or;
              R < b[I] && (E[I] = S, N[I] = H, b[I] = R, P[I] = R + Math.abs(o[c] - U) + Math.abs(v[w] - j), p.push(I));
            }
          }
        }
      }
    }
  }
  return null;
}
function hr(r, e) {
  if (!r || r.length <= 2) return r;
  for (var u = [r[0]], i = 1; i < r.length - 1; i++) {
    var a = u[u.length - 1], t = r[i], f = r[i + 1], n = Math.abs(a.x - t.x) < 0.5 && Math.abs(t.x - f.x) < 0.5, o = Math.abs(a.y - t.y) < 0.5 && Math.abs(t.y - f.y) < 0.5;
    (n || o) && V(a.x, a.y, f.x, f.y, e) || u.push(t);
  }
  return u.push(r[r.length - 1]), u;
}
function gr(r) {
  for (var e = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Map(), i = 0; i < r.length; i++) {
    var a = r[i], t = a._routedPoints;
    if (!(!t || t.length < 2))
      for (var f = 0; f < t.length - 1; f++) {
        var n = t[f], o = t[f + 1];
        if (Math.abs(n.y - o.y) < 0.5) {
          var v = Math.round(n.y * 10) / 10;
          e.has(v) || e.set(v, []), e.get(v).push({ edgeId: a.id, segIdx: f, x1: Math.min(n.x, o.x), x2: Math.max(n.x, o.x) });
        } else if (Math.abs(n.x - o.x) < 0.5) {
          var s = Math.round(n.x * 10) / 10;
          u.has(s) || u.set(s, []), u.get(s).push({ edgeId: a.id, segIdx: f, y1: Math.min(n.y, o.y), y2: Math.max(n.y, o.y) });
        }
      }
  }
  for (var m = /* @__PURE__ */ new Map(), d = 0; d < r.length; d++) {
    var h = r[d];
    h._routedPoints && m.set(h.id, h._routedPoints.map(function(l) {
      return { x: l.x, y: l.y };
    }));
  }
  function g(l, y, O, A) {
    for (var [, c] of l)
      if (!(c.length < 2))
        for (var w = yr(c, O, A), M = 0; M < w.length; M++) {
          var x = w[M];
          if (!(x.length < 2))
            for (var b = (x.length - 1) * tr / 2, P = 0; P < x.length; P++) {
              var E = x[P], N = -b + P * tr, _ = m.get(E.edgeId);
              _ && (_[E.segIdx][y] += N, _[E.segIdx + 1][y] += N);
            }
        }
  }
  return g(e, "y", "x1", "x2"), g(u, "x", "y1", "y2"), r.map(function(l) {
    var y = m.get(l.id);
    return y ? Object.assign({}, l, { _routedPoints: y }) : l;
  });
}
function yr(r, e, u) {
  if (r.length < 2) return [];
  for (var i = r.slice().sort(function(o, v) {
    return o[e] - v[e];
  }), a = [], t = [i[0]], f = 1; f < i.length; f++) {
    var n = t[t.length - 1];
    i[f][e] < n[u] ? t.push(i[f]) : (t.length > 1 && a.push(t), t = [i[f]]);
  }
  return t.length > 1 && a.push(t), a;
}
function mr(r, e) {
  if (!r || !e || r.length === 0 || e.length === 0) return e;
  for (var u = {}, i = 0; i < r.length; i++) u[r[i].id] = r[i];
  var a = ar(r, null), t = 5, f = e.map(function(n) {
    var o = n.type || "default";
    if (o === "bezier" || o === "simplebezier" || o === "default") return n;
    var v = u[n.source], s = u[n.target];
    if (!v || !s || v.hidden || s.hidden) return n;
    var m = er(v, "source", n.sourceHandle), d = er(s, "target", n.targetHandle), h = J(m, q), g = J(d, q), l = a.filter(function(b) {
      return b.id !== n.source && b.id !== n.target;
    }), y = v._absolutePosition || v.position, O = v.width || v.measured && v.measured.width || z, A = v.height || v.measured && v.measured.height || B;
    l.push({ id: n.source, x: y.x - t, y: y.y - t, w: O + 2 * t, h: A + 2 * t });
    var c = s._absolutePosition || s.position, w = s.width || s.measured && s.measured.width || z, M = s.height || s.measured && s.measured.height || B;
    if (l.push({ id: n.target, x: c.x - t, y: c.y - t, w: w + 2 * t, h: M + 2 * t }), l.length === 0) return n;
    var x = nr(h, g, l);
    return x && x.length >= 2 ? (x.unshift({ x: m.x, y: m.y }), x.push({ x: d.x, y: d.y }), Object.assign({}, n, { _routedPoints: x })) : n;
  });
  return gr(f);
}
function xr(r, e, u, i, a, t, f, n) {
  var o = ar(f, n ? new Set(n) : null);
  if (o.length === 0) return null;
  var v = { x: r, y: e, dir: a || "right" }, s = { x: u, y: i, dir: t || "left" }, m = J(v, q), d = J(s, q), h = nr(m, d, o);
  return h && h.length >= 2 ? (h.unshift({ x: v.x, y: v.y }), h.push({ x: s.x, y: s.y }), h) : null;
}
self.onmessage = function(r) {
  var e = r.data;
  if (e.type === "route") {
    var u = mr(e.nodes, e.edges);
    self.postMessage({ type: "routed", id: e.id, edges: u });
  } else if (e.type === "routeSingle") {
    var i = xr(
      e.fromX,
      e.fromY,
      e.toX,
      e.toY,
      e.fromDir,
      e.toDir,
      e.nodes,
      e.excludeNodeIds
    );
    self.postMessage({ type: "routedSingle", id: e.id, points: i });
  }
};
