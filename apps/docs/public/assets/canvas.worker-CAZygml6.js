var Ma = null, r = null, tr = 0, er = 0, g = { x: 0, y: 0, zoom: 1 }, O = [], B = [], P = [], G = !1, Ht = 40, Dt = !1, Br = "lines", Or = 1, lt = null, Pa = null, hr = null, E = 160, c = 60, ft = 8, ao = 5;
function h(a) {
  return a._absolutePosition || a.position;
}
function Vo(a, t, e, o, v) {
  if (a.x !== void 0 && a.y !== void 0)
    return { x: t + a.x, y: e + a.y };
  var f = a.position || (a.type === "source" ? "right" : "left");
  switch (f) {
    case "top":
      return { x: t + o / 2, y: e };
    case "bottom":
      return { x: t + o / 2, y: e + v };
    case "left":
      return { x: t, y: e + v / 2 };
    case "right":
      return { x: t + o, y: e + v / 2 };
    default:
      return { x: t + o, y: e + v / 2 };
  }
}
function ho(a) {
  var t = a.width || E, e = a.height || c;
  return a.handles && a.handles.length > 0 ? a.handles.map(function(o) {
    var v = Vo(o, h(a).x, h(a).y, t, e);
    return { id: o.id || null, type: o.type, x: v.x, y: v.y, position: o.position };
  }) : [
    { id: null, type: "target", x: h(a).x, y: h(a).y + e / 2, position: "left" },
    { id: null, type: "source", x: h(a).x + t, y: h(a).y + e / 2, position: "right" }
  ];
}
var Ft = {}, Ka = !0;
function Uo(a) {
  Ka && (Ft = {}, Ka = !1);
  var t = Ft[a.id];
  return t || (t = ho(a), Ft[a.id] = t, t);
}
function it(a, t, e) {
  for (var o = Uo(a), v = 0; v < o.length; v++)
    if (o[v].type === t)
      if (e) {
        if (o[v].id === e) return o[v];
      } else
        return o[v];
  var f = a.width || E, l = a.height || c;
  return t === "source" ? { x: h(a).x + f, y: h(a).y + l / 2 } : { x: h(a).x, y: h(a).y + l / 2 };
}
var z = {};
function Yt() {
  z = {
    grid: G ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    origin: G ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    cardBg: G ? "#2a2a28" : "#ffffff",
    cardBorder: G ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    cardShadow: G ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)",
    titleText: "rgba(255,255,255,0.9)",
    bodyText: G ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
    coordText: G ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
    nodeBg: G ? "#1e1e2e" : "#ffffff",
    nodeBorder: G ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
    nodeSelectedBorder: "#3b82f6",
    nodeShadow: G ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)",
    nodeText: G ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
    edgeStroke: G ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
    edgeSelected: "#3b82f6",
    edgeAnimated: "#3b82f6",
    handleFill: "#ffffff",
    handleBorder: "#3b82f6",
    connectionLine: "#3b82f6"
  }, xa = !0;
}
Yt();
var Do = ["#534AB7", "#0F6E56", "#993C1D", "#185FA5"], Ga = 8, Fo = "500 11px system-ui, sans-serif", jo = "400 11px system-ui, sans-serif", Oo = "10px monospace", Xo = "500 13px system-ui, sans-serif", Ho = "400 11px system-ui, sans-serif", br = 400, Ia = {}, ht = !0;
function Yo() {
  Ia = {};
  for (var a = 0; a < O.length; a++)
    for (var t = O[a], e = Math.floor(t.x / br), o = Math.floor(t.y / br), v = Math.floor((t.x + t.w) / br), f = Math.floor((t.y + t.h) / br), l = e; l <= v; l++)
      for (var y = o; y <= f; y++) {
        var d = l + "," + y;
        Ia[d] || (Ia[d] = []), Ia[d].push(a);
      }
  ht = !1;
}
function to(a, t, e, o) {
  ht && Yo();
  for (var v = {}, f = [], l = Math.floor(a / br), y = Math.floor(t / br), d = Math.floor(e / br), M = Math.floor(o / br), x = l; x <= d; x++)
    for (var i = y; i <= M; i++) {
      var n = x + "," + i, s = Ia[n];
      if (s)
        for (var u = 0; u < s.length; u++) {
          var w = s[u];
          v[w] || (v[w] = !0, f.push(w));
        }
    }
  return f;
}
var Nr = 500, Za = {}, Xr = !0;
function te() {
  Za = {};
  for (var a = 0; a < B.length; a++) {
    var t = B[a];
    if (!t.hidden)
      for (var e = h(t), o = t.width || E, v = t.height || c, f = Math.floor(e.x / Nr), l = Math.floor(e.y / Nr), y = Math.floor((e.x + o) / Nr), d = Math.floor((e.y + v) / Nr), M = f; M <= y; M++)
        for (var x = l; x <= d; x++) {
          var i = M + "," + x;
          Za[i] || (Za[i] = []), Za[i].push(a);
        }
  }
  Xr = !1;
}
function no(a, t, e, o) {
  Xr && te();
  for (var v = {}, f = [], l = Math.floor(a / Nr), y = Math.floor(t / Nr), d = Math.floor(e / Nr), M = Math.floor(o / Nr), x = l; x <= d; x++)
    for (var i = y; i <= M; i++) {
      var n = x + "," + i, s = Za[n];
      if (s)
        for (var u = 0; u < s.length; u++) {
          var w = s[u];
          v[w] || (v[w] = !0, f.push(w));
        }
    }
  return f;
}
var ka = {}, ya = !0;
function ee() {
  ka = {};
  for (var a = 0; a < B.length; a++)
    ka[B[a].id] = B[a];
  ya = !1;
}
function eo(a) {
  return ya && ee(), ka[a];
}
var Cr = {}, nt = !0;
function po() {
  Cr = {};
  for (var a = 0; a < P.length; a++) {
    var t = P[a];
    Cr[t.source] || (Cr[t.source] = []), Cr[t.source].push(a), t.source !== t.target && (Cr[t.target] || (Cr[t.target] = []), Cr[t.target].push(a));
  }
  nt = !1;
}
var jr = null, uo = 0, so = 0, Mo = "", xa = !0;
function rf(a) {
  jr || (jr = new OffscreenCanvas(1, 1));
  var t = Math.ceil(a), e = Math.ceil(a);
  if (t < 2 || e < 2) return !1;
  t > 512 && (t = 512), e > 512 && (e = 512), jr.width = t, jr.height = e, uo = t, so = a, Mo = Br, xa = !1;
  var o = jr.getContext("2d");
  o.clearRect(0, 0, t, e);
  var v = lt || z.grid;
  if (Br === "dots") {
    o.fillStyle = v;
    var f = Or * g.zoom;
    o.beginPath(), o.arc(0, 0, f, 0, 6.2832), o.fill();
  } else if (Br === "cross") {
    o.strokeStyle = v, o.lineWidth = Or;
    var l = 3 * g.zoom;
    o.beginPath(), o.moveTo(-l, 0), o.lineTo(l, 0), o.moveTo(0, -l), o.lineTo(0, l), o.stroke();
  } else
    o.beginPath(), o.strokeStyle = v, o.lineWidth = Or * 0.5, o.moveTo(0.5, 0), o.lineTo(0.5, e), o.moveTo(0, 0.5), o.lineTo(t, 0.5), o.stroke();
  return !0;
}
var oo = 0, jt = 0, fo = 0, vo = 0, pt = 0, Ja = !1;
console.log("[worker] script loaded v2 - FRESH");
self.postMessage({ type: "ping", data: { status: "alive" } });
self.onmessage = function(a) {
  try {
    var t = a.data.type, e = a.data.data;
    switch (t) {
      case "init":
        Ma = e.canvas, r = Ma.getContext("2d"), tr = e.width, er = e.height, Ma.width = tr, Ma.height = er, g = e.camera, O = e.cards || [], B = e.nodes || [], P = e.edges || [], G = e.dark, e.gridSize && (Ht = e.gridSize), e.edgeRouting !== void 0 && (ga = !!e.edgeRouting), Yt(), ht = !0, ya = !0, Xr = !0, Ka = !0, nt = !0, Ja = P.some(function(d) {
          return d.animated;
        }), console.log("[worker] init done — canvas:", tr, "x", er, "| cards:", O.length, "| nodes:", B.length, "| edges:", P.length, "| routing:", ga), ut(), self.postMessage({ type: "ready" }), Ja && lo();
        break;
      case "resize":
        tr = e.width, er = e.height, Ma.width = tr, Ma.height = er, xa = !0, ut();
        break;
      case "camera":
        g = e.camera, xa = !0, or();
        break;
      case "cards":
        O = e.cards, ht = !0, or();
        break;
      case "nodes":
        B = e.nodes, ya = !0, Xr = !0, Ka = !0, or(), vt(), self.postMessage({ type: "nodesProcessed", data: { nodeCount: B.length } });
        break;
      case "nodePositions":
        ya && ee();
        for (var o = e.updates, v = 0; v < o.length; v++) {
          var f = o[v], l = ka[f.id];
          l && (l.position = f.position, f._absolutePosition && (l._absolutePosition = f._absolutePosition), f.width !== void 0 && (l.width = f.width), f.height !== void 0 && (l.height = f.height), l.dragging = f.dragging, l.selected = f.selected);
        }
        Ka = !0, Xr = !0, or(), vt();
        break;
      case "edges":
        P = e.edges, nt = !0, Ja = P.some(function(d) {
          return d.animated;
        }), Ja && lo(), or(), vt();
        break;
      case "theme":
        G = e.dark, Yt(), or();
        break;
      case "connecting":
        Pa = e, or();
        break;
      case "selectionBox":
        hr = e, or();
        break;
      case "background":
        e.variant && (Br = e.variant), e.gap && (Ht = e.gap), e.size && (Or = e.size), lt = e.color || null, xa = !0, or();
        break;
      case "edgeRouting":
        if (ga = !!e.enabled, ga)
          vt();
        else {
          for (var y = 0; y < P.length; y++)
            P[y]._routedPoints = null;
          or();
        }
        break;
    }
  } catch (d) {
    console.error("[worker] error:", d);
  }
};
function or() {
  Dt || (Dt = !0, requestAnimationFrame(function() {
    Dt = !1, ut();
  }));
}
var Ot = !1;
function lo() {
  if (Ot) return;
  Ot = !0;
  function a() {
    if (!Ja) {
      Ot = !1;
      return;
    }
    pt = (pt + 0.5) % 20, ut(), requestAnimationFrame(a);
  }
  requestAnimationFrame(a);
}
function io(a, t) {
  var e = 6;
  a.moveTo(t[0].x, t[0].y);
  for (var o = 1; o < t.length - 1; o++) {
    var v = t[o - 1], f = t[o], l = t[o + 1], y = Math.abs(f.x - v.x) + Math.abs(f.y - v.y), d = Math.abs(l.x - f.x) + Math.abs(l.y - f.y), M = Math.min(e, y / 2, d / 2);
    if (M > 0.5) {
      var x = f.x - v.x, i = f.y - v.y, n = l.x - f.x, s = l.y - f.y, u = Math.sqrt(x * x + i * i) || 1, w = Math.sqrt(n * n + s * s) || 1;
      a.lineTo(f.x - x / u * M, f.y - i / u * M), a.quadraticCurveTo(f.x, f.y, f.x + n / w * M, f.y + s / w * M);
    } else
      a.lineTo(f.x, f.y);
  }
  a.lineTo(t[t.length - 1].x, t[t.length - 1].y);
}
function af(a) {
  for (var t = 0, e = 1; e < a.length; e++)
    t += Math.abs(a[e].x - a[e - 1].x) + Math.abs(a[e].y - a[e - 1].y);
  for (var o = t / 2, v = 1; v < a.length; v++) {
    var f = Math.abs(a[v].x - a[v - 1].x) + Math.abs(a[v].y - a[v - 1].y);
    if (o <= f) {
      var l = f > 0 ? o / f : 0;
      return {
        x: a[v - 1].x + (a[v].x - a[v - 1].x) * l,
        y: a[v - 1].y + (a[v].y - a[v - 1].y) * l
      };
    }
    o -= f;
  }
  return { x: a[0].x, y: a[0].y };
}
function re(a, t, e, o) {
  var v = Math.abs(e - a), f = Math.max(50, v * 0.5), l = a + f, y = t, d = e - f, M = o;
  return { cp1x: l, cp1y: y, cp2x: d, cp2y: M };
}
function tf(a, t, e, o) {
  var v = re(a, t, e, o), f = 0.5, l = 1 - f, y = l * l * l * a + 3 * l * l * f * v.cp1x + 3 * l * f * f * v.cp2x + f * f * f * e, d = l * l * l * t + 3 * l * l * f * v.cp1y + 3 * l * f * f * v.cp2y + f * f * f * o;
  return { x: y, y: d };
}
var ga = !0, ae = !1, Xt = !1;
function go(a, t, e, o, v) {
  Xr && te();
  for (var f = Math.min(a, e) - 20, l = Math.min(t, o) - 20, y = Math.max(a, e) + 20, d = Math.max(t, o) + 20, M = no(f, l, y, d), x = [], i = 0; i < M.length; i++) {
    var n = B[M[i]];
    n.hidden || v[n.id] || n.type !== "group" && x.push(n);
  }
  return x;
}
function dr(a, t, e, o) {
  for (var v = Math.min(a, t), f = Math.max(a, t), l = 0; l < o.length; l++) {
    var y = o[l], d = h(y), M = y.width || E, x = y.height || c;
    if (e > d.y && e < d.y + x && f > d.x && v < d.x + M) return y;
  }
  return null;
}
function Mr(a, t, e, o) {
  for (var v = Math.min(t, e), f = Math.max(t, e), l = 0; l < o.length; l++) {
    var y = o[l], d = h(y), M = y.width || E, x = y.height || c;
    if (a > d.x && a < d.x + M && f > d.y && v < d.y + x) return y;
  }
  return null;
}
function ef() {
  if (ga && !(!ae || P.length === 0 || B.length === 0)) {
    ae = !1, ya && ee(), Xr && te();
    for (var a = 20, t = !1, e = 0; e < P.length; e++) {
      var o = P[e];
      if (!o._customRendered) {
        var v = o.type || "default";
        if (!(v === "bezier" || v === "simplebezier" || v === "default")) {
          var f = ka[o.source], l = ka[o.target];
          if (!(!f || !l || f.hidden || l.hidden)) {
            var y = it(f, "source", o.sourceHandle), d = it(l, "target", o.targetHandle), M = y.position || "right", x = d.position || "left", i = y.x, n = y.y, s = d.x, u = d.y, w = i, Q = n, W = s, $ = u;
            M === "right" ? w += a : M === "left" ? w -= a : M === "bottom" ? Q += a : M === "top" && (Q -= a), x === "right" ? W += a : x === "left" ? W -= a : x === "bottom" ? $ += a : x === "top" && ($ -= a);
            var gr = h(f), qr = h(l), Sr = f.width || E, Gr = f.height || c, Pr = l.width || E, Hr = l.height || c, Ir = {};
            Ir[o.source] = !0, Ir[o.target] = !0;
            var X = go(
              Math.min(i, s) - Sr,
              Math.min(n, u) - Gr,
              Math.max(i, s) + Pr,
              Math.max(n, u) + Hr,
              Ir
            );
            X.push(f), X.push(l);
            var Yr = M === "left" || M === "right", Ta = x === "left" || x === "right", C = null;
            if (Yr && Ta) {
              var L, fr = M === "right" && w < W, st = M === "left" && w > W;
              if (fr || st) {
                L = (w + W) / 2;
                var ma = Mr(L, n, u, X);
                if (ma) {
                  var pr = h(ma), ra = ma.width || E;
                  L = L < pr.x + ra / 2 ? pr.x - a : pr.x + ra + a;
                }
              } else
                M === "right" ? L = Math.max(gr.x + Sr, qr.x + Pr) + a : L = Math.min(gr.x, qr.x) - a;
              C = [{ x: i, y: n }, { x: w, y: n }, { x: L, y: n }, { x: L, y: u }, { x: W, y: u }, { x: s, y: u }];
              var yr = dr(L, W, u, X);
              if (yr) {
                var aa = h(yr), ta = yr.height || c, ea = aa.y - a, Zr = aa.y + ta + a, Jr = Math.abs(n - ea) <= Math.abs(n - Zr) ? ea : Zr;
                C = [{ x: i, y: n }, { x: w, y: n }, { x: L, y: n }, { x: L, y: Jr }, { x: W, y: Jr }, { x: W, y: u }, { x: s, y: u }];
              }
            } else if (!Yr && !Ta) {
              var N, Qa = M === "bottom" && Q < $, Ra = M === "top" && Q > $;
              if (Qa || Ra) {
                N = (Q + $) / 2;
                var xr = dr(i, s, N, X);
                if (xr) {
                  var kr = h(xr), oa = xr.height || c;
                  N = N < kr.y + oa / 2 ? kr.y - a : kr.y + oa + a;
                }
              } else
                M === "bottom" ? N = Math.max(gr.y + Gr, qr.y + Hr) + a : N = Math.min(gr.y, qr.y) - a;
              C = [{ x: i, y: n }, { x: i, y: Q }, { x: i, y: N }, { x: s, y: N }, { x: s, y: $ }, { x: s, y: u }];
              var Kr = Mr(s, N, $, X);
              if (Kr) {
                var fa = h(Kr), wa = Kr.height || c, va = fa.y - a, la = fa.y + wa + a, ia = Math.abs(N - va) <= Math.abs(N - la) ? va : la;
                C = [{ x: i, y: n }, { x: i, y: Q }, { x: i, y: N }, { x: s, y: N }, { x: s, y: ia }, { x: W, y: ia }, { x: W, y: u }, { x: s, y: u }];
              }
            } else if (Yr) {
              C = [{ x: i, y: n }, { x: w, y: n }, { x: s, y: n }, { x: s, y: $ }, { x: s, y: u }];
              var Tr = Mr(s, n, $, X);
              if (Tr) {
                var V = h(Tr), mr = Tr.width || E, za = Math.abs(i - V.x + a) <= Math.abs(i - V.x - mr - a) ? V.x - a : V.x + mr + a;
                C = [{ x: i, y: n }, { x: w, y: n }, { x: za, y: n }, { x: za, y: u }, { x: s, y: u }, { x: s, y: $ }, { x: s, y: u }];
              }
              var Qr = dr(w, s, n, X);
              if (Qr) {
                var Rr = h(Qr), ha = Qr.height || c, H = Math.abs(u - Rr.y + a) <= Math.abs(u - Rr.y - ha - a) ? Rr.y - a : Rr.y + ha + a;
                C = [{ x: i, y: n }, { x: w, y: n }, { x: w, y: H }, { x: s, y: H }, { x: s, y: $ }, { x: s, y: u }];
              }
            } else {
              C = [{ x: i, y: n }, { x: i, y: Q }, { x: i, y: u }, { x: W, y: u }, { x: s, y: u }];
              var wr = dr(i, W, u, X);
              if (wr) {
                var na = h(wr), U = wr.height || c, zr = Math.abs(n - na.y + a) <= Math.abs(n - na.y - U - a) ? na.y - a : na.y + U + a;
                C = [{ x: i, y: n }, { x: i, y: Q }, { x: i, y: zr }, { x: W, y: zr }, { x: W, y: u }, { x: s, y: u }];
              }
              var nr = Mr(i, Q, u, X);
              if (nr) {
                var vr = h(nr), ca = nr.width || E, _a = Math.abs(s - vr.x + a) <= Math.abs(s - vr.x - ca - a) ? vr.x - a : vr.x + ca + a;
                C = [{ x: i, y: n }, { x: i, y: Q }, { x: _a, y: Q }, { x: _a, y: u }, { x: W, y: u }, { x: s, y: u }];
              }
            }
            if (C) {
              for (var $r = [C[0]], lr = 1; lr < C.length; lr++) {
                var $a = $r[$r.length - 1];
                (Math.abs(C[lr].x - $a.x) > 0.1 || Math.abs(C[lr].y - $a.y) > 0.1) && $r.push(C[lr]);
              }
              o._routedPoints = $r, t = !0;
            }
          }
        }
      }
    }
    t && or();
  }
}
function vt() {
  ga && (Xt || (Xt = !0, ae = !0, requestAnimationFrame(function() {
    Xt = !1;
    try {
      ef();
    } catch (a) {
      console.error("[worker] async routing error:", a);
    }
  })));
}
function ut() {
  if (r) {
    var a = performance.now();
    r.clearRect(0, 0, tr, er);
    var t = Ht * g.zoom;
    if (t > 2)
      if (Br === "lines" && t >= 4 && t <= 512) {
        if ((xa || so !== t || Mo !== Br) && rf(t), jr && uo > 0) {
          var e = (g.x % t + t) % t, o = (g.y % t + t) % t;
          r.save(), r.translate(e, o);
          var v = r.createPattern(jr, "repeat");
          v && (r.fillStyle = v, r.fillRect(-e, -o, tr, er)), r.restore();
        }
      } else {
        var f = (g.x % t + t) % t, l = (g.y % t + t) % t, y = lt || z.grid;
        if (Br === "dots") {
          r.fillStyle = y;
          for (var d = Or * g.zoom, M = f; M < tr; M += t)
            for (var x = l; x < er; x += t)
              r.beginPath(), r.arc(Math.round(M), Math.round(x), d, 0, 6.2832), r.fill();
        } else if (Br === "cross") {
          r.strokeStyle = y, r.lineWidth = Or;
          var i = 3 * g.zoom;
          r.beginPath();
          for (var n = f; n < tr; n += t)
            for (var s = l; s < er; s += t) {
              var u = Math.round(n), w = Math.round(s);
              r.moveTo(u - i, w), r.lineTo(u + i, w), r.moveTo(u, w - i), r.lineTo(u, w + i);
            }
          r.stroke();
        } else {
          var Q = lt || z.grid;
          r.beginPath(), r.strokeStyle = Q, r.lineWidth = Or * 0.5;
          for (var W = f; W < tr; W += t) {
            var $ = Math.round(W) + 0.5;
            r.moveTo($, 0), r.lineTo($, er);
          }
          for (var gr = l; gr < er; gr += t) {
            var qr = Math.round(gr) + 0.5;
            r.moveTo(0, qr), r.lineTo(tr, qr);
          }
          r.stroke();
        }
      }
    r.beginPath(), r.arc(g.x, g.y, 4 * g.zoom, 0, 6.2832), r.fillStyle = z.origin, r.fill(), r.save(), r.translate(g.x, g.y), r.scale(g.zoom, g.zoom);
    var Sr = 100, Gr = -g.x / g.zoom, Pr = -g.y / g.zoom, Hr = Gr + tr / g.zoom, Ir = Pr + er / g.zoom, X = Gr - Sr, Yr = Pr - Sr, Ta = Hr + Sr, C = Ir + Sr;
    if (O.length > 0) {
      var L = to(Gr, Pr, Hr, Ir), fr = L.length, st = g.zoom > 0.15, ma = g.zoom > 0.3, pr = g.zoom > 0.08 && fr < 200;
      if (pr) {
        r.shadowColor = z.cardShadow, r.shadowBlur = 6, r.shadowOffsetY = 2, r.fillStyle = z.cardBg, r.beginPath();
        for (var ra = 0; ra < fr; ra++) {
          var yr = O[L[ra]];
          r.roundRect(yr.x, yr.y, yr.w, yr.h, Ga);
        }
        r.fill(), r.shadowColor = "transparent", r.shadowBlur = 0, r.shadowOffsetY = 0;
      }
      if (!pr) {
        r.fillStyle = z.cardBg, r.beginPath();
        for (var aa = 0; aa < fr; aa++) {
          var ta = O[L[aa]];
          r.roundRect(ta.x, ta.y, ta.w, ta.h, Ga);
        }
        r.fill();
      }
      r.strokeStyle = z.cardBorder, r.lineWidth = 0.5, r.beginPath();
      for (var ea = 0; ea < fr; ea++) {
        var Zr = O[L[ea]];
        r.roundRect(Zr.x, Zr.y, Zr.w, Zr.h, Ga);
      }
      r.stroke();
      for (var Jr = [{}, {}, {}, {}], N = 0; N < fr; N++) {
        var Qa = L[N], Ra = Qa % 4;
        Jr[Ra].items || (Jr[Ra].items = []), Jr[Ra].items.push(O[Qa]);
      }
      for (var xr = 0; xr < 4; xr++) {
        var kr = Jr[xr].items;
        if (!(!kr || kr.length === 0)) {
          r.fillStyle = Do[xr], r.beginPath();
          for (var oa = 0; oa < kr.length; oa++) {
            var Kr = kr[oa];
            r.roundRect(Kr.x, Kr.y, Kr.w, 30, [Ga, Ga, 0, 0]);
          }
          r.fill();
        }
      }
      if (st) {
        r.fillStyle = z.titleText, r.font = Fo;
        for (var fa = 0; fa < fr; fa++) {
          var wa = O[L[fa]];
          r.fillText(wa.title, wa.x + 12, wa.y + 19);
        }
        r.fillStyle = z.bodyText, r.font = jo;
        for (var va = 0; va < fr; va++) {
          var la = O[L[va]];
          r.fillText(la.body, la.x + 12, la.y + 52);
        }
        if (ma) {
          r.fillStyle = z.coordText, r.font = Oo;
          for (var ia = 0; ia < fr; ia++) {
            var Tr = O[L[ia]];
            r.fillText("(" + Tr.x + ", " + Tr.y + ")", Tr.x + 12, Tr.y + 75);
          }
        }
      }
    }
    var V = [], mr = null;
    if (B.length > 0)
      if (mr = {}, B.length > 100)
        for (var za = no(X, Yr, Ta, C), Qr = 0; Qr < za.length; Qr++) {
          var Rr = B[za[Qr]];
          mr[Rr.id] = !0, Rr._customRendered || V.push(Rr);
        }
      else
        for (var ha = 0; ha < B.length; ha++) {
          var H = B[ha];
          if (!H.hidden) {
            var wr = H.width || E, na = H.height || c;
            h(H).x + wr < X || h(H).x > Ta || h(H).y + na < Yr || h(H).y > C || (mr[H.id] = !0, H._customRendered || V.push(H));
          }
        }
    var U = V.length;
    if (P.length > 0 && B.length > 0) {
      let ot = function(Lr, ro) {
        if (Lr.length) {
          r.fillStyle = ro, r.beginPath();
          for (var Ut = 0; Ut < Lr.length; Ut++) {
            var j = Lr[Ut];
            r.moveTo(j.x, j.y), r.lineTo(j.x - j.size * Math.cos(j.angle - 0.5236), j.y - j.size * Math.sin(j.angle - 0.5236)), r.lineTo(j.x - j.size * Math.cos(j.angle + 0.5236), j.y - j.size * Math.sin(j.angle + 0.5236)), r.closePath();
          }
          r.fill();
        }
      };
      var of = ot;
      nt && po();
      var zr = null, nr = null, vr = null, ca = [], _a = [], $r = [], lr = [], $a = g.zoom > 0.3, yo = g.zoom > 0.05, ua;
      if (mr && B.length > 100) {
        var oe = {};
        ua = [];
        for (var xo in mr) {
          var dt = Cr[xo];
          if (dt)
            for (var Mt = 0; Mt < dt.length; Mt++) {
              var gt = dt[Mt];
              oe[gt] || (oe[gt] = !0, ua.push(gt));
            }
        }
      } else {
        ua = [];
        for (var yt = 0; yt < P.length; yt++) ua.push(yt);
      }
      for (var xt = 0; xt < ua.length; xt++) {
        var D = P[ua[xt]], Vr = eo(D.source), Ur = eo(D.target);
        if (!(!Vr || !Ur) && !(Vr.hidden || Ur.hidden) && !D._customRendered) {
          var Va = it(Vr, "source", D.sourceHandle), Ua = it(Ur, "target", D.targetHandle), _ = Va.x, R = Va.y, T = Ua.x, m = Ua.y, ir = D.type || "default", fe = D.selected, ve = D.animated, q;
          fe ? (nr || (nr = new Path2D()), q = nr) : ve ? (vr || (vr = new Path2D()), q = vr) : (zr || (zr = new Path2D()), q = zr);
          var S = D._routedPoints;
          if (S && S.length >= 2)
            io(q, S);
          else if (ir === "straight")
            q.moveTo(_, R), q.lineTo(T, m);
          else if (ir === "step" || ir === "smoothstep")
            try {
              var Y = Va.position || "right", sa = Ua.position || "left", k = 20, I = _, F = R, Z = T, p = m;
              Y === "right" ? I += k : Y === "left" ? I -= k : Y === "bottom" ? F += k : Y === "top" && (F -= k), sa === "right" ? Z += k : sa === "left" ? Z -= k : sa === "bottom" ? p += k : sa === "top" && (p -= k);
              var Da = h(Vr), Fa = h(Ur), Aa = Vr.width || E, Ea = Vr.height || c, le = Ur.width || E, ie = Ur.height || c, kt = Y === "left" || Y === "right", he = sa === "left" || sa === "right", Tt = {};
              Tt[D.source] = !0, Tt[D.target] = !0;
              var rr = go(
                Math.min(_, T) - Aa,
                Math.min(R, m) - Ea,
                Math.max(_, T) + le,
                Math.max(R, m) + ie,
                Tt
              );
              rr.push(Vr), rr.push(Ur);
              var b = [];
              if (kt && he) {
                var J, ko = Y === "right" && I < Z, To = Y === "left" && I > Z;
                if (ko || To) {
                  J = (I + Z) / 2;
                  var mt = Mr(J, R, m, rr);
                  if (mt) {
                    var Rt = h(mt), wr = mt.width || E;
                    J < Rt.x + wr / 2 ? J = Rt.x - k : J = Rt.x + wr + k;
                  }
                } else
                  Y === "right" ? J = Math.max(Da.x + Aa, Fa.x + le) + k : J = Math.min(Da.x, Fa.x) - k;
                b = [{ x: I, y: R }, { x: J, y: R }, { x: J, y: m }, { x: Z, y: m }];
                var wt = dr(J, Z, m, rr);
                if (wt) {
                  var ne = h(wt), mo = wt.height || c, ue = ne.y - k, se = ne.y + mo + k, de = Math.abs(R - ue) <= Math.abs(R - se) ? ue : se;
                  b = [
                    { x: I, y: R },
                    { x: J, y: R },
                    { x: J, y: de },
                    { x: Z, y: de },
                    { x: Z, y: m }
                  ];
                }
                var zt = dr(I, J, R, rr);
                if (zt) {
                  var Me = h(zt), Ro = zt.height || c, ge = Me.y - k, ye = Me.y + Ro + k, xe = Math.abs(m - ge) <= Math.abs(m - ye) ? ge : ye;
                  b.splice(
                    1,
                    0,
                    { x: I, y: xe },
                    { x: J, y: xe }
                  ), b = b.filter(function(Lr, ro) {
                    return !(Math.abs(Lr.x - J) < 1 && Math.abs(Lr.y - R) < 1);
                  }), b.splice(0, 0, { x: I, y: R });
                }
              } else if (!kt && !he) {
                var K, wo = Y === "bottom" && F < p, zo = Y === "top" && F > p;
                if (wo || zo) {
                  K = (F + p) / 2;
                  var ct = dr(_, T, K, rr);
                  if (ct) {
                    var _t = h(ct), ke = ct.height || c;
                    K < _t.y + ke / 2 ? K = _t.y - k : K = _t.y + ke + k;
                  }
                } else
                  Y === "bottom" ? K = Math.max(Da.y + Ea, Fa.y + ie) + k : K = Math.min(Da.y, Fa.y) - k;
                b = [{ x: _, y: F }, { x: _, y: K }, { x: T, y: K }, { x: T, y: p }];
                var At = Mr(_, F, K, rr);
                if (At) {
                  var Te = h(At), co = At.width || E, me = Te.x - k, Re = Te.x + co + k, we = Math.abs(T - me) <= Math.abs(T - Re) ? me : Re;
                  b = [
                    { x: _, y: F },
                    { x: we, y: F },
                    { x: we, y: K },
                    { x: T, y: K },
                    { x: T, y: p }
                  ];
                }
                var Et = Mr(T, K, p, rr);
                if (Et) {
                  var ze = h(Et), _o = Et.height || c, ce = ze.y - k, _e = ze.y + _o + k, Ao = Math.abs(K - ce) <= Math.abs(K - _e) ? ce : _e;
                  b.splice(
                    b.length - 1,
                    0,
                    { x: Z, y: Ao }
                  );
                }
              } else if (kt) {
                b = [{ x: I, y: R }, { x: T, y: R }, { x: T, y: p }];
                var Wt = Mr(T, R, p, rr);
                if (Wt) {
                  var Ae = h(Wt), Eo = Wt.width || E, Ee = Ae.x - k, We = Ae.x + Eo + k, Le = Math.abs(_ - Ee) <= Math.abs(_ - We) ? Ee : We;
                  b = [{ x: I, y: R }, { x: Le, y: R }, { x: Le, y: m }, { x: T, y: m }, { x: T, y: p }];
                }
                var Lt = dr(I, T, R, rr);
                if (Lt) {
                  var Ce = h(Lt), Wo = Lt.height || c, Be = Ce.y - k, be = Ce.y + Wo + k, Ne = Math.abs(m - Be) <= Math.abs(m - be) ? Be : be;
                  b = [{ x: I, y: R }, { x: I, y: Ne }, { x: T, y: Ne }, { x: T, y: p }];
                }
              } else {
                b = [{ x: _, y: F }, { x: _, y: m }, { x: Z, y: m }];
                var Ct = dr(_, Z, m, rr);
                if (Ct) {
                  var qe = h(Ct), Lo = Ct.height || c, Se = qe.y - k, Ge = qe.y + Lo + k, Pe = Math.abs(R - Se) <= Math.abs(R - Ge) ? Se : Ge;
                  b = [{ x: _, y: F }, { x: _, y: Pe }, { x: Z, y: Pe }, { x: Z, y: m }];
                }
                var Bt = Mr(_, F, m, rr);
                if (Bt) {
                  var Ie = h(Bt), Co = Bt.width || E, Ze = Ie.x - k, Je = Ie.x + Co + k, Ke = Math.abs(T - Ze) <= Math.abs(T - Je) ? Ze : Je;
                  b = [{ x: _, y: F }, { x: Ke, y: F }, { x: Ke, y: m }, { x: Z, y: m }];
                }
              }
              for (var Dr = [{ x: _, y: R }], bt = 0; bt < b.length; bt++) Dr.push(b[bt]);
              Dr.push({ x: T, y: m });
              for (var ar = [Dr[0]], Wa = 1; Wa < Dr.length; Wa++) {
                var La = ar[ar.length - 1];
                (Math.abs(Dr[Wa].x - La.x) > 0.1 || Math.abs(Dr[Wa].y - La.y) > 0.1) && ar.push(Dr[Wa]);
              }
              var Qe = ir === "smoothstep" ? 8 : 0;
              q.moveTo(ar[0].x, ar[0].y);
              for (var ur = 1; ur < ar.length; ur++)
                if (Qe > 0 && ur > 0 && ur < ar.length - 1) {
                  var sr = ar[ur - 1], A = ar[ur], cr = ar[ur + 1];
                  if (Math.abs(sr.x - A.x) < 0.5 && Math.abs(A.x - cr.x) < 0.5 || Math.abs(sr.y - A.y) < 0.5 && Math.abs(A.y - cr.y) < 0.5)
                    q.lineTo(A.x, A.y);
                  else {
                    var ja = Math.min(Math.hypot(sr.x - A.x, sr.y - A.y) / 2, Math.hypot(A.x - cr.x, A.y - cr.y) / 2, Qe);
                    Math.abs(sr.y - A.y) < 0.5 ? (q.lineTo(A.x + (sr.x < cr.x ? -1 : 1) * ja, A.y), q.quadraticCurveTo(A.x, A.y, A.x, A.y + (sr.y < cr.y ? 1 : -1) * ja)) : (q.lineTo(A.x, A.y + (sr.y < cr.y ? -1 : 1) * ja), q.quadraticCurveTo(A.x, A.y, A.x + (sr.x < cr.x ? 1 : -1) * ja, A.y));
                  }
                } else
                  q.lineTo(ar[ur].x, ar[ur].y);
            } catch (Lr) {
              console.error("[worker] smoothstep error:", Lr, "edge:", D.id);
            }
          else {
            var _r = Va.position || "right", Ar = Ua.position || "left", Er = 20, Ca = _, Oa = R, Ba = T, Xa = m;
            _r === "right" ? Ca += Er : _r === "left" ? Ca -= Er : _r === "bottom" ? Oa += Er : _r === "top" && (Oa -= Er), Ar === "right" ? Ba += Er : Ar === "left" ? Ba -= Er : Ar === "bottom" ? Xa += Er : Ar === "top" && (Xa -= Er);
            var Bo = Math.abs(Ba - Ca), Wr = Math.max(50, Bo * 0.5), bo = Ca + (_r === "left" ? -Wr : _r === "right" ? Wr : 0), No = Oa + (_r === "top" ? -Wr : _r === "bottom" ? Wr : 0), qo = Ba + (Ar === "left" ? -Wr : Ar === "right" ? Wr : 0), So = Xa + (Ar === "top" ? -Wr : Ar === "bottom" ? Wr : 0);
            q.moveTo(_, R), q.lineTo(Ca, Oa), q.bezierCurveTo(bo, No, qo, So, Ba, Xa), q.lineTo(T, m);
          }
          if (yo) {
            var Go = 8, ba;
            if (S && S.length >= 2) {
              var La = S[S.length - 1], $e = S[S.length - 2];
              ba = Math.atan2(La.y - $e.y, La.x - $e.x);
            } else if (ir === "straight")
              ba = Math.atan2(m - R, T - _);
            else if (ir === "step" || ir === "smoothstep")
              ba = 0;
            else {
              var Ve = re(_, R, T, m);
              ba = Math.atan2(m - Ve.cp2y, T - Ve.cp2x);
            }
            var Ue = S && S.length >= 2 ? S[S.length - 1] : { x: T, y: m }, Nt = { x: Ue.x, y: Ue.y, angle: ba, size: Go };
            fe ? _a.push(Nt) : ve ? $r.push(Nt) : ca.push(Nt);
          }
          if ($a && D.label) {
            var Na;
            S && S.length >= 2 ? Na = af(S) : ir === "straight" || ir === "step" || ir === "smoothstep" ? Na = { x: (_ + T) / 2, y: (R + m) / 2 } : Na = tf(_, R, T, m), lr.push({ text: D.label, x: Na.x, y: Na.y });
          }
        }
      }
      if (zr && (r.strokeStyle = z.edgeStroke, r.lineWidth = 1.5, r.setLineDash([]), r.stroke(zr)), vr && (r.strokeStyle = z.edgeAnimated, r.lineWidth = 1.5, r.setLineDash([5, 5]), r.lineDashOffset = -pt, r.stroke(vr), r.setLineDash([])), nr && (r.strokeStyle = z.edgeSelected, r.lineWidth = 2.5, r.setLineDash([]), r.stroke(nr)), ot(ca, z.edgeStroke), ot($r, z.edgeAnimated), ot(_a, z.edgeSelected), lr.length > 0) {
        r.font = Ho, r.textAlign = "center", r.textBaseline = "middle";
        for (var qt = 0; qt < lr.length; qt++) {
          var da = lr[qt], Po = r.measureText(da.text), De = Po.width + 12;
          r.fillStyle = G ? "#2a2a2a" : "#ffffff", r.fillRect(da.x - De / 2, da.y - 9, De, 18), r.fillStyle = z.nodeText, r.fillText(da.text, da.x, da.y);
        }
        r.textAlign = "start", r.textBaseline = "alphabetic";
      }
    }
    if (Pa) {
      r.beginPath(), r.strokeStyle = z.connectionLine, r.lineWidth = 2, r.setLineDash([6, 4]);
      var St = Pa._routedPoints;
      if (St && St.length >= 2) {
        var Fe = new Path2D();
        io(Fe, St), r.stroke(Fe);
      } else {
        var Ha = Pa.from, Ya = Pa.to, pa = re(Ha.x, Ha.y, Ya.x, Ya.y);
        r.moveTo(Ha.x, Ha.y), r.bezierCurveTo(pa.cp1x, pa.cp1y, pa.cp2x, pa.cp2y, Ya.x, Ya.y), r.stroke();
      }
      r.setLineDash([]);
    }
    if (hr) {
      var je = Math.min(hr.startWorld.x, hr.endWorld.x), Oe = Math.min(hr.startWorld.y, hr.endWorld.y), Aa = Math.abs(hr.endWorld.x - hr.startWorld.x), Ea = Math.abs(hr.endWorld.y - hr.startWorld.y);
      r.fillStyle = G ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)", r.fillRect(je, Oe, Aa, Ea), r.strokeStyle = "#3b82f6", r.lineWidth = 1 / g.zoom, r.setLineDash([]), r.strokeRect(je, Oe, Aa, Ea);
    }
    if (U > 0) {
      var Io = g.zoom > 0.12 && (g.zoom > 0.25 || U < 500), Xe = g.zoom > 0.08 && U < 200, Zo = g.zoom > 0.2 && U < 300;
      if (Xe) {
        r.shadowColor = z.nodeShadow, r.shadowBlur = 6, r.shadowOffsetY = 2, r.fillStyle = z.nodeBg, r.beginPath();
        for (var Gt = 0; Gt < U; Gt++) {
          var rt = V[Gt];
          r.roundRect(h(rt).x, h(rt).y, rt.width || E, rt.height || c, ft);
        }
        r.fill(), r.shadowColor = "transparent", r.shadowBlur = 0, r.shadowOffsetY = 0;
      }
      if (!Xe) {
        r.fillStyle = z.nodeBg, r.beginPath();
        for (var Pt = 0; Pt < U; Pt++) {
          var at = V[Pt];
          r.roundRect(h(at).x, h(at).y, at.width || E, at.height || c, ft);
        }
        r.fill();
      }
      r.strokeStyle = z.nodeBorder, r.lineWidth = 1, r.beginPath();
      for (var It = 0; It < U; It++) {
        var qa = V[It];
        qa.selected || r.roundRect(h(qa).x, h(qa).y, qa.width || E, qa.height || c, ft);
      }
      r.stroke();
      var He = !1;
      r.strokeStyle = z.nodeSelectedBorder, r.lineWidth = 2, r.beginPath();
      for (var Zt = 0; Zt < U; Zt++) {
        var Sa = V[Zt];
        Sa.selected && (He = !0, r.roundRect(h(Sa).x, h(Sa).y, Sa.width || E, Sa.height || c, ft));
      }
      if (He && r.stroke(), Io) {
        r.fillStyle = z.nodeText, r.font = Xo, r.textAlign = "center", r.textBaseline = "middle";
        for (var Jt = 0; Jt < U; Jt++) {
          var Fr = V[Jt];
          if (!(!Fr.data || !Fr.data.label)) {
            var Ye = Fr.width || E, Jo = Fr.height || c;
            r.fillText(Fr.data.label, h(Fr).x + Ye / 2, h(Fr).y + Jo / 2, Ye - 24);
          }
        }
        r.textAlign = "start", r.textBaseline = "alphabetic";
      }
      if (Zo) {
        for (var Kt = [], Qt = 0; Qt < U; Qt++)
          for (var pe = ho(V[Qt]), $t = 0; $t < pe.length; $t++)
            Kt.push(pe[$t]);
        r.fillStyle = z.handleFill, r.beginPath();
        for (var Vt = 0; Vt < Kt.length; Vt++) {
          var tt = Kt[Vt];
          r.moveTo(tt.x + ao, tt.y), r.arc(tt.x, tt.y, ao, 0, 6.2832);
        }
        r.fill(), r.strokeStyle = z.handleBorder, r.lineWidth = 1.5, r.stroke();
      }
    }
    r.restore();
    var Ko = (performance.now() - a).toFixed(1);
    jt++;
    var et = performance.now();
    if (et - oo >= 1e3 && (fo = jt, jt = 0, oo = et), et - vo >= 100) {
      vo = et;
      var Qo = Math.round(-g.x / g.zoom), $o = Math.round(-g.y / g.zoom);
      self.postMessage({
        type: "hud",
        data: {
          wx: Qo,
          wy: $o,
          zoom: g.zoom.toFixed(2),
          renderMs: Ko,
          fps: fo,
          visible: O.length > 0 ? to(Gr, Pr, Hr, Ir).length : 0,
          nodeCount: B.length,
          visibleNodes: U,
          edgeCount: P.length
        }
      });
    }
  }
}
