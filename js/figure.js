/* =========================================================================
   IMMERSE FIT — figure.js
   お手本：黒い背景に「白い線」で描いた人。関節の位置から毎フレーム描きます。
   ・部位ごとに輪郭をつくり、奥 → 胴 → 手前 の順に重ねる（手前の腕や脚が、胴の線を隠す）
   ・動いている手足だけ、少し前の形を薄い線で残す（動きの跡）
   ・これから動く向きを矢印で、次に当たる場所を小さな印で示す
   ・当たる瞬間に、手足のまわりに短い線がはじける
   ========================================================================= */
import { qrot } from './motion.js';
import { jointsAtRep } from './motions.js';

const TAU = Math.PI * 2;
// 体の太さ（半径・メートル）
const RD = {
  hip: 0.084, thigh: 0.07, knee: 0.052, calf: 0.056, shin: 0.047, ank: 0.034,
  sh: 0.054, bic: 0.047, elb: 0.038, fore: 0.042, wr: 0.028, neck: 0.044,
};
// 動きの跡・先の動き（回数の座標 rf からのずれ）
const GHOSTS = [-0.17, -0.12, -0.08, -0.04], FUTURE = [0.06, 0.12, 0.18, 0.25, 0.33];

/* ---------- 形（画面座標の点の列） ---------- */
function arcPts(out, x, y, r, a0, a1, n) { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } return out; }
// 2つの円をなめらかにつないだ形（先細りのカプセル）
function capsule(A, B, rA, rB) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy);
  if (!(d > Math.abs(rA - rB) + 0.5)) { const big = rA >= rB; return arcPts([], big ? A[0] : B[0], big ? A[1] : B[1], Math.max(rA, rB), 0, TAU, 28); }
  const th = Math.atan2(dy, dx), ph = Math.acos(Math.max(-1, Math.min(1, (rA - rB) / d)));
  const pts = [];
  arcPts(pts, A[0], A[1], rA, th + ph, th + TAU - ph, Math.max(6, Math.round(9 * (TAU - 2 * ph) / Math.PI)));
  arcPts(pts, B[0], B[1], rB, th - ph, th + ph, Math.max(5, Math.round(9 * 2 * ph / Math.PI)));
  return pts;
}
// 円をいくつか包む形（凸包）
function hull(circles) {
  const P = [];
  for (const [x, y, r] of circles) for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; P.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function ellipse(x, y, rx, ry, rot) {
  const c = Math.cos(rot), s = Math.sin(rot), pts = [];
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, ex = rx * Math.cos(a), ey = ry * Math.sin(a); pts.push([x + ex * c - ey * s, y + ex * s + ey * c]); }
  return pts;
}
function trace(c, pts) { if (!pts.length) return; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }

/* ---------- 3D の小道具 ---------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// 手足の先（0=右手 1=左手 2=右足 3=左足 4=腰 5=右ひざ 6=左ひざ）と、そのつけ根（腰は床）
const endOf = (J, i) => i < 2 ? J.wr[i] : i < 4 ? J.toe[i - 2] : i === 4 ? lerp3(J.hip[0], J.hip[1], 0.5) : J.kn[i - 5];
const rootOf = (J, i) => i < 2 ? J.sh[i] : i < 4 ? J.hip[i - 2] : i === 4 ? [0, 0, 0] : J.hip[i - 5];
const limbOf = i => i >= 5 ? i - 3 : i;        // 描く部位（ひざは脚）
// 画面上で、つけ根に対して手足の先がどれだけ動くか
function moveOf(P, A, B, i) { const a = P(endOf(A, i)), b = P(endOf(B, i)), ra = P(rootOf(A, i)), rb = P(rootOf(B, i)); return Math.hypot((b[0] - rb[0]) - (a[0] - ra[0]), (b[1] - rb[1]) - (a[1] - ra[1])); }

/* ---------- 体の部位を組み立てる ----------
   戻り値：groups = [{ z, shapes:[点の列], lines:[[a,b,ctrl?]], torso|arm|leg, idx, tip, excl }] */
