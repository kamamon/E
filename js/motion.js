/* =========================================================================
   IMMERSE FIT — motion.js
   コーチの体を動かすエンジン（ポーズ → 関節位置）
   ・座標系：コーチの足元が原点。X＝画面の右（ミラーなのでユーザーの右）、Y＝上、Z＝手前
   ・手足は「右側」を外向きプラスで書けば、左は自動で左右反転されます
   ========================================================================= */
export const D2R = Math.PI / 180, TAU = Math.PI * 2;

// 体の寸法（メートル）
export const B = {
  hipY: 0.95, hipW: 0.105, hipDrop: 0.02, waist: 0.11, spine: 0.36,
  shW: 0.19, UA: 0.29, FA: 0.27, TH: 0.44, SH: 0.43, ANK: 0.075, FOOT: 0.2,
  head: 0.16,
};
export const SPN = B.waist + B.spine;           // 骨盤→肩の中心
export const LEG = B.TH + B.SH;                  // 股関節→足首
export const ARMLEN = B.UA + B.FA;

/* ---------- 数学 ---------- */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = a => Math.sqrt(dot(a, a));
export const norm = a => { const l = len(a); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0]; };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpA = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
export const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const cw = t => 0.5 - 0.5 * Math.cos(TAU * t);            // 0→1→0
export const fr = x => x - Math.floor(x);
export const bump = (u, a, b) => (u <= a || u >= b) ? 0 : Math.sin(Math.PI * (u - a) / (b - a));

// クォータニオン [x,y,z,w]
export const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const qax = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
// e = [pitch(X), yaw(Y), roll(Z)] / 順番 YXZ（向く→前傾→横傾き）
export const qe = e => qmul(qmul(qax([0, 1, 0], e[1]), qax([1, 0, 0], e[0])), qax([0, 0, 1], e[2] || 0));
export function qrot(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w - iw * x - iy * z + iz * y, iy * w - iw * y - iz * x + ix * z, iz * w - iw * z - ix * y + iy * x];
}
export function qslerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
  if (d < 0) { d = -d; bb = b.map(x => -x); }
  if (d > 0.9995) { const r = a.map((x, i) => x + (bb[i] - x) * t); const l = Math.hypot(...r); return r.map(x => x / l); }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((x, i) => x * wa + bb[i] * wb);
}
// ベクトルの球面補間（腕を弧を描いて動かすため）
export function vslerp(a, b, t, hint = [0, 0, 1]) {
  const la = len(a), lb = len(b);
  if (la < 1e-6 || lb < 1e-6) return lerp3(a, b, t);
  const ua = mul(a, 1 / la), ub = mul(b, 1 / lb);
  let d = clamp(dot(ua, ub), -1, 1);
  const L = lerp(la, lb, t);
  if (d > 0.999) return mul(norm(lerp3(ua, ub, t)), L);
  let th = Math.acos(d), ax;
  if (d < -0.995) { ax = norm(cross(ua, hint)); if (len(cross(ua, hint)) < 1e-4) ax = norm(cross(ua, [1, 0, 0])); }
  else ax = norm(cross(ua, ub));
  const q = qax(ax, th * t);
  return mul(qrot(q, ua), L);
}
const perp = d => Math.abs(d[1]) < 0.9 ? norm(cross(d, [0, 1, 0])) : norm(cross(d, [1, 0, 0]));