function build(J, P, s) {
  const pr = (v, r) => { const p = P(v); return [p[0], p[1], r * s * p[3], p[2]]; };
  const C = (v, r) => { const p = pr(v, r); return [p[0], p[1], p[2]]; };
  const cap = (a, b, ra, rb) => { const A = pr(a, ra), B = pr(b, rb); return capsule(A, B, A[2], B[2]); };
  const limb = (a, b, ra, rm, rb, t) => { const m = lerp3(a, b, t); return [cap(a, m, ra, rm), cap(m, b, rm, rb)]; };
  const groups = [];
  const zOf = pts => pts.reduce((a, p) => a + P(p)[2], 0) / pts.length;
  const qc = J.qc, qp = J.qp, qh = J.qh;
  // 胴（胸＋腰）・首・頭
  const chest = hull([
    C(J.sh[0], 0.058), C(J.sh[1], 0.058), C(add(J.shc, qrot(qc, [0, 0.025, -0.01])), 0.056),
    C(add(J.chestC, qrot(qc, [-0.112, 0, 0])), 0.064), C(add(J.chestC, qrot(qc, [0.112, 0, 0])), 0.064),
    C(add(J.waist, qrot(qc, [-0.088, 0.05, 0])), 0.062), C(add(J.waist, qrot(qc, [0.088, 0.05, 0])), 0.062),
  ]);
  const pelvis = hull([
    C(add(J.waist, qrot(qp, [-0.098, 0, 0])), 0.058), C(add(J.waist, qrot(qp, [0.098, 0, 0])), 0.058),
    C(J.hip[0], RD.hip), C(J.hip[1], RD.hip), C(add(J.pel, qrot(qp, [0, -0.075, 0])), 0.07),
  ]);
  const hb = add(J.neck, qrot(qh, [0, 0.07, 0]));
  const neck = cap(J.shc, hb, RD.neck, RD.neck * 0.92);
  const H = P(J.head), HB = P(add(J.head, qrot(qh, [0, -0.1, 0]))), hk = s * H[3];
  const head = ellipse(H[0], H[1], 0.084 * hk, 0.108 * hk, Math.atan2(H[0] - HB[0], -(H[1] - HB[1])));
  const tl = [];
  const nf = P(add(J.shc, qrot(qc, [0, -0.02, 0.07]))), nl = P(add(J.shc, qrot(qc, [-0.052, 0.03, 0.035]))), nr = P(add(J.shc, qrot(qc, [0.052, 0.03, 0.035])));
  if (P(add(J.shc, qrot(qc, [0, 0, 0.1])))[2] > P(J.shc)[2]) tl.push([[nl[0], nl[1]], [nr[0], nr[1]], [nf[0], nf[1]]]);
  // 短パン
  const shorts = [];
  for (let i = 0; i < 2; i++) {
    const A = P(J.hip[i]), M = P(lerp3(J.hip[i], J.kn[i], 0.46)), dx = M[0] - A[0], dy = M[1] - A[1], dl = Math.hypot(dx, dy);
    if (dl < 2) continue;
    const nx = -dy / dl, ny = dx / dl, wa = RD.hip * 1.02 * s * A[3], wm = RD.thigh * 1.2 * s * M[3];
    shorts.push([[A[0] + nx * wa, A[1] + ny * wa], [M[0] + nx * wm, M[1] + ny * wm], [M[0] - nx * wm, M[1] - ny * wm], [A[0] - nx * wa, A[1] - ny * wa]]);
  }
  groups.push({ z: zOf([J.chestC, J.pel]), shapes: [...shorts, pelvis, chest, neck, head], lines: tl, torso: true });
  // 脚
  for (let i = 0; i < 2; i++) {
    const fd = J.fd ? J.fd[i] : nrm(sub(J.toe[i], J.an[i])), down = [0, -1, 0];
    const heel = add(add(J.an[i], mul(fd, -0.045)), mul(down, 0.03)), mid = add(add(J.an[i], mul(fd, 0.085)), mul(down, 0.035));
    const shoe = hull([C(J.an[i], 0.036), C(heel, 0.037), C(mid, 0.037), C(J.toe[i], 0.029)]);
    const sh = [...limb(J.hip[i], J.kn[i], RD.hip * 0.95, RD.thigh, RD.knee, 0.38), ...limb(J.kn[i], J.an[i], RD.shin, RD.calf, RD.ank, 0.3), shoe];
    const Hp = pr(J.hip[i], RD.hip);
    groups.push({ z: (P(J.kn[i])[2] + P(J.an[i])[2]) / 2 - 0.09, shapes: sh, lines: [], leg: i, idx: 2 + i, tip: [shoe], excl: [Hp[0], Hp[1], Hp[2] * 1.02] });
  }
  // 腕
  for (let i = 0; i < 2; i++) {
    const dir = nrm(sub(J.wr[i], J.elb[i])), fist = J.fist && J.fist[i] > 0.5;
    let hand;
    if (fist) { const c = pr(add(J.wr[i], mul(dir, 0.05)), 0.047); hand = [arcPts([], c[0], c[1], c[2], 0, TAU, 24)]; }
    else {
      const k1 = add(J.wr[i], mul(dir, 0.085)), tip = add(J.wr[i], mul(dir, 0.165));
      hand = [cap(J.wr[i], k1, 0.03, 0.037), cap(k1, tip, 0.037, 0.023)];
    }
    const sh = [...limb(J.sh[i], J.elb[i], RD.sh, RD.bic, RD.elb, 0.35), ...limb(J.elb[i], J.wr[i], RD.elb, RD.fore, RD.wr, 0.28), ...hand];
    const S = pr(J.sh[i], RD.sh);
    groups.push({ z: (P(J.elb[i])[2] + P(J.wr[i])[2]) / 2 + 0.02, shapes: sh, lines: [], arm: i, idx: i, tip: hand, excl: [S[0], S[1], S[2] * 1.08] });
  }
  const tz = groups[0].z;
  for (const g of groups) g.far = !g.torso && g.z < tz - 0.06;
  groups.sort((a, b) => a.z - b.z);
  return groups;
}
function projector(o) {
  const yaw = (o.view || 0) * Math.PI / 180, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const s = o.h / 1.72, D = 5.5, cy = 1.0;
  const P = v => { const x = v[0] * cs + v[2] * sn, z = -v[0] * sn + v[2] * cs, k = D / (D - z); return [o.x + x * s * k, o.y - (cy + (v[1] - cy) * k) * s, z, k]; };
  return [P, s];
}
// 矢印（なめらかな折れ線＋矢じり）
function arrow(c, pts, lw, col, alpha) {
  if (pts.length < 2) return;
  c.save(); c.globalAlpha = alpha; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  const L = pts[pts.length - 1]; c.lineTo(L[0], L[1]); c.stroke();
  const Q = pts[pts.length - 2], a = Math.atan2(L[1] - Q[1], L[0] - Q[0]), hs = lw * 3.2;
  c.beginPath(); c.moveTo(L[0] + Math.cos(a) * hs * 0.9, L[1] + Math.sin(a) * hs * 0.9);
  c.lineTo(L[0] + Math.cos(a + 2.5) * hs, L[1] + Math.sin(a + 2.5) * hs); c.lineTo(L[0] + Math.cos(a - 2.5) * hs, L[1] + Math.sin(a - 2.5) * hs); c.closePath(); c.fill();
  c.restore();
}