/* ---------- 手足の指定（外向き＋座標） ---------- */
// 腕（肩基準）: el 上下角(-90下〜90上) az 水平角(0横・90前・-90後ろ・180反対側) bend ひじの曲げ bd 曲げる方向
export function A(el, az = 0, bend = 8, bd = [0, 0, 1], f = 'c') {
  const e = el * D2R, a = az * D2R;
  const d1 = [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
  let n = sub(bd, mul(d1, dot(bd, d1)));
  if (len(n) < 1e-3) { n = sub([0, 0, 1], mul(d1, d1[2])); if (len(n) < 1e-3) n = [0, 1, 0]; }
  n = norm(n);
  const b = bend * D2R, d2 = add(mul(d1, Math.cos(b)), mul(n, Math.sin(b)));
  return { f, p: add(mul(d1, B.UA), mul(d2, B.FA)), pole: sub(d1, mul(n, 0.25)) };
}
export const AT = (x, y, z, pole = [0.5, -0.7, -0.5], f = 'c') => ({ f, p: [x, y, z], pole });
export const AG = (x, y, z, pole = [0.4, 0.2, -1]) => ({ f: 'g', p: [x, y, z], pole });
export const AW = (x, y, z, pole = [0.3, -0.2, 1]) => ({ f: 'sw', p: [x, y, z], pole });
// 胸の中心からの点（符号つきX）→ 指定側の肩基準の外向き座標へ
export const fromChest = (s, p) => [s * p[0] - B.shW, p[1], p[2]];

// 脚（股関節基準）: flex 前上げ角 abd 外へ開く角 knee ひざ曲げ turn 外旋 point つま先を伸ばす
export function L(flex = 0, abd = 0, knee = 0, turn = 0, point = 0, f = 'p') {
  const fl = flex * D2R, k = knee * D2R, a = abd * D2R, tu = turn * D2R;
  let th = [0, -Math.cos(fl), Math.sin(fl)], sh = [0, -Math.cos(fl - k), Math.sin(fl - k)];
  let fw = [0, Math.sin(fl - k), Math.cos(fl - k)], tf = [0, Math.sin(fl), Math.cos(fl)];
  const ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tu), st = Math.sin(tu);
  const T = v => { const x = v[0] * ca - v[1] * sa, y = v[0] * sa + v[1] * ca, z = v[2]; return [x * ct + z * st, y, -x * st + z * ct]; };
  th = T(th); sh = T(sh); fw = T(fw); tf = T(tf);
  return { f, p: add(mul(th, B.TH), mul(sh, B.SH)), pole: add(th, mul(tf, 0.25)), fd: norm(add(mul(fw, 1 - point), mul(sh, point))) };
}
// 床についた足: x 外側への距離 z 前後 turn つま先の外向き heel かかと上げ toeUp つま先上げ
export function F(x = 0.11, z = 0.02, turn = 8, heel = 0, toeUp = 0) {
  const tr = turn * D2R;
  const p = heel > 0.001 ? Math.asin(Math.min(0.95, heel / (B.FOOT * 0.8))) : -toeUp * D2R;
  return {
    f: 'g', plant: 1, p: [x, B.ANK + heel, z],
    pole: [Math.sin(tr) + 0.25, 0.04, Math.cos(tr)],
    fd: [Math.sin(tr) * Math.cos(p), -Math.sin(p), Math.cos(tr) * Math.cos(p)],
  };
}
export const FT = (x, y, z, pole = [0.2, 0, 1], fd = null, f = 'g') => ({ f, p: [x, y, z], pole, fd });
export const mixS = (a, b, t) => t <= 0.0001 ? a : t >= 0.9999 ? b : { f: 'mix', a, b, t };

// よく使う腕の位置
export const ARM = {
  rest: A(-80, 12, 12, [0, 0, 1]),
  hips: AT(-0.03, -0.40, 0.03, [1, 0.1, -0.6]),
  chest: AT(-0.155, -0.13, 0.21, [1, -0.7, -0.3]),
  head: AT(-0.12, 0.22, -0.09, [1, 0.25, 0.1]),
  guard: AT(-0.10, 0.09, 0.19, [0.25, -1, 0.05]),
  fwd: A(-4, 95, 4, [0, 1, 0]),
  t: A(0, 0, 4, [0, 1, 0]),
  up: A(82, 8, 4, [0, 0, 1]),
  y: A(50, 24, 4, [0, 0, 1]),
  goal: A(0, -4, 92, [0, 1, 0]),
  w: A(-28, -32, 100, [0, 1, 0]),
  low: A(-55, 45, 10, [0, 0, 1]),
  back: AT(0.04, -0.50, -0.16, [0.2, 0, 1]),
  prayer: AT(-0.17, -0.10, 0.24, [1, -0.6, -0.4]),
  jack: A(82, 0, 4, [0, 0, 1]),
};

/* ---------- 動きのカーブ ---------- */
export const K = {
  n: t => cw(t),                                                        // ふつう
  d: t => t < 0.75 ? cw(t / 0.75 * 0.5) : cw(0.5 + (t - 0.75) / 0.25 * 0.5), // ゆっくり下ろして速く戻す
  p: t => 0.74 + 0.26 * cw(fr(t * 2)),                                   // パルス（端で小刻みに）
  h: t => 0.9 + 0.1 * cw(fr(t * 4)),                                     // キープ
  x: t => t < 0.26 ? sm(t / 0.26) : t < 0.4 ? 1 : 1 - sm((t - 0.4) / 0.42), // スナップ（パンチ）
  o: t => { const u = t * 4; return u < 1 ? sm(u) : u < 2 ? 1 - 0.5 * sm(u - 1) : u < 3 ? 0.5 + 0.5 * sm(u - 2) : 1 - sm(u - 3); }, // 1.5回
};