/* ---------- お手本の姿勢ひとそろい（いま・跡・先・次に当たる姿勢） ----------
   R: rig、rf: 回数の座標（接触 j は rf = j） */
export function coachFrames(R, rf) {
  const J = jointsAtRep(R, rf), up = Math.ceil(rf - 1e-6), next = up <= rf + 1e-6 ? rf + 1 : up;
  const ghosts = GHOSTS.map(d => jointsAtRep(R, rf + d));
  const future = []; for (const d of FUTURE) { if (rf + d >= next - 0.02) break; future.push(jointsAtRep(R, rf + d)); }
  return { J, ghosts, future, contact: jointsAtRep(R, next), toNext: next - rf, act: R.m && R.m.act };
}

/* ---------- 描く ----------
   c: CanvasRenderingContext2D（CSS ピクセル座標）
   o: { x, y: 足もと（床）の画面位置, h: 身長の画面上の高さ, view: 向き(度), lw: 線の太さ, col, bg,
        ghosts, future, contact, toNext（coachFrames の戻り値をそのまま渡せる）, impact: 0〜1, ground, mini: 小さく描くとき } */
export function drawFigure(c, J, o) {
  const [P, s] = projector(o);
  const lw = o.lw ?? Math.max(1.4, o.h * (o.mini ? 0.012 : 0.0105)), col = o.col || '#ffffff', bg = o.bg || '#000000';
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // 床：足もとのうすい影と線
  if (o.ground !== false) {
    const G = P([0, 0, 0]), w = o.h * 0.4;
    const gr = c.createRadialGradient(G[0], G[1], 0, G[0], G[1], w);
    gr.addColorStop(0, 'rgba(255,255,255,0.13)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.beginPath(); c.ellipse(G[0], G[1] + lw, w, w * 0.16, 0, 0, TAU); c.fill();
    const lg = c.createLinearGradient(G[0] - w, 0, G[0] + w, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.45)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = lg; c.lineWidth = Math.max(1, lw * 0.5); c.beginPath(); c.moveTo(G[0] - w, G[1] + lw); c.lineTo(G[0] + w, G[1] + lw); c.stroke();
  }
  const cur = build(J, P, s);
  // 動きの種類に合う手足を優先（脚の動きなら脚、腕の動きなら腕）
  const legAct = /^(kick|knee|stomp|step|jump|squat)$/.test(o.act || ''), wgt = [0, 1, 2, 3, 4, 5, 6].map(i => i === 4 ? 0.6 : (i < 2) === !legAct ? 1 : 0.22);
  // いちばん動く手足（次に当たるまでの移動がいちばん大きいもの）
  let act = -1;
  if (o.contact) {
    let best = 0;
    for (let i = 0; i < 7; i++) { const d = moveOf(P, J, o.contact, i) * wgt[i]; if (d > best) { best = d; act = i; } }
    if (best < o.h * 0.04) act = -1;
  }
  // 動きの跡：大きく動いている手足だけ、少し前の形を薄い線で
  if (o.ghosts && o.ghosts.length) {
    const n = o.ghosts.length;
    o.ghosts.forEach((GJ, i) => {
      const gs = build(GJ, P, s).filter(g => {
        if (g.torso) return false;
        return Math.max(moveOf(P, GJ, J, g.idx), g.idx >= 2 ? moveOf(P, GJ, J, g.idx + 3) : 0) > o.h * 0.03;
      });
      if (!gs.length) return;
      c.globalAlpha = 0.1 + 0.3 * (i + 1) / n; c.strokeStyle = col; c.lineWidth = lw * 1.4;
      for (const g of gs) for (const sh of g.shapes) { trace(c, sh); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = bg;
      for (const g of gs) for (const sh of g.shapes) { trace(c, sh); c.fill(); }
    });
  }
  // 本体：部位ごとに「白い線（外側）→ 黒くぬる」を奥から手前へ。
  // 胴より手前の腕・脚は、つけ根の丸い線を出さない（肩・股関節のまわりは胴の線を見せる）
  let torsoDone = false;
  for (const g of cur) {
    const clip = torsoDone && g.excl;
    if (clip) { c.save(); c.beginPath(); c.rect(-1e5, -1e5, 2e5, 2e5); c.arc(g.excl[0], g.excl[1], g.excl[2] + lw, 0, TAU); c.clip('evenodd'); }
    c.globalAlpha = g.far ? 0.78 : 1; c.strokeStyle = col; c.lineWidth = lw * 2;
    for (const sh of g.shapes) { trace(c, sh); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = bg;
    for (const sh of g.shapes) { trace(c, sh); c.fill(); }
    if (clip) c.restore();
    c.globalAlpha = g.far ? 0.7 : 0.9; c.lineWidth = lw * 0.8; c.strokeStyle = col;
    for (const l of g.lines) {
      c.beginPath(); c.moveTo(l[0][0], l[0][1]);
      if (l[2]) c.quadraticCurveTo(l[2][0], l[2][1], l[1][0], l[1][1]); else c.lineTo(l[1][0], l[1][1]);
      c.stroke();
    }
    // 動く手足の先は白くぬる（どこが動くか、ひと目で）
    if (act >= 0 && g.idx === limbOf(act) && g.tip) { c.globalAlpha = 1; c.fillStyle = col; for (const sh of g.tip) { trace(c, sh); c.fill(); } }
    if (g.torso) torsoDone = true;
  }
  c.globalAlpha = 1;
  const imp = o.impact !== undefined && o.impact >= 0 && o.impact < 1;
  // 先の動き：矢印（これから手足が通る道）と、次に当たる場所の印
  if (act >= 0 && o.future && !imp) {
    const cur0 = P(endOf(J, act)), pts = [cur0];
    for (const FJ of o.future) pts.push(P(endOf(FJ, act)));
    const T = P(endOf(o.contact, act));
    if (o.toNext !== undefined && o.toNext <= FUTURE[FUTURE.length - 1] + 0.1) pts.push(T);
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len > o.h * 0.06 && pts.length >= 2) {
      const a0 = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]), off = o.h * 0.05;   // 手足の先から少し離して始める
      pts[0] = [pts[0][0] + Math.cos(a0) * off, pts[0][1] + Math.sin(a0) * off];
      arrow(c, pts.map(p => [p[0], p[1]]), lw * 1.5, col, Math.min(0.9, 0.35 + len / (o.h * 0.5)));
    }
    // 次に当たる場所：小さな印（輪と点）
    if (Math.hypot(T[0] - cur0[0], T[1] - cur0[1]) > o.h * 0.06 && (o.toNext === undefined || o.toNext <= 0.6)) {
      const r = o.h * 0.028;
      c.globalAlpha = 0.85; c.strokeStyle = col; c.lineWidth = lw * 0.9;
      c.beginPath(); c.arc(T[0], T[1], r, 0, TAU); c.stroke();
      c.beginPath(); c.arc(T[0], T[1], r * 0.35, 0, TAU); c.fillStyle = col; c.fill();
      c.globalAlpha = 1;
    }
  }
  // 当たる瞬間：手足のまわりに線がはじける
  if (imp && o.ghosts && o.ghosts.length) {
    // いま当たった手足＝直前にいちばん速く動いていたもの
    const prev = o.ghosts[o.ghosts.length - 1]; let bv = 0, bi = -1;
    for (let i = 0; i < 7; i++) { if (i === 4) continue; const v = moveOf(P, prev, J, i) * wgt[i]; if (v > bv) { bv = v; bi = i; } }
    const best = bi >= 0 && bv > o.h * 0.012 ? P(bi < 2 ? add(J.wr[bi], mul(nrm(sub(J.wr[bi], J.elb[bi])), 0.08)) : endOf(J, bi)) : null;
    if (best) {
      const e = o.impact, r0 = o.h * (0.06 + 0.11 * e), r1 = r0 + o.h * 0.06 * (1 - e);
      c.globalAlpha = 1 - e; c.strokeStyle = col; c.lineWidth = lw * 1.2;
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2; c.moveTo(best[0] + Math.cos(a) * r0, best[1] + Math.sin(a) * r0); c.lineTo(best[0] + Math.cos(a) * r1, best[1] + Math.sin(a) * r1); }
      c.stroke(); c.globalAlpha = 1;
    }
  }
  c.restore();
}