// 左右の位相: 戻り値 [左, 右]（-1は休み）
export function sidePh(t, mode, side) {
  switch (mode) {
    case 'alt': return t < 0.5 ? [-1, t * 2] : [(t - 0.5) * 2, -1];
    case 'one': return side === 'L' ? [t, -1] : [-1, t];
    case 'opp': return [fr(t + 0.5), t];
    default: return [t, t];
  }
}
// 左右それぞれに f(s, key, 量, 位相) を呼ぶ
export function each(P, t, o, f) {
  const ph = sidePh(t, o.mode, o.side);
  for (let i = 0; i < 2; i++) { const p = ph[i]; f(i ? 1 : -1, i ? 'R' : 'L', p < 0 ? 0 : o.k(p) * o.amp, p); }
}
// キーフレーム補間 pts=[[u,値],...]
export function path(pts, u) {
  if (u <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (u <= b[0]) { const k = sm((u - a[0]) / ((b[0] - a[0]) || 1)); return Array.isArray(a[1]) ? lerpA(a[1], b[1], k) : lerp(a[1], b[1], k); }
  }
  return pts[pts.length - 1][1];
}

/* ---------- ポーズ ---------- */
export function base() {
  return {
    root: [0, B.hipY, 0], rot: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0],
    hand: { L: ARM.rest, R: ARM.rest }, foot: { L: F(), R: F() },
    shrug: [0, 0], prot: [0, 0], fist: [0.35, 0.35], lift: 0, noGround: 0,
  };
}
export function mirrorP(P) {
  P.hand = { L: P.hand.R, R: P.hand.L }; P.foot = { L: P.foot.R, R: P.foot.L };
  P.shrug = [P.shrug[1], P.shrug[0]]; P.prot = [P.prot[1], P.prot[0]]; P.fist = [P.fist[1], P.fist[0]];
  P.root[0] = -P.root[0]; P.rot[1] = -P.rot[1]; P.rot[2] = -P.rot[2];
  P.chest[1] = -P.chest[1]; P.chest[2] = -P.chest[2]; P.neck[1] = -P.neck[1]; P.neck[2] = -(P.neck[2] || 0);
  return P;
}

const SIDES = [['L', -1, 0], ['R', 1, 1]];
const hipOf = (pel, qp, s) => add(pel, qrot(qp, [s * B.hipW, -B.hipDrop, 0]));

function specG(sp, s, c) {
  if (sp.f === 'mix') {
    const a = specG(sp.a, s, c), b = specG(sp.b, s, c), t = sp.t;
    return { t: lerp3(a.t, b.t, t), pole: norm(lerp3(a.pole, b.pole, t)), fd: a.fd && b.fd ? norm(lerp3(a.fd, b.fd, t)) : (t < 0.5 ? a.fd : b.fd) };
  }
  const m = v => [s * v[0], v[1], v[2]];
  let t, pole, fd = sp.fd ? m(sp.fd) : null;
  switch (sp.f) {
    case 'c': t = add(c.sh, qrot(c.qc, m(sp.p))); pole = qrot(c.qc, m(sp.pole)); break;
    case 'sw': t = add(c.sh, m(sp.p)); pole = m(sp.pole); break;
    case 'p': t = add(c.hp, qrot(c.qp, m(sp.p))); pole = qrot(c.qp, m(sp.pole)); if (fd) fd = qrot(c.qp, fd); break;
    case 'hw': t = add(c.hp, m(sp.p)); pole = m(sp.pole); break;
    default: t = m(sp.p); t[1] += c.lift; pole = m(sp.pole);
  }
  return { t, pole: norm(pole), fd };
}
// ポーズ → 地面座標の中間表現（ブレンドできる形）
export function resolve(P) {
  let qp = qe(P.rot); if (P.tw) qp = qmul(qp, qax([0, 1, 0], P.tw));       // tw: 背骨を軸にしたひねり
  const qc = qmul(qp, qe(P.chest)), qh = qmul(qc, qe(P.neck));
  const pel = [P.root[0], P.root[1] + P.lift, P.root[2]];
  if (!P.noGround) {               // 床についた足に届くよう骨盤を下げる
    const reach = LEG * 0.998; let drop = 0;
    for (const [k, s] of SIDES) {
      const sp = P.foot[k]; if (!sp || sp.f !== 'g') continue;
      const tg = [s * sp.p[0], sp.p[1] + P.lift, sp.p[2]], h = hipOf(pel, qp, s);
      const dx = h[0] - tg[0], dz = h[2] - tg[2], r2 = reach * reach - dx * dx - dz * dz;
      if (r2 <= 0) continue;
      const need = (h[1] - tg[1]) - Math.sqrt(r2); if (need > drop) drop = need;
    }
    pel[1] -= drop;
  }
  const waist = add(pel, qrot(qp, [0, B.waist, 0])), shc = add(waist, qrot(qc, [0, B.spine, 0]));
  const R = { pel, qp, qc, qh, shrug: [...P.shrug], prot: [...P.prot], fist: [...P.fist], hand: [], foot: [], sh: [], hp: [] };
  for (const [k, s, i] of SIDES) {
    const sh = add(shc, qrot(qc, [s * B.shW, P.shrug[i], P.prot[i]])), hp = hipOf(pel, qp, s);
    R.sh[i] = sh; R.hp[i] = hp;
    R.hand[i] = specG(P.hand[k], s, { sh, qc, qp, hp, lift: P.lift });
    R.foot[i] = specG(P.foot[k], s, { sh, qc, qp, hp, lift: P.lift });
  }
  return R;
}
// 2つの中間表現をなめらかに混ぜる（手足は関節を中心に弧を描く）
export function blendR(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const lb = (x, y, ox, oy, o) => {
    const v = vslerp(sub(x.t, ox), sub(y.t, oy), t, x.pole), tt = add(o, v);
    const floor = Math.min(x.t[1], y.t[1]);                 // 床の近くでは床の下へもぐらせない
    if (floor < 0.25 && tt[1] < floor) tt[1] = floor;
    return { t: tt, pole: norm(lerp3(x.pole, y.pole, t)), fd: x.fd && y.fd ? norm(lerp3(x.fd, y.fd, t)) : (t < 0.5 ? x.fd : y.fd) };
  };
  const sh = [lerp3(a.sh[0], b.sh[0], t), lerp3(a.sh[1], b.sh[1], t)], hp = [lerp3(a.hp[0], b.hp[0], t), lerp3(a.hp[1], b.hp[1], t)];
  return {
    pel: lerp3(a.pel, b.pel, t), qp: qslerp(a.qp, b.qp, t), qc: qslerp(a.qc, b.qc, t), qh: qslerp(a.qh, b.qh, t),
    shrug: lerpA(a.shrug, b.shrug, t), prot: lerpA(a.prot, b.prot, t), fist: lerpA(a.fist, b.fist, t), sh, hp,
    hand: [0, 1].map(i => lb(a.hand[i], b.hand[i], a.sh[i], b.sh[i], sh[i])),
    foot: [0, 1].map(i => lb(a.foot[i], b.foot[i], a.hp[i], b.hp[i], hp[i])),
  };
}
// 2関節IK
export function two(A0, T, l1, l2, pole, floorY = -1) {
  const d = sub(T, A0); let dist = len(d);
  const dir = dist > 1e-6 ? mul(d, 1 / dist) : [0, -1, 0];
  dist = clamp(dist, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9995);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let pp = sub(pole, mul(dir, dot(pole, dir))); pp = len(pp) < 1e-5 ? perp(dir) : norm(pp);
  const base0 = add(A0, mul(dir, a)), end = add(A0, mul(dir, dist));
  let mid = add(base0, mul(pp, h));
  // 関節が床にもぐる場合は、反対側の解（床の上）を使う
  if (floorY > -1 && mid[1] < floorY && A0[1] > floorY + 0.02 && end[1] > floorY - 0.01) {
    const alt = add(base0, mul(pp, -h)); if (alt[1] > mid[1]) mid = alt;
  }
  return [mid, end];
}
// 中間表現 → 関節の位置
export function ikSolve(R) {
  const { pel, qp, qc, qh } = R, J = { pel, qp, qc, qh, fist: R.fist };
  J.waist = add(pel, qrot(qp, [0, B.waist, 0]));
  J.shc = add(J.waist, qrot(qc, [0, B.spine, 0]));
  J.chestC = add(J.waist, qrot(qc, [0, 0.2, 0]));
  J.neck = add(J.shc, qrot(qc, [0, 0.035, 0]));
  J.head = add(J.neck, qrot(qh, [0, B.head, 0.012]));
  J.sh = [0, 1].map(i => add(J.shc, qrot(qc, [(i ? 1 : -1) * B.shW, R.shrug[i], R.prot[i]])));
  J.hip = [0, 1].map(i => hipOf(pel, qp, i ? 1 : -1));
  J.elb = []; J.wr = []; J.kn = []; J.an = []; J.toe = []; J.fd = [];
  const front = qrot(qp, [0, 0, 1]);
  for (let i = 0; i < 2; i++) {
    const a = two(J.sh[i], R.hand[i].t, B.UA, B.FA, R.hand[i].pole, 0.03); J.elb[i] = a[0]; J.wr[i] = a[1];
    const l = two(J.hip[i], R.foot[i].t, B.TH, B.SH, R.foot[i].pole, 0.035); J.kn[i] = l[0]; J.an[i] = l[1];
    let fd = R.foot[i].fd;
    if (!fd) { const shn = norm(sub(J.an[i], J.kn[i])); fd = norm(sub(front, mul(shn, dot(front, shn)))); }
    J.fd[i] = fd; J.toe[i] = add(J.an[i], mul(fd, B.FOOT));
  }
  return J;
}

/* ---------- 床の姿勢をつくる道具 ---------- */
// S と A を結ぶ線の上側（up=1）にある「頂点」H：|H-S|=r1, |H-A|=r2（YZ平面）
export function apex(S, A0, r1, r2, up = 1) {
  const dy = A0[1] - S[1], dz = A0[2] - S[2], d = Math.hypot(dy, dz);
  if (d >= r1 + r2 - 1e-6) { const k = r1 / d; return [0, S[1] + dy * k, S[2] + dz * k]; }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  let py = -dz / d, pz = dy / d; if ((py < 0) === (up > 0)) { py = -py; pz = -pz; }
  return [0, S[1] + dy * a / d + py * h, S[2] + dz * a / d + pz * h];
}
// 骨盤を、肩の中心 S を向くように置く（前後の傾きのみ）
export function aimSpine(P, H, S) {
  const u = norm(sub(S, H));
  P.root = add(H, mul(u, B.hipDrop)); P.rot = [Math.atan2(u[2], u[1]), 0, 0]; P.chest = [0, 0, 0];
  return u;
}
// プランク（頭は手前＝+Z）。o: sy 肩の高さ / kn ひざつき / fa ひじつき / pike お尻を上げる量 / hw 手幅 / zs 手の位置
export function plank(P, o = {}) {
  const zs = o.zs ?? 0.42, hw = o.hw ?? 0.17;
  const top = o.fa ? 0.345 : 0.585;
  const sy = o.sy ?? top;
  const Ay = o.kn ? 0.065 : 0.14;
  const leg = o.kn ? B.TH : LEG * 0.996;
  const Lt = leg + B.hipDrop + SPN;
  const za = zs - Math.sqrt(Lt * Lt - (top - Ay) ** 2);
  let S = [0, sy, za + Math.sqrt(Math.max(1e-4, Lt * Lt - (sy - Ay) ** 2)) + (o.sz || 0)];
  if (o.pike) S = lerp3(S, [0, 0.42 - 0.2 * (o.pd || 0), zs - 0.26 + 0.05 * (o.pd || 0)], o.pike);
  const Ap = [0, Ay, za];
  const H = apex(S, Ap, SPN + B.hipDrop, leg, 1);
  aimSpine(P, H, S);
  P.neck = [o.pike ? -0.2 * o.pike : -0.15, 0, 0];
  const pole = o.fa ? [0, -1, -0.7] : (o.pole || [0.55, 0.25, -1]);
  const hand = o.fa ? AG(hw - 0.06, 0.05, S[2] + 0.25, pole) : AG(hw, 0.05, zs, pole);
  P.hand = { L: hand, R: hand };
  const foot = o.kn
    ? FT(0.1, Ay + 0.24, za - 0.34, [0, -1, 0.15], [0, 0.55, -0.83])
    : FT(0.1, Ay, za, [0, -0.6, 1], [0, -0.75, 0.66]);
  P.foot = { L: foot, R: foot };
  P.fist = [0, 0];
  return { S, za, zs, Ay, hw };
}
// 四つ這い（手は肩の下、ひざは股関節の下）
export function quad(P, o = {}) {
  const zs = o.zs ?? 0.36, sy = o.sy ?? 0.585, hipY = (o.hover ? 0.055 : 0) + B.TH + 0.06;
  const dz = Math.sqrt((SPN + B.hipDrop) ** 2 - (sy - hipY) ** 2);
  const H = [0, hipY, zs - dz], S = [0, sy, zs];
  aimSpine(P, H, S);
  P.neck = [-0.1, 0, 0];
  const hand = AG(0.17, 0.05, zs, [0.4, 0.3, -1]);
  P.hand = { L: hand, R: hand };
  const kz = H[2];
  const foot = o.hover ? FT(0.1, 0.14, kz - 0.4, [0, -1, 0.2], [0, -0.75, -0.66]) : FT(0.1, 0.085, kz - 0.42, [0, -1, 0.2], [0, -0.3, -0.95]);
  P.foot = { L: foot, R: foot };
  P.fist = [0, 0];
  return { H, S, kz };
}
// あお向け（頭は奥＝-Z）。o.lift お尻を上げる高さ / o.legs: 'bent'|'straight'
export function supine(P, o = {}) {
  const zp = o.zp ?? 0.12, lift = o.lift || 0, y0 = 0.11;
  const S = [0, y0, zp - SPN];
  const dz = Math.sqrt(Math.max(1e-4, SPN * SPN - lift * lift));
  const pel = [0, y0 + lift, S[2] + dz];
  const u = norm(sub(S, pel));
  P.root = pel; P.rot = [Math.atan2(u[2], u[1]), 0, 0]; P.chest = [0, 0, 0];
  P.neck = [Math.asin(clamp(lift / SPN, 0, 1)), 0, 0];
  const hand = AG(0.25, 0.05, zp + 0.06, [0.3, 1, 0]);
  P.hand = { L: hand, R: hand };
  const foot = o.legs === 'straight' ? FT(0.11, 0.08, zp + 0.88, [0, 1, 0.2], [0, 0.7, 0.7]) : FT(0.12, B.ANK, zp + 0.5, [0.1, 1, 0.25], [0, 0, 1]);
  P.foot = { L: foot, R: foot };
  return { S, zp };
}
// うつ伏せ（頭は手前＝+Z）
export function prone(P, o = {}) {
  const zp = o.zp ?? -0.28;
  P.root = [0, 0.115, zp]; P.rot = [Math.PI / 2, 0, 0]; P.chest = [0, 0, 0]; P.neck = [-0.15, 0, 0];
  const hand = AG(0.16, 0.05, zp + SPN + 0.5, [0.3, 1, -0.2]);
  P.hand = { L: hand, R: hand };
  const foot = FT(0.1, 0.07, zp - 0.89, [0, -1, 0], [0, -0.35, -0.94]);
  P.foot = { L: foot, R: foot };
  return { zp };
}
// 横向き寝（左を下・頭は左＝-X、上の脚は右）
export function sideLie(P, o = {}) {
  P.root = [o.x ?? 0.32, 0.17, 0]; P.rot = [0, 0, Math.PI / 2]; P.chest = [0, 0, -0.21]; P.neck = [0, 0, -0.15];
  P.hand = { L: AG(0.98, 0.06, 0.04, [0, 1, -0.3]), R: AG(-0.15, 0.06, 0.3, [0.2, 1, 0.2]) };
  P.foot = { L: L(8, 0, 4), R: L(8, -3, 4) };
  P.noGround = 1;
}
// 床に座る（上体を後ろへ倒す）
export function seatF(P, o = {}) {
  const lean = o.lean ?? 0.62;
  P.root = [0, 0.13, -0.05]; P.rot = [-lean, 0, 0]; P.chest = [o.cf ?? 0.2, 0, 0]; P.neck = [0.1, 0, 0];
  const ft = FT(0.13, B.ANK, 0.5, [0.15, 1, 0.3], [0, 0, 1]);
  P.foot = { L: ft, R: ft };
  P.hand = { L: ARM.prayer, R: ARM.prayer };
  P.noGround = 1;
}
