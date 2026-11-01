/* 引く — 綱引き・旗あげ・大根ぬき・釣り・ひも・弓 など
   p=0 が引ききった所（手が手前・下で大きい＝結果が出る）、p=1 が手を前に伸ばしてつかむ所 */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const PI = Math.PI;

/* =========================================================================
   共通
   ========================================================================= */
// 引いた量 D（0 → 1 → 2）。手を引いている間だけ進み、手を伸ばす間は止まる（つかみ直し）
function pulled(s) {
  const m = s.my;
  if (m.pk !== s.k) { m.pk = s.k; m.pm = s.p; }
  if (s.p > m.pm) m.pm = s.p;
  m.q = m.pm > 0.08 ? clamp((m.pm - s.p) / m.pm) : 0;
  return Math.min(2, s.k + m.q);
}
// 2次ベジェにそった点 [x, y, 法線x, 法線y, 太さ]
function ropePts(x0, y0, cx, cy, x1, y1, r0, r1, N = 16) {
  const P = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
    const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), d = Math.hypot(tx, ty) || 1, r = lerp(r0, r1, t);
    P.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1, -ty / d * r, tx / d * r, r]);
  }
  return P;
}
// ロープ（太さ r0 → r1、ねじれ模様は off で流れる）。点の配列を返す
function rope(g, x0, y0, cx, cy, x1, y1, r0, r1, col, off = 0, o = {}) {
  const P = ropePts(x0, y0, cx, cy, x1, y1, r0, r1), L = [], R = [];
  for (const [x, y, nx, ny] of P) { L.push(x + nx, y + ny); R.unshift(x - nx, y - ny); }
  g.poly(L.concat(R), col, o.ol ?? 6);
  const n = o.n ?? 11, st = o.stripe ?? sh(col, -0.25);
  for (let j = 0; n > 0 && j <= n; j++) {
    const t = (j + ((off % 1) + 1) % 1 - 1) / n; if (t < 0 || t > 1) continue;
    const [x, y, nx, ny, r] = at(P, t);
    g.line([x + nx * 0.85 - ny * 0.55, y + ny * 0.85 + nx * 0.55, x - nx * 0.85 + ny * 0.55, y - ny * 0.85 - nx * 0.55], st, Math.max(2, r * 0.3));
  }
  return P;
}
function at(P, t) {
  const N = P.length - 1, f = clamp(t) * N, i = Math.min(N - 1, Math.floor(f)), k = f - i, A = P[i], B = P[i + 1];
  return [lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k), lerp(A[3], B[3], k), lerp(A[4], B[4], k)];
}
// くさり（輪が交互に向きを変える）
function chain(g, P, off) {
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const t = (i + ((off % 1) + 1) % 1 - 1) / n; if (t < 0 || t > 1) continue;
    const [x, y, , , r] = at(P, t), [x2, y2] = at(P, Math.min(1, t + 0.02)), a = Math.atan2(y2 - y, x2 - x);
    if ((i + Math.floor(off)) % 2) g.ell(x, y, r * 1.55, r * 0.42, '#8f99ad', Math.max(3, r * 0.28), a);
    else { const c = g.ctx; c.beginPath(); c.ellipse(x, y, r * 1.5, r * 0.95, a, 0, PI * 2); c.lineWidth = Math.max(3, r * 0.5) + 6; c.strokeStyle = C.ol; c.stroke(); c.lineWidth = Math.max(3, r * 0.5); c.strokeStyle = '#ccd4e0'; c.stroke(); }
  }
}
// 多角形で切り抜く（毎フレーム形が変わるものは g.clipPath ではなくこちら）
function clipPoly(g, pts, fn) { const c = g.ctx; c.save(); c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.clip(); fn(); c.restore(); }
// g.mirror の中でも文字が裏返らないように書く
function textU(g, side, str, x, y, o) { g.at(x, y, 0, side === 'L' ? -1 : 1, 1, () => g.text(str, 0, 0, o)); }
// ロープ上で y の位置の x
function ropeX(P, y) {
  for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) return lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1])); }
  return P[y < P[0][1] ? 0 : P.length - 1][0];
}
// ロープを手でつかむ（both=両手いっしょに、alt=たぐり寄せ、one=片手）。y0: p=0 の手の高さ、y1: p=1
function gripRope(g, s, P, o = {}) {
  const alt = s.mode === 'alt', one = s.mode === 'one', y0 = o.y0 ?? 915, y1 = o.y1 ?? 690, hs = [];
  for (const side of one ? [s.side] : ['L', 'R']) {
    const sg = side === 'L' ? -1 : 1, p = alt ? (s.side === side ? s.p : 1 - s.p) : s.p;
    let y = lerp(y0, y1, p);
    if (!alt && !one && side === (o.front ?? 'L')) y -= lerp(o.gap0 ?? 128, o.gap1 ?? 100, p);
    hs.push({ side, sg, p, y, sc: lerp(1.1, 0.8, clamp((y0 - y) / (y0 - y1 + 110))) });
  }
  hs.sort((a, b) => a.y - b.y);
  for (const h of hs) g.arm(ropeX(P, h.y) + h.sg * 4, h.y, -PI / 2 - h.sg * lerp(o.a0 ?? 1.05, o.a1 ?? 0.55, h.p), { hand: 'grip', side: h.side, s: h.sc, sleeve: o.sleeve });
  return hs;
}
function pennants(g, y, cols) {
  const V = g.V; g.curve([V.x0 - 40, y, 500, y + 50, V.x1 + 40, y], C.ol, 4);
  let i = 0;
  for (let x = Math.floor((V.x0 - 40) / 90) * 90; x < V.x1 + 40; x += 90, i++) {
    const t = (x - V.x0 + 40) / (V.x1 - V.x0 + 80), yy = y + 50 * 4 * t * (1 - t) * 0.92;
    g.tri(x - 24, yy, x + 24, yy, x, yy + 50, cols[i % cols.length], 4);
  }
}
const pine = (g, x, y, s) => g.at(x, y, 0, s, s, () => { g.rect(-10, -4, 20, 40, C.dwood, 4); g.tri(-70, 10, 70, 10, 0, -150, C.dgreen, 6); g.tri(-50, -50, 50, -50, 0, -170, sh(C.dgreen, 0.15), 6); g.path('M-34 -96 Q0 -130 34 -96 L0 -172 Z', '#ffffff', 0); });
const tree = (g, x, y, s, c = '#3fae5a') => g.at(x, y, 0, s, s, () => { g.rect(-14, -80, 28, 90, C.bark, 5); g.circ(0, -150, 90, c); g.circ(-44, -124, 46, sh(c, 0.12), 0); });

/* ---------- 動物など ---------- */
function bear(g, x, y, sc, rot, face, col, band) {
  g.at(x, y, rot, sc, sc, () => {
    g.ell(-34, -8, 30, 16, sh(col, -0.25)); g.ell(34, -8, 30, 16, sh(col, -0.25));
    g.rr(-62, -150, 124, 146, 54, col);
    g.ell(0, -66, 38, 46, sh(col, 0.38), 0);
    g.circ(-42, -240, 22, col); g.circ(42, -240, 22, col);
    g.circ(-42, -240, 11, sh(col, 0.4), 0); g.circ(42, -240, 11, sh(col, 0.4), 0);
    g.circ(0, -196, 62, col);
    if (band) { g.clipCirc(0, -196, 62, () => g.rect(-70, -238, 140, 22, band, 0)); g.circ(0, -196, 62, null); g.path('M50 -232 L86 -250 L80 -212 Z', band, 4); }
    g.ell(0, -172, 28, 21, sh(col, 0.45));
    g.ell(0, -182, 11, 8, C.ol, 0);
    if (face === 'strain') { g.line([-36, -212, -20, -203, -36, -194], C.ol, 6); g.line([36, -212, 20, -203, 36, -194], C.ol, 6); g.path('M-9 -158 Q0 -150 9 -158', null, 5); }
    else if (face === 'dizzy') { for (const sx of [-28, 28]) { g.line([sx - 10, -213, sx + 10, -193], C.ol, 6); g.line([sx + 10, -213, sx - 10, -193], C.ol, 6); } g.ell(0, -155, 10, 8, '#c0392b', 4); }
    else { g.circ(-26, -204, 8, C.ol, 0); g.circ(26, -204, 8, C.ol, 0); }
    g.cap(-52, -118, -12, -96, 19, col); g.cap(52, -118, 12, -96, 19, col);
  });
}
function penguin(g, x, y, sc, rot, happy) {
  g.at(x, y, rot, sc, sc, () => {
    g.ell(0, -70, 52, 72, C.navy);
    g.ell(0, -58, 36, 54, '#ffffff', 0);
    g.ell(-50, -70, 14, 34, C.navy, 6, happy ? -0.6 : 0.3); g.ell(50, -70, 14, 34, C.navy, 6, happy ? 0.6 : -0.3);
    g.circ(0, -132, 40, C.navy);
    g.ell(0, -126, 28, 24, '#ffffff', 0);
    if (happy) { g.arc(-12, -128, 7, PI + 0.3, -0.3, C.ol, 5); g.arc(12, -128, 7, PI + 0.3, -0.3, C.ol, 5); g.circ(-22, -116, 6, '#ffb3c6', 0); g.circ(22, -116, 6, '#ffb3c6', 0); }
    else { g.circ(-12, -132, 6, C.ol, 0); g.circ(12, -132, 6, C.ol, 0); }
    g.tri(-12, -118, 12, -118, 0, -102, C.orange, 4);
    g.ell(-18, -4, 18, 9, C.orange, 4); g.ell(18, -4, 18, 9, C.orange, 4);
  });
}
function shiba(g, x, y, sc, mood, t) {
  const col = '#e8964a', wh = '#fff6ea';
  g.at(x, y, 0, sc, sc, () => {
    g.shadow(0, 6, 120, 20);
    if (mood === 'happy') g.at(70, -110, 0.45 * Math.sin(t * 24), 1, 1, () => { g.circ(26, -26, 30, col); g.circ(26, -26, 14, wh, 0); });
    else g.at(78, -50, 0, 1, 1, () => { g.circ(16, -20, 26, col); g.circ(16, -20, 12, wh, 0); });
    g.ell(0, -70, 96, 74, col);
    g.ell(0, -54, 52, 50, wh, 0);
    const lean = mood === 'stub' ? 1 : 0;
    g.cap(-40, -60, -56 - 26 * lean, 0, 17, col); g.cap(40, -60, 56 + 26 * lean, 0, 17, col);
    g.ell(-58 - 26 * lean, 2, 20, 12, wh); g.ell(58 + 26 * lean, 2, 20, 12, wh);
    const hy = mood === 'stub' ? -150 : -172;
    g.at(0, hy, 0, 1, mood === 'stub' ? 0.92 : 1, () => {
      g.tri(-72, -40, -30, -66, -64, -112, col, 6); g.tri(72, -40, 30, -66, 64, -112, col, 6);
      g.tri(-62, -50, -38, -64, -58, -94, '#f7c6a0', 0); g.tri(62, -50, 38, -64, 58, -94, '#f7c6a0', 0);
      g.ell(0, 0, 84, 70, col);
      g.ell(0, 26, 54, 38, wh, 0); g.ell(-40, -24, 14, 8, wh, 0); g.ell(40, -24, 14, 8, wh, 0);
      g.ell(0, 8, 13, 9, C.ol, 0);
      if (mood === 'stub') { g.line([-46, -18, -24, -8, -46, 2], C.ol, 6); g.line([46, -18, 24, -8, 46, 2], C.ol, 6); g.path('M-14 36 Q0 26 14 36', null, 5); }
      else if (mood === 'happy') { g.arc(-32, -6, 12, PI + 0.4, -0.4, C.ol, 6); g.arc(32, -6, 12, PI + 0.4, -0.4, C.ol, 6); g.rr(-10, 28, 20, 28, 10, '#ff7a8a', 4); g.path('M-16 26 Q0 36 16 26', null, 5); }
    });
    g.rr(-50, hy + 52, 100, 18, 8, '#e8434f', 5);
    g.circ(0, hy + 72, 9, C.gold, 4);
  });
}
function chest(g, x, y, sc, open) {
  g.at(x, y, 0, sc, sc, () => {
    g.shadow(0, 4, 160, 22, 0.35);
    if (open > 0) g.glow(0, -150, 260, '#ffe27a', 0.8 * clamp(open));
    g.rr(-140, -120, 280, 120, 14, '#a0582c');
    g.rect(-140, -66, 280, 18, '#7a3f1c', 0);
    for (const bx of [-100, 100]) g.rect(bx - 14, -120, 28, 120, C.gold, 5);
    g.rr(-140, -120, 280, 120, 14, null);
    if (open > 0.05) {   // 開いた口とお宝
      g.ell(0, -120, 136, 30, '#5a2a10');
      g.ell(0, -126, 120, 22, '#ffd23f', 0);
      for (const [cx, cy, r] of [[-70, -140, 20], [-24, -152, 22], [30, -146, 20], [78, -136, 18], [4, -170, 18]]) { g.circ(cx, cy - 16 * open, r, C.gold, 4); g.circ(cx, cy - 16 * open, r * 0.55, '#ffe27a', 0); }
      { const cy = -178 - 40 * open; g.poly([-40, cy, -24, cy - 34, -6, cy - 12, 12, cy - 34, 28, cy], '#ffe27a', 5); }
      g.circ(24, -170 - 36 * open, 12, C.red, 4);
    }
    g.at(0, -120, 0, 1, 1 - 2.1 * clamp(open), () => {   // ふた（後ろへ倒れる）
      g.path('M-140 0 L-140 -52 Q0 -112 140 -52 L140 0 Z', '#b8662f');
      for (const bx of [-100, 100]) g.rect(bx - 14, -80, 28, 80, C.gold, 5);
    });
    if (open < 0.05) { g.rr(-24, -104, 48, 46, 10, C.gold, 5); g.circ(0, -86, 7, C.ol, 0); }
  });
}

/* =========================================================================
   1. ロープでたぐり寄せる（綱引き・網・そり・犬・宝箱）
   ========================================================================= */
const HAUL = [
  { k: 'tug', name: '綱引きで勝つ', short: '綱引き', theme: 'sports', sfx: ['thud', 'cheer'], sleeve: '#f4f6fb', far: [530, 1.12], near: [640, 1.62] },
  { k: 'net', name: '網を引く', short: '網', theme: 'sea', sfx: ['splash', 'splash'], sleeve: '#ff8a3d', far: [470, 1.05], near: [700, 1.6] },
  { k: 'sled', name: 'そりを引く', short: 'そり', theme: 'winter', modes: ['both', 'alt', 'one'], sfx: ['swish', 'jump'], sleeve: '#e8434f', far: [520, 1.15], near: [640, 1.75] },
  { k: 'dog', name: 'いやがる犬を引く', short: '犬の散歩', theme: 'animal', modes: ['both', 'alt', 'one'], sfx: ['squeak', 'boing'], sleeve: '#3cae6b', far: [560, 1.2], near: [650, 1.62] },
  { k: 'chest', name: '宝箱を引きよせる', short: '宝箱', theme: 'fantasy', sfx: ['thud', 'coin'], sleeve: '#8a5a36', far: [520, 1.05], near: [650, 1.62] },
  { k: 'boat', name: 'ボートを引きよせる', short: 'ボート', theme: 'sea', modes: ['both', 'alt', 'one'], sfx: ['splash', 'cheer'], sleeve: '#2ec4b6', far: [500, 0.9], near: [665, 1.42] },
];
function boatCat(g, x, y, sc, joy, t) {
  g.at(x, y, 0, sc, sc, () => {
    g.shadow(0, 40, 210, 26, 0.25);
    g.path('M-190 -50 Q0 -20 190 -50 L150 40 Q0 96 -150 40 Z', '#e8434f');
    g.path('M-178 -22 Q0 6 178 -22 L170 0 Q0 30 -170 0 Z', '#ffffff', 0);
    g.ell(0, -52, 190, 40, '#a0673c'); g.ell(0, -48, 170, 30, '#7a4a2a', 0);
    const h = joy ? -Math.abs(Math.sin(t * 10)) * 26 : 0, c = '#ffb36b';
    g.ell(0, -86 + h, 70, 56, c);
    g.circ(0, -150 + h, 56, c); g.tri(-48, -176 + h, -36, -230 + h, -10, -192 + h, c, 6); g.tri(48, -176 + h, 36, -230 + h, 10, -192 + h, c, 6);
    g.ell(0, -196 + h, 92, 16, '#f2d49b'); g.rr(-50, -246 + h, 100, 54, 22, '#f2d49b'); g.rect(-50, -212 + h, 100, 12, C.red, 0);
    if (joy) { g.arc(-20, -150 + h, 9, PI + 0.3, -0.3, C.ol, 5); g.arc(20, -150 + h, 9, PI + 0.3, -0.3, C.ol, 5); g.cap(-50, -100 + h, -90, -170 + h, 14, c); g.cap(50, -100 + h, 90, -170 + h, 14, c); }
    else { g.circ(-20, -152, 8, C.ol, 0); g.circ(20, -152, 8, C.ol, 0); g.ell(-56, -60, 18, 12, c); g.ell(56, -60, 18, 12, c); }
    g.tri(-7, -134 + h, 7, -134 + h, 0, -126 + h, '#ff8fa3', 0);
    g.circ(0, 50, 10, null, 5);
  });
}
const HAUL_DRAW = {
  tug(g, s, v, D, y, sc, aj) {
    const V = g.V;
    g.bg('#d2efff'); g.sky('#62bdf7', '#d2efff', 420); g.cloud(190, 150, 0.75); g.cloud(830, 90, 0.55);
    for (let i = 0; i < 10; i++) g.circ(V.x0 + (V.x1 - V.x0) * i / 9, 410, 70 + (i % 3) * 16, i % 2 ? '#3aa860' : '#4cbb6c', 0);
    g.rr(100, 290, 250, 110, 4, '#ffffff', 6); g.stripes(100, 290, 250, 34, 25, '#ffffff', '#e8434f'); g.rr(100, 290, 250, 34, 4, null, 6);
    g.line([110, 324, 110, 420], C.ol, 7); g.line([340, 324, 340, 420], C.ol, 7);
    g.band(410, 'bottom', '#e9c88f', 6);
    g.rect(V.x0 - 20, 600, V.x1 - V.x0 + 40, 14, '#ffffff', 0);
    pennants(g, 70, [C.red, C.yellow, C.blue, C.green, C.pink]);
    const lose = s.k >= 2 ? E.outBounce(clamp(aj / 0.4)) : 0, face = s.k >= 2 ? 'dizzy' : 'strain';
    const wob = Math.sin(s.t * 18) * 0.03 * (1 - lose) + jig(aj, 0.14, 20, 7);
    bear(g, 395 - lose * 30, y - 50 * sc, sc * 0.74, -0.08 + wob - lose * 1.3, face, '#b07f52', C.red);
    bear(g, 610 + lose * 30, y - 28 * sc, sc * 0.86, 0.08 - wob + lose * 1.25, face, '#8e5f3a', C.red);
    bear(g, 500, y, sc, wob * 0.6 + lose * 0.25, face, '#9a6a42', C.red);
    return [500 + lose * 20, y - 96 * sc];
  },
  net(g, s, v, D, y, sc, aj) {
    const V = g.V;
    g.bg('#2b9ee0'); g.sky('#5cc3ff', '#d9f3ff', 330); g.sun(820, 120, 62); g.cloud(230, 130, 0.7);
    g.band(330, 430, '#1f86cf');
    for (let r = 0; r < 4; r++) for (let x = V.x0 + (r % 2) * 80; x < V.x1; x += 160) g.arc(x + 30 * Math.sin(s.beat * 1.5 + r), 370 + r * 72, 26, PI + 0.4, -0.4, 'rgba(255,255,255,0.6)', 5);
    g.band(680, 'bottom', C.sand, 6);
    g.curve([V.x0 - 20, 686, 300, 672 + 6 * Math.sin(s.beat * 2), 700, 692, V.x1 + 20, 680], '#ffffff', 12);
    const rx = 210 * sc, ry = 80 * sc, on = s.k >= 2 ? 1 : 0;
    g.at(500, y, () => {
      g.ell(0, 0, rx, ry, g.rgba('#0b4f86', 0.6), 0);
      g.clipRR(-rx, -ry, rx * 2, ry * 2, ry, () => { for (let i = -7; i <= 7; i++) { g.line([i * 30 * sc - ry, -ry, i * 30 * sc + ry, ry], 'rgba(255,255,255,0.5)', 3); g.line([i * 30 * sc + ry, -ry, i * 30 * sc - ry, ry], 'rgba(255,255,255,0.5)', 3); } });
      for (const f of s.my.fish) {
        const sp = 1.3 + on * 1.6 + f.ph, hop = Math.abs(Math.sin((s.t * sp + f.ph) * PI)), fy = -6 * sc - hop * (36 + 46 * Math.min(D, 1) + 110 * on) * sc;
        g.at(f.x * sc, fy, (f.ph - 0.5) * 1.2 + hop * 0.7 * (f.x > 0 ? 1 : -1), sc * 1.15, sc * 1.15, () => { g.ell(0, 0, 32, 16, f.c); g.tri(28, 0, 52, -18, 52, 18, f.c, 5); g.circ(-15, -4, 4.5, C.ol, 0); });
      }
      for (let i = 0; i <= 12; i++) { const a = PI + i / 12 * PI; g.circ(Math.cos(a) * rx, Math.sin(a) * ry * 0.95, 14 * sc, i % 2 ? C.orange : '#ffd23f', 5); }
      g.ell(0, 0, rx, ry, null, 5);
    });
    return [500, y + ry * 0.9];
  },
  sled(g, s, v, D, y, sc, aj) {
    const V = g.V;
    g.bg('#f4f9ff'); g.sky('#8fd3ff', '#eef9ff', 470); g.cloud(780, 130, 0.6); g.cloud(200, 90, 0.45);
    g.hills(450, '#ffffff', 90, 4, 4); g.hills(500, '#e6f1fc', 40, 9, 5);
    for (const [tx, ty, ts] of [[150, 470, 1], [270, 440, 0.7], [840, 460, 0.9], [730, 430, 0.62]]) pine(g, tx, ty, ts);
    g.band(500, 'bottom', '#f4f9ff');
    for (const i of [-1, 1]) g.curve([500 + i * 120 * sc, y + 6, 500 + i * 150 * sc, lerp(y, 1100, 0.4), 500 + i * 230, V.y1 + 40], '#d3e4f5', 12);
    const hop = s.k >= 2 ? Math.sin(clamp(aj / 0.5) * PI) : 0;
    g.at(500, y, 0, sc, sc, () => {
      g.shadow(0, 10, 165, 18);
      g.curve([-150, 0, -172, -10, -178, -38], C.ol, 10); g.curve([150, 0, 172, -10, 178, -38], C.ol, 10);
      g.line([-150, 0, 150, 0], C.ol, 11);
      g.line([-100, 0, -100, -24], C.ol, 8); g.line([100, 0, 100, -24], C.ol, 8);
      g.rr(-164, -58, 328, 38, 10, '#e07a3f'); g.line([-60, -56, -60, -22], sh('#e07a3f', -0.3), 4); g.line([60, -56, 60, -22], sh('#e07a3f', -0.3), 4);
      const wb = jig(aj, 0.25, 18, 6);
      penguin(g, -66, -50 - hop * 100, 0.9, wb - hop * 0.25, s.k >= 2);
      penguin(g, 72, -50 - hop * 130, 0.72, -wb + hop * 0.25, s.k >= 2);
    });
    return [500, y - 34 * sc];
  },
  dog(g, s, v, D, y, sc, aj) {
    const V = g.V;
    g.bg('#7fcf5c'); g.sky('#7fd0ff', '#e3f6ff', 440);
    for (const [tx, ts] of [[130, 1], [300, 0.7], [740, 0.9], [890, 0.75]]) tree(g, tx, 450, ts);
    g.band(440, 'bottom', '#7fcf5c', 6);
    g.poly([430, 440, 570, 440, 900, V.y1 + 50, 100, V.y1 + 50], '#f1d9a8', 6);
    g.rr(650, 452, 200, 26, 6, C.wood, 5); g.line([670, 478, 670, 520], C.ol, 7); g.line([830, 478, 830, 520], C.ol, 7);
    const happy = s.k >= 2, run = happy ? E.outBack(clamp(aj / 0.3)) : 0;
    const dy = y + run * 50, ds = sc * (1 + run * 0.2) * 0.9, jy = happy ? -Math.abs(Math.sin(aj * 9)) * 34 : 0;
    shiba(g, 500, dy + jy, ds, happy ? 'happy' : 'stub', s.t);
    return [500, dy + jy - (happy ? 92 : 70) * ds];
  },
  boat(g, s, v, D, y, sc, aj) {
    const V = g.V;
    g.bg('#2b9ee0'); g.sky('#6ec6ff', '#e0f6ff', 360); g.cloud(230, 140, 0.8); g.cloud(800, 90, 0.5);
    g.hills(360, '#5fb35a', 40, 6, 3); g.rect(770, 230, 40, 130, '#ffffff', 5); g.rect(770, 270, 40, 26, C.red, 0); g.poly([760, 232, 790, 200, 820, 232], C.red, 5);
    g.band(350, 'bottom', '#2b9ee0'); g.line([V.x0 - 20, 350, V.x1 + 20, 350], 'rgba(255,255,255,0.6)', 5);
    for (let r = 0; r < 5; r++) for (let x = V.x0 + (r % 2) * 80; x < V.x1; x += 160) g.arc(x + 30 * Math.sin(s.beat * 1.5 + r), 400 + r * 80, 28, PI + 0.4, -0.4, 'rgba(255,255,255,0.55)', 5);
    const arrive = s.k >= 2 ? clamp(aj / 0.3) : 0, bob = Math.sin(s.t * 3) * 6 * (1 - arrive);
    for (let i = 0; i < 2; i++) g.arc(500, y + 40 * sc, (170 + i * 60) * sc, 0.2, PI - 0.2, 'rgba(255,255,255,0.7)', 6);
    boatCat(g, 500, y + bob, sc, s.k >= 2, s.t);
    g.rect(V.x0 - 20, 800, V.x1 - V.x0 + 40, V.y1 - 760, C.wood, 0); for (let x = Math.floor(V.x0 / 110) * 110; x < V.x1; x += 110) g.line([x, 800, x - 40, V.y1 + 60], sh(C.wood, -0.25), 5); g.line([V.x0 - 20, 800, V.x1 + 20, 800], C.ol, 7);
    for (const px of [140, 860]) { g.rr(px - 22, 740, 44, 90, 10, '#7a4a2a', 6); g.ell(px, 742, 22, 8, '#a0673c', 4); }
    return [500, y + 50 * sc + bob];
  },
  chest(g, s, v, D, y, sc, aj) {
    const V = g.V;
    g.bg('#2a1e4a', '#3b2a5c');
    for (let i = 0; i < 8; i++) g.rr(V.x0 + i * 170 - 60, 100 + (i % 2) * 60, 150, 110, 30, '#33265a', 0);
    g.poly([V.x0 - 40, 1060, 320, 420, 680, 420, V.x1 + 40, 1060, V.x1 + 40, V.y1 + 50, V.x0 - 40, V.y1 + 50], '#4a3a6e', 0);
    for (let i = 1; i < 6; i++) { const yy = lerp(420, 1060, Math.pow(i / 6, 1.6)); g.line([lerp(320, V.x0 - 40, (yy - 420) / 640), yy, lerp(680, V.x1 + 40, (yy - 420) / 640), yy], '#3e2f60', 6); }
    g.ell(500, 380, 200, 160, '#120c26', 0);
    for (const tx of [190, 810]) { g.rect(tx - 10, 300, 20, 80, C.dwood, 5); const fl = 1 + 0.12 * Math.sin(s.t * 14 + tx); g.glow(tx, 270, 140, '#ffb347', 0.5); g.at(tx, 300, 0, fl, fl, () => { g.path('M0 -70 C26 -40 30 -10 0 0 C-30 -10 -26 -40 0 -70Z', C.orange, 5); g.path('M0 -44 C12 -28 14 -10 0 -4 C-14 -10 -12 -28 0 -44Z', C.yellow, 0); }); }
    const open = s.k >= 2 ? E.outBack(clamp(aj / 0.25)) : 0;
    chest(g, 500, y, sc, open);
    return [500, y - 58 * sc];
  },
};

/* =========================================================================
   2. ロープを引くと上がる（旗・こいのぼり・井戸・幕）
   ========================================================================= */
const HOIST = [
  { k: 'flag', name: '旗をあげる', short: '旗あげ', theme: 'school', modes: ['both', 'alt', 'one'], sfx: ['swish', 'cheer'], sleeve: '#3a86ff', pul: [588, 118], end: 515 },
  { k: 'koi', name: 'こいのぼりをあげる', short: 'こいのぼり', theme: 'festival', modes: ['both', 'alt', 'one'], sfx: ['swish', 'wind'], sleeve: '#26386b', pul: [548, 112], end: 500 },
  { k: 'well', name: '井戸の水をくむ', short: '井戸', theme: 'farm', modes: ['both', 'alt', 'one'], sfx: ['splash', 'splash'], sleeve: '#a0673c', pul: [462, 248], end: 470 },
  { k: 'stage', name: '幕をあげる', short: '幕あけ', theme: 'party', modes: ['both', 'alt', 'one'], sfx: ['swish', 'cheer'], sleeve: '#1c1a26', pul: [860, 96], end: 560 },
];
function flagShape(g, x, y, w, h, wave, t) {
  const N = 8, top = [], bot = [], f = i => wave * Math.sin(i / N * 5 - t * 9) * (i / N);
  for (let i = 0; i <= N; i++) top.push(x + w * i / N, y + f(i));
  for (let i = N; i >= 0; i--) bot.push(x + w * i / N, y + h + f(i));
  return { pts: top.concat(bot), f: xx => wave * Math.sin((xx - x) / w * 5 - t * 9) * ((xx - x) / w) };
}
function carp(g, x, y, L, col, belly, inf, t, ph) {
  // 口（x, y）から右へ L の長さ。inf=1 で風をはらんで横へ、0 でだらりと下へ
  const N = 8, top = [], bot = [], ang = lerp(1.35, 0.05, inf), H = L * 0.2 * lerp(0.45, 1, inf);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pt = (u, off) => { const w = inf * 18 * Math.sin(u * 4.5 - t * 8 + ph) * u; const lx = u * L * lerp(0.85, 1, inf), ly = w + off; return [x + lx * ca - ly * sa, y + lx * sa + ly * ca]; };
  for (let i = 0; i <= N; i++) { const u = i / N, hh = H * (1 - 0.55 * u * u); top.push(...pt(u, -hh)); }
  const [tx, ty] = pt(1, 0), [t1x, t1y] = pt(1.2, -H * 0.9), [t2x, t2y] = pt(1.2, H * 0.9);
  for (let i = N; i >= 0; i--) { const u = i / N, hh = H * (1 - 0.55 * u * u); bot.push(...pt(u, hh)); }
  g.poly([tx, ty, t1x, t1y, ...pt(1.05, 0), t2x, t2y], col, 5);
  g.blob(top.concat(bot), col, 6, 0.9);
  const [bx, by] = pt(0.45, H * 0.45);
  g.circ(bx, by, H * 0.42, belly, 0);
  for (let i = 1; i < 4; i++) { const [sx, sy] = pt(0.22 + i * 0.16, -H * 0.15); g.arc(sx, sy, H * 0.3, ang + 0.6, ang + PI - 0.6, sh(col, 0.35), 4); }
  const [ex, ey] = pt(0.13, -H * 0.3);
  g.circ(ex, ey, H * 0.3, '#ffffff', 4); g.circ(ex, ey, H * 0.14, C.ol, 0);
  const [mx, my] = pt(0, 0); g.ell(mx, my, H * 0.18, H * 0.75, '#ffffff', 5, ang);
}
function catMagician(g, x, y, s, joy, t) {
  g.at(x, y, 0, s, s, () => {
    g.shadow(0, 0, 110, 18, 0.35);
    g.cap(-30, -10, -30, -70, 22, C.black); g.cap(30, -10, 30, -70, 22, C.black);
    g.rr(-70, -210, 140, 160, 60, C.black);
    g.path('M-30 -200 L30 -200 L0 -110 Z', '#ffffff', 0);
    g.tri(-26, -196, 0, -180, -26, -164, C.red, 4); g.tri(26, -196, 0, -180, 26, -164, C.red, 4);
    const wa = lerp(0.3, -1.1, joy);
    g.at(56, -170, wa, 1, 1, () => { g.cap(0, 0, 60, -40, 18, C.black); g.line([60, -40, 120, -110], C.ol, 12); g.line([60, -40, 120, -110], '#ffffff', 6); g.star(124, -116, 22, 10, 5, C.gold, 4); });
    g.cap(-56, -170, -100, -120 - 40 * joy, 18, C.black);
    g.tri(-62, -300, -20, -326, -58, -372, C.black, 6); g.tri(62, -300, 20, -326, 58, -372, C.black, 6);
    g.circ(0, -290, 70, C.black);
    g.ell(-26, -296, 14, 18 - 8 * joy, C.lemon, 4); g.ell(26, -296, 14, 18 - 8 * joy, C.lemon, 4);
    if (joy < 0.5) { g.ell(-26, -296, 5, 12, C.ol, 0); g.ell(26, -296, 5, 12, C.ol, 0); }
    g.tri(-8, -270, 8, -270, 0, -260, '#ff9fbd', 0);
    g.rr(-60, -390, 120, 30, 6, C.black); g.rr(-40, -470, 80, 90, 8, C.black); g.rect(-40, -400, 80, 16, C.red, 0);
  });
}

/* =========================================================================
   3. 抜く（だいこん・かぶ・いも・にんじん）
   ========================================================================= */
const ROOTS = [
  { k: 'daikon', name: 'だいこんを抜く', short: 'だいこん', len: 430, r: 52, c: '#fbfbf4', top: '#d6efb5', leaf: '#4fb24a', v0: 60, v1: 170, v2: 250 },
  { k: 'kabu', name: 'おおきなかぶを抜く', short: 'かぶ', len: 300, r: 150, c: '#ffffff', top: '#e9f5d0', leaf: '#3fa64a', v0: 70, v1: 150, v2: 220, round: 1 },
  { k: 'imo', name: 'おいもを掘る', short: 'いもほり', len: 0, r: 0, c: '#b0336b', leaf: '#3c9a48', vine: 1, v0: 0, v1: 0, v2: 0 },
  { k: 'carrot', name: 'にんじんを抜く', short: 'にんじん', len: 330, r: 58, c: C.carrot, top: '#ff9f43', leaf: '#3fb04f', v0: 50, v1: 140, v2: 220, ridge: 1 },
];
const HX = 500, HY = 470;
// 野菜（ローカル：くき元が 0,0、体は -y 方向へ）
function vegBody(g, v) {
  if (v.round) {
    g.path(`M0 ${-v.len} L-8 ${-v.len - 70} L8 ${-v.len - 70} Z`, sh(v.c, -0.1), 4);
    g.ell(0, -v.len * 0.5, v.r, v.len * 0.5 + 10, v.c);
    g.clipCirc(0, -v.len * 0.5, v.r * 1.1, () => { g.ell(0, -12, v.r * 0.9, 70, v.top, 0); });
    g.ell(0, -v.len * 0.5, v.r, v.len * 0.5 + 10, null);
    g.hl(-v.r * 0.45, -v.len * 0.55, v.r * 0.18, v.len * 0.22, 0.1, 0.55);
    return;
  }
  const L = v.len, R = v.r;
  g.path(`M${-R} 0 C${-R} ${-L * 0.5} ${-R * 0.5} ${-L * 0.85} 0 ${-L} C${R * 0.5} ${-L * 0.85} ${R} ${-L * 0.5} ${R} 0 Q0 ${R * 0.5} ${-R} 0 Z`, v.c);
  g.clipPath(`M${-R} 0 C${-R} ${-L * 0.5} ${-R * 0.5} ${-L * 0.85} 0 ${-L} C${R * 0.5} ${-L * 0.85} ${R} ${-L * 0.5} ${R} 0 Q0 ${R * 0.5} ${-R} 0 Z`, () => {
    g.rect(-R, -L * 0.3, R * 2, L * 0.32, g.lin(0, -L * 0.3, 0, 0, [g.rgba(v.top, 0), v.top]), 0);
    if (v.ridge) for (let i = 1; i < 6; i++) g.arc(R * 0.4 * (i % 2 ? 1 : -1), -L * i / 6.5, R * 0.7, -2.2, -0.9, sh(v.c, -0.2), 5);
    else for (let i = 1; i < 5; i++) g.line([-R * 0.5, -L * i / 5.5, -R * 0.2, -L * i / 5.5 - 6], sh(v.c, -0.12), 4);
  });
  g.hl(-R * 0.45, -L * 0.45, R * 0.16, L * 0.22, 0, 0.55);
}
function leafFan(g, v, n = 5, len = 170, spread = 1.4) {
  for (let i = 0; i < n; i++) {
    const a = -PI / 2 + (i - (n - 1) / 2) / (n - 1) * spread;
    g.at(0, 0, a + PI / 2, 1, 1, () => { g.path(`M-6 0 Q-10 ${-len * 0.5} -2 ${-len * 0.6} L2 ${-len * 0.6} Q10 ${-len * 0.5} 6 0 Z`, sh(v.leaf, -0.15), 4); g.path(`M0 ${-len * 0.3} C${-len * 0.32} ${-len * 0.55} ${-len * 0.22} ${-len * 0.95} 0 ${-len} C${len * 0.22} ${-len * 0.95} ${len * 0.32} ${-len * 0.55} 0 ${-len * 0.3} Z`, v.leaf, 5); g.line([0, -len * 0.35, 0, -len * 0.9], sh(v.leaf, -0.25), 3); });
  }
}
function potato(g, x, y, r, rot, c) { g.at(x, y, rot, 1, 1, () => { g.ell(0, 0, r * 1.5, r, c); g.hl(-r * 0.5, -r * 0.4, r * 0.5, r * 0.18, -0.2, 0.4); for (const [dx, dy] of [[-r * 0.6, r * 0.2], [r * 0.4, -r * 0.3], [r * 0.8, r * 0.3]]) g.circ(dx, dy, 3, sh(c, -0.35), 0); }); }
function rabbit(g, x, y, s, joy) {
  g.at(x, y, 0, s, s, () => {
    g.ell(-22, -150 - 10 * joy, 16, 50, '#ffffff', 5, -0.15 - 0.2 * joy); g.ell(22, -150 - 10 * joy, 16, 50, '#ffffff', 5, 0.15 + 0.2 * joy);
    g.ell(-22, -146 - 10 * joy, 7, 34, '#ffb3c6', 0, -0.15 - 0.2 * joy); g.ell(22, -146 - 10 * joy, 7, 34, '#ffb3c6', 0, 0.15 + 0.2 * joy);
    g.ell(0, -40, 50, 46, '#ffffff'); g.circ(0, -90, 44, '#ffffff');
    g.arc(-16, -92, 7, PI + 0.3, -0.3, C.ol, 5); g.arc(16, -92, 7, PI + 0.3, -0.3, C.ol, 5);
    g.ell(0, -78, 6, 4, '#ff7a9a', 0); g.circ(-26, -76, 7, '#ffc7d6', 0); g.circ(26, -76, 7, '#ffc7d6', 0);
    g.cap(-30, -40, -50, -70 - 30 * joy, 12, '#ffffff'); g.cap(30, -40, 50, -70 - 30 * joy, 12, '#ffffff');
  });
}

/* =========================================================================
   4. 釣り（さおを引くと魚が上がる）
   ========================================================================= */
const FISH = [
  { k: 'tai', name: 'タイを釣る', short: 'タイ', theme: 'sea', sky: ['#57b9f5', '#cdeeff'], sea: '#2190d8', fish: 'tai' },
  { k: 'tako', name: 'タコを釣る', short: 'タコ', theme: 'sea', sky: ['#ff9a6b', '#ffe0a8'], sea: '#3a6fb8', fish: 'tako', boat: 1 },
];
function tai(g, x, y, s, rot, t) {
  g.at(x, y, rot, s, s, () => {
    const w = Math.sin(t * 16) * 0.15;
    g.at(118, 0, w, 1, 1, () => g.path('M0 0 L54 -50 Q40 0 54 50 Z', '#ff6f6f', 6));
    g.path('M-60 -54 Q0 -110 70 -46 Z', '#ff6f6f', 6);
    g.path('M-130 0 C-110 -70 40 -86 120 -10 L120 10 C40 80 -110 66 -130 0 Z', '#ff7c84');
    g.clipPath('M-130 0 C-110 -70 40 -86 120 -10 L120 10 C40 80 -110 66 -130 0 Z', () => { g.ell(-10, 44, 140, 30, '#ffd6dc', 0); for (let i = 0; i < 5; i++) g.circ(-40 + i * 34, -20 + (i % 2) * 14, 5, '#6fd3ff', 0); });
    g.path('M-130 0 C-110 -70 40 -86 120 -10 L120 10 C40 80 -110 66 -130 0 Z', null);
    g.arc(-70, 4, 34, -1.1, 1.1, sh('#ff7c84', -0.3), 5);
    g.circ(-96, -14, 13, '#ffffff', 4); g.circ(-98, -14, 6, C.ol, 0);
    g.hl(-30, -38, 40, 10, -0.15, 0.5);
  });
}
function tako(g, x, y, s, rot, t, joy) {
  g.at(x, y, rot, s, s, () => {
    for (let i = 0; i < 6; i++) { const a = (i - 2.5) * 0.42, w = Math.sin(t * 10 + i) * 14; g.curve([Math.sin(a) * 50, 20, Math.sin(a) * 90 + w, 80, Math.sin(a) * 120 - w, 140, Math.sin(a) * 100, 170], C.ol, 34); g.curve([Math.sin(a) * 50, 20, Math.sin(a) * 90 + w, 80, Math.sin(a) * 120 - w, 140, Math.sin(a) * 100, 170], '#ff6b5e', 22); }
    g.ell(0, -50, 100, 110, '#ff6b5e');
    g.circ(-40, -90, 10, '#ffb0a8', 0); g.circ(30, -110, 8, '#ffb0a8', 0); g.circ(50, -70, 6, '#ffb0a8', 0);
    g.ell(-34, 10, 22, 24, '#ffffff', 5); g.ell(34, 10, 22, 24, '#ffffff', 5);
    if (joy) { g.line([-46, 4, -34, 14, -22, 4], C.ol, 6); g.line([46, 4, 34, 14, 22, 4], C.ol, 6); } else { g.circ(-30, 14, 10, C.ol, 0); g.circ(30, 14, 10, C.ol, 0); }
    g.ell(0, 52, 18, 14, '#ff4f40', 5); g.ell(0, 52, 8, 6, C.ol, 0);
    g.hl(-40, -110, 30, 14, -0.4, 0.45);
  });
}

/* =========================================================================
   5. ひもを引く（草刈り機・電気・クラッカー・神社の鈴）
   ========================================================================= */
const CORDS = [
  { k: 'mower', name: 'エンジンをかける', short: '芝刈り機', theme: 'farm', modes: ['one', 'both'], sfx: ['boo', 'engine'], sleeve: '#2e7d4f' },
  { k: 'light', name: '電気をつける', short: '電気', theme: 'home', modes: ['one', 'both'], sfx: ['click', 'click'], sleeve: '#8e5cff' },
  { k: 'popper', name: 'クラッカーを鳴らす', short: 'クラッカー', theme: 'party', modes: ['one'], sfx: ['pop', 'firework'], sleeve: '#ff6b8b' },
  { k: 'bell', name: '神社の鈴を鳴らす', short: '神社の鈴', theme: 'festival', modes: ['both', 'alt', 'one'], sfx: ['bell', 'bell'], sleeve: '#f2f2f2' },
];
function mower(g, x, y, s, run, t) {
  const jx = run ? Math.sin(t * 70) * 3 : 0, jy = run ? Math.cos(t * 83) * 3 : 0;
  g.at(x + jx, y + jy, 0, s, s, () => {
    g.shadow(0, 92, 270, 30, 0.3);
    for (const wx of [-220, 220]) { g.rr(wx - 40, 10, 80, 110, 26, C.black); g.circ(wx, 64, 16, C.gray, 4); }
    g.path('M-250 70 L-230 -20 Q0 -60 230 -20 L250 70 Q0 100 -250 70 Z', '#e8434f');
    g.path('M-250 70 Q0 100 250 70 L246 50 Q0 80 -246 50 Z', sh('#e8434f', -0.25), 0);
    g.rr(-120, -150, 240, 140, 30, '#5c6478');
    for (let i = 0; i < 4; i++) g.line([-96, -130 + i * 26, 96, -130 + i * 26], '#454b5c', 6);
    g.rr(70, -190, 50, 50, 14, C.yellow); g.rr(-150, -110, 50, 70, 12, C.dgray);
    g.circ(0, -60, 62, '#ff9f1c'); g.circ(0, -60, 40, sh('#ff9f1c', -0.15), 5); g.circ(0, -60, 14, C.ol, 0);
  });
  return [x + jx, y + jy - 60 * s];
}
function catBed(g, x, y, s, awake, t) {
  g.at(x, y, 0, s, s, () => {
    if (!awake) {
      g.ell(0, 0, 110, 56, '#9aa3b5');
      g.circ(-70, -16, 46, '#9aa3b5'); g.tri(-108, -40, -92, -82, -74, -56, '#9aa3b5', 6); g.tri(-62, -60, -40, -88, -32, -52, '#9aa3b5', 6);
      g.arc(-88, -14, 10, 0.2, PI - 0.2, C.ol, 5); g.arc(-56, -14, 10, 0.2, PI - 0.2, C.ol, 5);
      g.curve([90, 10, 140, -20, 120, -60], C.ol, 26); g.curve([90, 10, 140, -20, 120, -60], '#9aa3b5', 16);
    } else {
      const j = Math.abs(Math.sin(t * 20)) * 6;
      g.ell(0, -30 - j, 70, 70, '#9aa3b5');
      for (let i = 0; i < 7; i++) { const a = -PI + i / 6 * PI; g.tri(Math.cos(a) * 60, -30 - j + Math.sin(a) * 60, Math.cos(a + 0.25) * 90, -30 - j + Math.sin(a + 0.25) * 90, Math.cos(a + 0.5) * 60, -30 - j + Math.sin(a + 0.5) * 60, '#9aa3b5', 5); }
      g.circ(0, -120 - j, 54, '#9aa3b5'); g.tri(-48, -150 - j, -36, -200 - j, -12, -164 - j, '#9aa3b5', 6); g.tri(48, -150 - j, 36, -200 - j, 12, -164 - j, '#9aa3b5', 6);
      g.circ(-20, -126 - j, 13, '#ffffff', 4); g.circ(20, -126 - j, 13, '#ffffff', 4); g.circ(-20, -126 - j, 5, C.ol, 0); g.circ(20, -126 - j, 5, C.ol, 0);
      g.ell(0, -98 - j, 10, 12, C.ol, 0);
      g.curve([60, -30, 110, -80, 100, -140], C.ol, 26); g.curve([60, -30, 110, -80, 100, -140], '#9aa3b5', 16);
    }
  });
}

/* =========================================================================
   6. 弓を引く（弓道・おもちゃの弓）
   ========================================================================= */
const BOWS = [
  { k: 'kyudo', name: '弓を引く', short: '弓道', theme: 'dojo', sfx: ['knock', 'taiko'] },
  { k: 'balloon', name: '弓で風船を割る', short: '風船わり', theme: 'game', sfx: ['pop', 'pop'] },
];
const TG = [420, 400], GX = 575, GY = 620;
const BAL = [[260, 320, 42, C.red], [330, 470, 44, C.blue], [420, 380, 60, '#ffd23f'], [515, 290, 40, C.green], [560, 470, 40, C.purple]];

export default [
  /* ---------------- 1. たぐり寄せる ---------------- */
  {
    id: 'pull-haul', acts: ['pull'], modes: ['both', 'alt'], vars: HAUL,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.fish = []; for (let i = 0; i < 6; i++) s.my.fish.push({ x: (i - 2.5) * 62 + (s.r() - 0.5) * 30, ph: s.r(), c: [C.blue, C.orange, '#ff6b8b', C.teal, C.yellow, '#b388ff'][i] }); },
    draw(g, s, v) {
      const V = g.V, D = pulled(s), t2 = D / 2, aj = s.k ? s.age : 9;
      const y = lerp(v.far[0], v.near[0], t2), sc = lerp(v.far[1], v.near[1], t2);
      const [ax, ay] = HAUL_DRAW[v.k](g, s, v, D, y, sc, aj);
      const slack = s.p * (1 - (s.my.q || 0)), bx = 525, by = V.y1 + 60;
      let P;
      if (v.k === 'chest') { P = ropePts(ax, ay, ax + 40 * slack, lerp(ay, by, 0.5), bx, by, 8 * sc, 30); chain(g, P, D * 4); }
      else if (v.k === 'dog') P = rope(g, ax, ay, ax + 46 * slack, lerp(ay, by, 0.45), bx, by, 5 * sc, 16, '#e8434f', 0, { n: 0 });
      else P = rope(g, ax, ay, ax + 46 * slack, lerp(ay, by, 0.45), bx, by, 7 * sc, 28, '#e9d3a4', D * 3.2);
      gripRope(g, s, P, { sleeve: v.sleeve });
    },
    hit(g, s, k, v) {
      const y = lerp(v.far[0], v.near[0], k / 2), sc = lerp(v.far[1], v.near[1], k / 2);
      if (v.k === 'tug') {
        if (k === 1) { g.fx.smoke(500, y, 6, '#f3e2bf'); g.fx.burst(500, y - 250 * sc, { n: 6, c: ['#bfe9ff', '#ffffff'], shape: 'drop', sp: [200, 420], size: [12, 18], g: 900 }); g.fx.pop('グイッ', 260, 260, { size: 100 }); }
        else { g.fx.smoke(500, y, 8, '#f3e2bf'); g.fx.confetti(50); g.fx.pop('かち！', 500, 140, { size: 140, c: C.yellow }); g.fx.stars(500, 420, 8); }
      } else if (v.k === 'net') {
        g.fx.splash(500, y - 30, C.water, 18);
        if (k === 1) g.fx.pop('ザバッ', 260, 250, { size: 100 });
        else { g.fx.pop('大漁！', 500, 200, { size: 140, c: C.yellow }); g.fx.stars(500, y - 120, 10); g.sfx('cheer'); }
      } else if (v.k === 'sled') {
        g.fx.burst(500, y, { n: 12, c: '#ffffff', shape: 'snow', sp: [200, 500], size: [14, 26], g: 800 });
        if (k === 1) g.fx.pop('スイー', 260, 270, { size: 96 });
        else { g.fx.hearts(500, y - 220, 6); g.fx.pop('とうちゃく！', 500, 150, { size: 110, c: '#ff6b8b' }); g.fx.stars(500, y - 140, 6); }
      } else if (v.k === 'dog') {
        if (k === 1) { g.fx.smoke(500, y + 10, 6, '#f6e7c8'); g.fx.pop('ズズッ', 260, 290, { size: 100 }); }
        else { g.fx.hearts(500, y - 280, 7); g.fx.pop('ワン！', 500, 190, { size: 130, c: C.yellow }); }
      } else if (v.k === 'boat') {
        g.fx.splash(500, y + 30 * sc, C.water, 16);
        if (k === 1) g.fx.pop('ザブン', 260, 250, { size: 100 });
        else { g.fx.hearts(500, y - 220 * sc, 6); g.fx.pop('ついた！', 500, 170, { size: 120, c: C.yellow }); g.fx.stars(500, y - 160 * sc, 8); }
      } else {
        g.fx.smoke(500, y, 6, '#8a7aa8');
        if (k === 1) g.fx.pop('ズズッ', 260, 260, { size: 100 });
        else { g.fx.coins(500, y - 160, 14); g.fx.stars(500, y - 180, 8); g.fx.pop('おたから！', 500, 190, { size: 120, c: C.yellow }); }
      }
      g.fx.shake(k === 2 ? 10 : 7, 0.14);
    },
  },

  /* ---------------- 2. 引くと上がる ---------------- */
  {
    id: 'pull-hoist', acts: ['pull'], modes: ['both', 'alt'], vars: HOIST,
    sfx: (k, v) => v.sfx[k - 1],
    draw(g, s, v) {
      const V = g.V, D = pulled(s), h = D / 2, aj = s.k ? s.age : 9, t = s.t;
      const [px, py] = v.pul;
      if (v.k === 'flag') {
        g.bg('#e7c48c'); g.sky('#5ab8f5', '#d6f1ff', 830); g.cloud(220, 180, 0.8); g.cloud(820, 300, 0.55);
        g.rr(90, 560, 360, 280, 6, '#fff3dc', 6); g.rr(90, 540, 360, 30, 4, '#e8434f', 6);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.rr(112 + i * 84, 600 + j * 110, 60, 70, 4, '#9fd8ff', 5);
        g.circ(270, 500, 34, '#ffffff', 6); g.line([270, 500, 270, 480], C.ol, 5); g.line([270, 500, 286, 506], C.ol, 5);
        tree(g, 820, 830, 0.9); tree(g, 940, 830, 0.7);
        g.band(830, 'bottom', '#e7c48c', 6);
        g.rr(600, 104, 16, 740, 6, '#eef2f8', 5); g.circ(608, 92, 17, C.gold, 5); g.circ(608, 118, 8, C.gray, 4);
        g.line([620, 118, 620, 830], C.ol, 3);
        const fy = lerp(690, 128, h), top = clamp((340 - fy) / 160), wave = lerp(10, 26, top);
        const F = flagShape(g, 620, fy, 270, 180, wave, t);
        g.poly(F.pts, '#2f6bff', 6);
        clipPoly(g, F.pts, () => { g.rect(620, fy + 128, 290, 90, '#ff5a5f', 0); g.rect(620, fy - 30, 290, 18, '#ffffff', 0); });
        g.poly(F.pts, null, 6);
        g.star(620 + 135, fy + 66 + F.f(755), 40, 18, 5, C.yellow, 5);
        if (s.k >= 2) g.glow(755, fy + 90, 180, '#ffffff', 0.35 * clamp(1 - aj));
      } else if (v.k === 'koi') {
        g.bg('#79c66a'); g.sky('#3fa9f5', '#cdefff', 760); g.cloud(200, 260, 0.9); g.cloud(860, 180, 0.6);
        g.hills(700, '#5fb35a', 60, 3, 4);
        for (const [rx, rw] of [[60, 260], [700, 300]]) { g.rect(rx + 20, 780, rw - 40, 120, '#f6ecd8', 5); g.poly([rx, 790, rx + rw / 2, 700, rx + rw, 790], '#45597a', 6); }
        g.band(880, 'bottom', '#79c66a', 6);
        g.rr(552, 92, 18, 800, 8, '#8a5a36', 5);
        g.at(561, 70, t * 6, 1, 1, () => { for (let i = 0; i < 8; i++) g.at(0, 0, i * PI / 4, 1, 1, () => g.path('M0 0 L-8 -40 L0 -52 L8 -40 Z', i % 2 ? C.gold : '#ffffff', 3)); g.circ(0, 0, 10, C.gold, 4); });
        g.line([572, 112, 572, 880], C.ol, 3);
        const top = lerp(600, 120, h);
        // 吹き流し
        const sy = top;
        { const inf = clamp((720 - sy) / 260), ang = lerp(1.4, 0.08, inf), ca = Math.cos(ang), sa = Math.sin(ang);
          for (let i = 0; i < 5; i++) { const T = [], B = []; for (let j = 0; j <= 6; j++) { const u = j / 6, w = inf * 14 * Math.sin(u * 5 - t * 9 + i) * u, lx = u * 230, ly = i * 12 + w; T.push(572 + lx * ca - ly * sa, sy + lx * sa + ly * ca); B.unshift(572 + lx * ca - (ly + 12) * sa, sy + lx * sa + (ly + 12) * ca); } g.poly(T.concat(B), [C.blue, C.red, C.yellow, '#ffffff', C.green][i], 4); } }
        const ks = [['#2b2140', '#ffe08a', 110, 300], ['#ff4f5e', '#ffe0e0', 230, 260], ['#3a86ff', '#d9e8ff', 340, 210]];
        for (const [col, bel, off, L] of ks) { const yy = top + off; if (yy > 1000) continue; carp(g, 572, yy, L, col, bel, clamp((720 - yy) / 260), t, off); }
      } else if (v.k === 'well') {
        g.bg('#8fcf6a'); g.sky('#7ccaff', '#e0f5ff', 560); g.cloud(800, 120, 0.6);
        g.rect(V.x0 - 20, 470, V.x1 - V.x0 + 40, 90, '#d9cdb8', 0); for (let x = Math.floor(V.x0 / 80) * 80; x < V.x1; x += 80) g.line([x, 470, x, 560], '#b7a98f', 4); g.line([V.x0 - 20, 470, V.x1 + 20, 470], '#b7a98f', 5);
        g.band(560, 'bottom', '#8fcf6a', 6);
        for (const x of [270, 730]) g.rr(x - 16, 200, 32, 520, 6, C.dwood, 5);
        g.poly([220, 210, 500, 90, 780, 210, 760, 228, 500, 120, 240, 228], '#5c6478', 6);
        g.rr(250, 196, 500, 26, 6, C.wood, 5);
        g.line([500, 222, 500, 236], C.ol, 8);
        g.at(500, 248, t * (s.my.q ? 3 : 0) + D * 4, 1, 1, () => { g.circ(0, 0, 38, C.wood2, 6); g.line([-30, 0, 30, 0], C.dwood, 6); g.line([0, -30, 0, 30], C.dwood, 6); g.circ(0, 0, 9, C.dgray, 0); });
        // 井戸
        g.ell(500, 660, 250, 76, '#9aa3b5');
        g.ell(500, 660, 204, 56, '#1d2438', 5);
        const by = lerp(900, 360, E.ioQ(h));
        g.line([538, 250, 538, by - 90], C.ol, 5);
        g.clipRR(V.x0, V.y0, V.x1 - V.x0, 660 - V.y0, 0, () => {
          g.at(538, by, jig(aj, 0.12, 14, 5), 1, 1, () => {
            g.path('M-70 -70 L70 -70 L58 40 L-58 40 Z', C.wood);
            for (const yy of [-48, 18]) g.line([-68, yy, 68, yy], '#5a6070', 9);
            g.ell(0, -70, 70, 16, s.k >= 1 || D > 0.9 ? '#5fc8f5' : '#5a3b20', 5);
            g.path('M-62 -72 Q0 -150 62 -72', null, 6);
            if (s.k >= 2) { const fj = E.outBack(clamp(aj / 0.3)); g.at(-20 + fj * 10, -86 - fj * 70, fj * 0.25, 1.5, 1.5, () => { g.ell(0, 0, 36, 26, '#5bc25b'); g.circ(-16, -22, 12, '#5bc25b', 5); g.circ(16, -22, 12, '#5bc25b', 5); g.circ(-16, -22, 5, C.ol, 0); g.circ(16, -22, 5, C.ol, 0); g.path('M-14 4 Q0 14 14 4', null, 5); }); }
          });
        });
        g.path('M250 660 L250 860 Q500 940 750 860 L750 660 Q500 740 250 660 Z', '#b6bcc9');
        g.clipPath('M250 660 L250 860 Q500 940 750 860 L750 660 Q500 740 250 660 Z', () => { for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) g.rr(240 + i * 90 + (r % 2) * 45, 690 + r * 60, 86, 56, 10, r % 2 ? '#a3abbd' : '#c3c9d4', 4); });
        g.path('M250 660 L250 860 Q500 940 750 860 L750 660 Q500 740 250 660 Z', null);
        g.ell(500, 660, 250, 76, null, 7);
      } else {   // stage
        g.bg('#3a1030'); g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 170 - V.y0, '#5a1838', 0);
        const lit = s.k >= 2 ? E.outQ(clamp(aj / 0.3)) : 0;
        g.rect(120, 150, 760, 690, g.lin(0, 150, 0, 840, ['#3b2d5e', '#5d4a8a']), 0);
        g.rect(120, 740, 760, 100, '#c98b52', 0); g.line([120, 740, 880, 740], sh('#c98b52', -0.3), 6);
        for (const sx of [300, 700]) g.alpha(0.25 + 0.3 * lit, () => g.poly([sx - 30, 150, sx + 30, 150, sx + 150, 760, sx - 150, 760], '#fff6c8', 0));
        catMagician(g, 500, 760, 0.9, lit, t);
        const cy = lerp(840, 190, E.ioQ(h));
        g.clipRR(120, 150, 760, cy - 150, 0, () => {
          g.rect(120, 150, 760, 700, '#c4203a', 0);
          for (let x = 140; x < 880; x += 76) { g.rect(x, 150, 22, 700, '#a3172e', 0); g.rect(x + 40, 150, 12, 700, '#d8344d', 0); }
        });
        for (let i = 0; i < 10; i++) g.ell(158 + i * 76, cy - 8, 38, 22, '#c4203a', 0);
        g.line([120, cy, 880, cy], '#ffc83d', 10);
        g.rect(120, 150, 760, 52, '#a3172e', 0); for (let x = 120; x < 880; x += 76) g.ell(x + 38, 204, 38, 26, '#a3172e', 0);
        g.line([120, 202, 880, 202], '#ffc83d', 8);
        g.rr(60, 110, 880, 50, 10, '#ffc83d', 6); g.rr(60, 110, 70, 790, 10, '#7a1a3a', 6); g.rr(870, 110, 70, 790, 10, '#7a1a3a', 6);
        for (let i = 0; i < 7; i++) g.circ(180 + i * 106, 860, 16, lit > 0 ? '#fff6b0' : '#7a6a4a', 4);
        g.circ(px, py, 18, C.gray, 5);
      }
      const slack = s.p * (1 - (s.my.q || 0));
      const P = rope(g, px, py, lerp(px, v.end, 0.5) + 24 * slack * Math.sin(t * 3), lerp(py, V.y1, 0.5), v.end, V.y1 + 60, 10, 24, v.k === 'stage' ? '#e8d6a8' : '#f1e2bd', D * 3.4);
      gripRope(g, s, P, { sleeve: v.sleeve, y1: 640, a0: 0.95, a1: 0.42 });
    },
    hit(g, s, k, v) {
      const h = k / 2;
      if (v.k === 'flag') {
        const fy = lerp(690, 128, h);
        g.fx.burst(760, fy + 90, { n: 10, c: ['#ffffff', '#cfe8ff'], shape: 'leaf', sp: [150, 400], size: [12, 20], g: 200, dir: 0, spread: 1.4 });
        if (k === 1) g.fx.pop('スルスル', 300, 300, { size: 90 });
        else { g.fx.stars(760, 220, 10); g.fx.pop('バサッ', 300, 230, { size: 120, c: C.yellow }); g.fx.confetti(60); }
      } else if (v.k === 'koi') {
        if (k === 1) g.fx.pop('スルスル', 330, 320, { size: 90 });
        else { g.fx.burst(760, 200, { n: 14, c: ['#ffffff', '#d6f1ff'], shape: 'leaf', sp: [200, 600], size: [12, 22], g: 100, dir: 0, spread: 1.2 }); g.fx.pop('ヒュオー', 320, 240, { size: 110, c: '#ffffff' }); g.fx.stars(720, 260, 8); }
      } else if (v.k === 'well') {
        const by = lerp(900, 360, E.ioQ(h));
        if (k === 1) { g.fx.splash(538, 640, C.water, 12); g.fx.pop('ザバッ', 260, 330, { size: 96 }); }
        else { g.fx.splash(538, by - 70, C.water, 22); g.fx.pop('ケロッ', 280, 360, { size: 110, c: C.lime }); g.fx.stars(538, by - 120, 8); }
      } else {
        if (k === 1) { g.fx.pop('ススッ', 260, 300, { size: 96, c: '#ffe08a' }); g.fx.notes(500, 520, 3); }
        else { g.fx.confetti(70); g.fx.pop('ジャーン！', 500, 250, { size: 120, c: C.yellow }); g.fx.stars(560, 420, 10); }
      }
      g.fx.shake(k === 2 ? 9 : 6, 0.12);
    },
  },

  /* ---------------- 3. 抜く ---------------- */
  {
    id: 'pull-root', acts: ['pull'], modes: ['both'], theme: 'farm', vars: ROOTS,
    sfx: (k, v) => k === 1 ? 'crunch' : v.k === 'kabu' ? 'boing' : 'pop',
    draw(g, s, v) {
      const V = g.V, D = pulled(s), aj = s.k ? s.age : 9, t = s.t;
      g.bg('#9b6a45'); g.sky('#7fd0ff', '#e6f7ff', 330); g.cloud(220, 120, 0.7); g.cloud(800, 170, 0.5);
      g.hills(330, '#7cc463', 40, 5, 5);
      g.band(330, 'bottom', '#9b6a45', 6);
      for (let i = 0; i < 6; i++) { const y0 = lerp(350, 1200, Math.pow(i / 6, 1.5)), y1 = lerp(350, 1200, Math.pow((i + 0.5) / 6, 1.5)); g.rect(V.x0 - 20, y0, V.x1 - V.x0 + 40, y1 - y0, '#8b5c3a', 0); }
      for (const x of [150, 300, 700, 850]) g.at(x, 380 + Math.abs(x - 500) * 0.05, 0, 0.5, 0.5, () => leafFan(g, v, 4, 120, 1.2));
      if (v.k === 'carrot') { const up = s.k >= 2 ? E.outBack(clamp(aj / 0.3)) : 0; if (up > 0) rabbit(g, 800, 600 - 60 * up, 1.25, 1); }
      // 盛り土と穴
      g.blob([HX - 190, HY + 30, HX - 130, HY - 30, HX, HY - 50, HX + 130, HY - 30, HX + 190, HY + 30, HX + 90, HY + 66, HX - 90, HY + 66], '#a8714a', 0);
      g.ell(HX, HY + 6, 80, 30, '#4a2c18', 0);
      const popped = s.k >= 2, fa = popped ? clamp(aj / 0.32) : 0;
      const vis = D <= 1 ? lerp(v.v0, v.v1, D) : lerp(v.v1, v.v2, D - 1);
      const crack = s.k >= 1 ? 1 : 0;
      if (crack) for (const a of [-2.6, -1.9, -1.1, -0.4]) g.line([HX + Math.cos(a) * 90, HY + 10 + Math.sin(a) * 30, HX + Math.cos(a) * 150, HY + 10 + Math.sin(a) * 60], '#5a3520', 6);
      // 手の位置
      const tyNow = HY + vis, hy0 = 915, hy1 = Math.max(650, tyNow + 70);
      const hy = lerp(hy0, hy1, s.p), hsc = lerp(1.1, 0.84, s.p);
      let leafTo = [HX, hy - 30];
      if (!popped) {
        // くき → 手
        if (v.vine) {
          g.curve([HX, HY + 6, HX - 20, lerp(HY, hy, 0.5), HX, hy - 20], C.ol, 22); g.curve([HX, HY + 6, HX - 20, lerp(HY, hy, 0.5), HX, hy - 20], '#7a3a6e', 12);
          if (s.k >= 1) { const sw = Math.sin(t * 5) * 0.1; potato(g, HX + 60, HY + 60, 34, 0.5 + sw, v.c); g.line([HX - 8, HY + 30, HX + 40, HY + 50], '#7a3a6e', 6); }
        } else {
          g.clipRR(V.x0, HY + 4, V.x1 - V.x0, 2000, 0, () => g.at(HX, tyNow, 0, 1, 1, () => vegBody(g, v)));
          g.ell(HX - 30, HY + 14, 26, 12, '#a8714a', 0); g.ell(HX + 34, HY + 18, 22, 10, '#a8714a', 0);
          for (const dx of [-14, 0, 14]) g.line([HX + dx * 0.6, tyNow, HX + dx, hy - 30], sh(v.leaf, -0.2), 12);
        }
        g.at(HX, hy - 10, 0, hsc, hsc, () => leafFan(g, v, 5, 190, 2.4));
      } else {
        // スポーン！（飛び上がって立つ）
        const e = E.outBack(fa, 1.4), bob = Math.sin(t * 6) * 6 * fa;
        const x = lerp(HX, 500, e), y = lerp(HY + vis, v.round ? 520 : v.vine ? 300 : 300, e) + bob, rot = lerp(0, PI, E.outQ(fa)) + Math.sin(t * 5) * 0.05 * fa;
        const sc = lerp(1, v.k === 'kabu' ? 1.45 : 1.1, e);
        g.glow(500, v.round ? 380 : 420, 300, '#fff3b0', 0.5 * fa);
        g.at(x, y, rot, sc, sc, () => {
          if (v.vine) {
            g.curve([0, 0, -10, -60, 0, -120], '#7a3a6e', 12);
            for (const [px, py, r, a] of [[-70, -90, 40, 0.6], [60, -110, 44, -0.5], [-30, -170, 46, 0.2], [70, -200, 38, -0.9], [-80, -220, 36, 1.2]]) { g.line([0, -60, px, py], '#7a3a6e', 6); potato(g, px, py, r, a, v.c); }
            g.at(0, 0, PI, 1, 1, () => leafFan(g, v, 5, 170, 1.6));
          } else { vegBody(g, v); g.at(0, 0, PI, 1, 1, () => leafFan(g, v, 5, 190, 1.4)); }
          if (v.k === 'kabu' && fa > 0.5) g.at(-120, -6, PI, 1.5, 1.5, () => { g.ell(0, 0, 36, 26, '#b7bdc9'); g.circ(-30, -18, 16, '#b7bdc9', 5); g.circ(-30, -18, 8, '#ffc7d6', 0); g.circ(-46, 2, 4, C.ol, 0); g.curve([34, 0, 60, -10, 70, 10], C.ol, 4); });
        });
      }
      // 手
      for (const side of ['L', 'R']) { const sg = side === 'L' ? -1 : 1; g.arm(HX + sg * 44 * hsc, hy + 6, -PI / 2 - sg * lerp(0.75, 0.35, s.p), { hand: 'grip', side, s: hsc, sleeve: '#4a7bd0' }); }
    },
    hit(g, s, k, v) {
      g.fx.burst(HX, HY + 10, { n: 14, c: ['#8b5a3c', '#a8714a', '#6b4028'], shape: 'chip', sp: [250, 700], size: [10, 22], g: 1800, spread: 2.2 });
      if (k === 1) { g.fx.pop(v.k === 'imo' ? 'ボコッ' : 'グイッ', 260, 260, { size: 100 }); g.fx.shake(7, 0.12); }
      else { g.fx.pop(v.k === 'kabu' ? 'スッポーン' : v.k === 'imo' ? 'ゴロゴロ！' : 'スポーン！', 500, v.k === 'kabu' ? 140 : 870, { size: 110, c: C.yellow }); g.fx.stars(500, 360, 10); g.fx.shake(10, 0.16); if (v.k === 'carrot') g.fx.hearts(800, 380, 5); }
    },
  },

  /* ---------------- 4. 釣り ---------------- */
  {
    id: 'pull-fish', acts: ['pull'], modes: ['both'], vars: FISH, sfx: ['splash', 'splash'],
    draw(g, s, v) {
      const V = g.V, aj = s.k ? s.age : 9, t = s.t, p = s.p;
      g.bg(v.sea); g.sky(v.sky[0], v.sky[1], 330);
      if (v.boat) { g.sun(260, 300, 80, '#ffd27a'); g.cloud(760, 140, 0.6, '#ffe9d1'); } else { g.sun(820, 110, 60); g.cloud(260, 130, 0.7); g.cloud(700, 200, 0.4); }
      g.band(320, 'bottom', v.sea);
      g.hills(330, sh(v.sea, 0.2), 30, 7, 3);
      for (let r = 0; r < 5; r++) for (let x = V.x0 + (r % 2) * 70; x < V.x1; x += 140) g.arc(x + 20 * Math.sin(s.beat + r), 380 + r * 90, 30, PI + 0.5, -0.5, 'rgba(255,255,255,0.4)', 5);
      if (v.boat) { g.path(`M${V.x0 - 40} 860 L${V.x1 + 40} 860 L${V.x1 + 40} ${V.y1 + 60} L${V.x0 - 40} ${V.y1 + 60} Z`, '#f4f4f4'); g.rect(V.x0 - 40, 860, V.x1 - V.x0 + 80, 30, '#e8434f', 0); g.line([V.x0 - 40, 860, V.x1 + 40, 860], C.ol, 7); }
      else { g.band(860, 'bottom', C.wood); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.line([x, 860, x - 60, V.y1 + 60], sh(C.wood, -0.25), 5); g.line([V.x0 - 40, 860, V.x1 + 40, 860], C.ol, 7); }
      // 魚の位置
      const FX = 640, FYw = 600;
      let fx = FX, fy = FYw, under = 1, rot = 0, fs = 0.7;
      if (s.k === 1) { const a = clamp(aj / 0.75); if (a < 1) { under = 0; fx = FX - 30 * a; fy = FYw - 260 * 4 * a * (1 - a); rot = lerp(-0.7, 0.9, a); fs = 0.85; } else { fx = FX - 30; fy = 660; } }
      // さお
      const gx = lerp(560, 535, p), gy = lerp(930, 790, p), sc = lerp(1.05, 0.82, p);
      let tx = lerp(620, 720, p), ty = lerp(120, 330, p);
      const caught = s.k >= 2, ca = caught ? E.outBack(clamp(aj / 0.3), 1.2) : 0;
      if (caught) { fx = lerp(FX - 30, tx + 10, ca); fy = lerp(660, ty + 190, ca) + Math.sin(t * 7) * 8 * ca; under = 0; rot = lerp(0.5, PI / 2 - 0.15, ca) + Math.sin(t * 6) * 0.08; fs = lerp(0.85, 1.25, ca); }
      const tense = caught ? 0.6 : under ? (1 - p) : 0.8, bend = 60 * tense;
      tx += bend * 0.5; ty += bend * 0.6;
      // 糸
      if (under) {
        g.alpha(0.55, () => g.at(fx + 10, fy + 50, Math.sin(t * 3) * 0.15, 1, 1, () => { g.ell(0, 0, 80, 26, sh(v.sea, -0.45), 0); g.tri(70, 0, 110, -24, 110, 24, sh(v.sea, -0.45), 0); }));
        const dip = s.k === 0 ? clamp((1 - p) * 1.4) : 1;
        g.line([tx, ty, fx, fy - 6 + dip * 14], '#ffffff', 3);
        g.ring(fx, fy + 4, 30 + 10 * Math.sin(t * 6), 'rgba(255,255,255,0.7)', 4);
        g.at(fx, fy - 10 + dip * 22, () => { g.circ(0, 0, 20, '#ffffff', 5); g.clipCirc(0, 0, 20, () => g.rect(-22, -22, 44, 22, C.red, 0)); g.circ(0, 0, 20, null, 5); g.line([0, -20, 0, -40], C.ol, 5); });
      } else {
        const ang = rot, mx = fx + Math.cos(ang + PI) * 120 * fs, my = fy + Math.sin(ang + PI) * 120 * fs;
        g.line([tx, ty, mx, my], '#ffffff', 3);
        if (v.fish === 'tai') tai(g, fx, fy, fs, ang, t); else tako(g, fx, fy, fs, ang - PI / 2, t, caught);
      }
      // さお本体
      const P = ropePts(gx, gy, lerp(gx, tx, 0.55) - bend * 0.2, lerp(gy, ty, 0.55) - bend * 0.1, tx, ty, 13, 4);
      const L = [], R = []; for (const [x, y, nx, ny] of P) { L.push(x + nx, y + ny); R.unshift(x - nx, y - ny); }
      g.poly(L.concat(R), '#3b3f6b', 4);
      const [r1x, r1y] = at(P, 0.16);
      g.circ(r1x + 26, r1y + 6, 26, C.metal, 5); g.circ(r1x + 26, r1y + 6, 9, C.dgray, 0);
      // 手
      const [hx1, hy1] = at(P, 0.02), [hx2, hy2] = at(P, 0.2);
      g.arm(hx2 - 6, hy2, -PI / 2 + lerp(0.85, 0.5, p), { hand: 'grip', side: 'L', s: sc * 0.96, sleeve: '#2f9e8f' });
      g.arm(hx1 + 6, hy1, -PI / 2 - lerp(0.95, 0.6, p), { hand: 'grip', side: 'R', s: sc, sleeve: '#2f9e8f' });
    },
    hit(g, s, k, v) {
      if (k === 1) { g.fx.splash(640, 600, C.water, 18); g.fx.ring(640, 610, { r1: 160, sy: 0.35 }); g.fx.pop('バシャッ', 300, 300, { size: 100 }); g.fx.shake(7, 0.12); }
      else { g.fx.splash(610, 650, C.water, 24); g.fx.stars(700, 380, 10); g.fx.pop('釣れた！', 350, 200, { size: 120, c: C.yellow }); g.fx.shake(10, 0.16); g.sfx('cheer'); }
    },
  },

  /* ---------------- 5. ひもを引く ---------------- */
  {
    id: 'pull-cord', acts: ['pull'], modes: ['one', 'both'], vars: CORDS,
    sfx: (k, v) => v.sfx[k - 1],
    draw(g, s, v) {
      const V = g.V, aj = s.k ? s.age : 9, t = s.t, p = s.p, both = s.mode === 'both', alt = s.mode === 'alt';
      const ms = both || alt ? 'R' : s.side;
      const pAlt = side => s.side === side ? s.p : 1 - s.p;   // alt：それぞれの手の p
      g.mirror(ms, () => {
        let A, H, sc = lerp(1.1, 0.82, p);
        if (v.k === 'mower') {
          g.bg('#6cc04a'); g.sky('#8fd8ff', '#e3f7ff', 360); g.cloud(220, 120, 0.6);
          for (const x of [120, 300, 760, 900]) tree(g, x, 370, 0.6, '#2f9a4a');
          g.band(360, 'bottom', '#6cc04a', 6);
          const run = s.k >= 2;
          const cut = run ? clamp(aj / 0.3) : 0;
          for (let i = 0; i < 14; i++) { const x = V.x0 + (V.x1 - V.x0) * i / 13, y = 420 + (i % 3) * 30; g.path(`M${x - 20} ${y} L${x - 10} ${y - 50} L${x} ${y - 10} L${x + 10} ${y - 60} L${x + 20} ${y}Z`, '#4fae3a', 0); }
          g.poly([300, 640, 700, 640, 860, V.y1 + 60, 140, V.y1 + 60], run ? '#8edc6a' : '#6cc04a', 0);
          for (const i of [-1, 1]) g.line([500 + i * 170, 600, 500 + i * 420, V.y1 + 60], C.dgray, 22);
          A = mower(g, 500, 560, 0.9, run, t);
          if (run) for (let i = 0; i < 3; i++) { const k2 = ((t * 2.5 + i / 3) % 1); g.alpha(0.6 * (1 - k2), () => g.circ(370 - 40 * k2, 470 - 160 * k2, 20 + 40 * k2, '#dfe3ea', 0)); }
          H = both ? [500, lerp(920, 640, p)] : [540, lerp(920, 640, p)];
          g.line([A[0], A[1] + 20, H[0], H[1] - 30 * sc], '#2b2140', 7);
          g.at(H[0], H[1] - 30 * sc, 0, sc, sc, () => g.rr(-70, -16, 140, 32, 16, C.black, 5));
        } else if (v.k === 'light') {
          const st = s.k;
          g.bg('#e9e2f5'); g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 130 - V.y0, '#f6f1fb', 0); g.line([V.x0 - 20, 130, V.x1 + 20, 130], '#cfc4e2', 6);
          g.rr(640, 260, 240, 260, 10, '#24305e', 7); g.circ(800, 330, 34, '#fff2b0', 0); for (const [sx, sy] of [[690, 300], [720, 420], [850, 460]]) g.star(sx, sy, 10, 4, 4, '#fff2b0', 0); g.line([760, 260, 760, 520], C.ol, 6);
          g.band(760, 'bottom', '#c9a77c', 6);
          g.rr(90, 600, 460, 200, 30, '#ffffff', 7); g.rr(90, 600, 460, 70, 30, '#9fc2ff', 0); g.rr(90, 600, 460, 200, 30, null, 7); g.rr(100, 540, 120, 90, 30, '#ffffff', 6);
          catBed(g, 340, 640, 0.9, st >= 2, t);
          if (st < 2) for (let i = 0; i < 2; i++) { const k2 = (t * 0.8 + i * 0.5) % 1; g.alpha(1 - k2, () => g.at(300 - 30 * k2, 540 - 80 * k2, 0, 0.8 + 0.5 * k2, 0.8 + 0.5 * k2, () => { g.line([-14, -14, 14, -14, -14, 14, 14, 14], C.ol, 12); g.line([-14, -14, 14, -14, -14, 14, 14, 14], '#ffffff', 6); })); }
          // 暗さ
          const dark = st === 0 ? 0.68 : st === 1 ? 0.32 * (1 - 0.3 * clamp(1 - aj / 0.2)) : 0.32 * (1 - clamp(aj / 0.1));
          if (dark > 0) g.alpha(dark, () => g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, st === 1 ? '#3a1d0a' : '#0b0a1f', 0));
          g.rect(490, V.y0 - 20, 20, 120 - V.y0, '#cfc4e2', 0);
          g.ell(500, 150, 170, 52, st === 0 ? '#d8d4e4' : st === 1 ? '#ffc777' : '#fffbe8');
          g.ell(500, 132, 120, 26, st === 0 ? '#eeeaf6' : '#ffffff', 0);
          if (st > 0) g.glow(500, 190, 360, st === 1 ? '#ffb347' : '#fff7d0', st === 1 ? 0.45 : 0.7);
          A = [500, 200];
          H = both ? [500, lerp(920, 620, p)] : [520, lerp(920, 620, p)];
          const yb = H[1] - 34 * sc;
          g.line([A[0], A[1], H[0], yb], '#5c6478', 5);
          g.at(H[0], yb, 0, sc, sc, () => { g.rr(-14, -30, 28, 50, 12, st ? C.yellow : '#ffffff', 4); });
        } else if (v.k === 'popper') {
          g.bg('#fff0f6'); g.stripes(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 780 - V.y0, 70, '#fff0f6', '#ffe2ee');
          pennants(g, 110, [C.red, C.yellow, C.blue, C.green, C.purple]);
          g.band(760, 'bottom', '#9fd9c2', 6);
          g.rr(600, 560, 280, 200, 20, '#ffe6b8', 6); g.rr(600, 560, 280, 50, 20, '#ff9fbd', 0); g.rr(600, 560, 280, 200, 20, null, 6);
          for (let i = 0; i < 4; i++) { g.rect(640 + i * 60, 500, 14, 60, ['#3a86ff', C.yellow, C.green, '#ff6b8b'][i], 4); g.path(`M${647 + i * 60} 478 q10 12 0 22 q-10 -10 0 -22 Z`, C.orange, 0); }
          const banner = s.k >= 2 ? E.outBack(clamp(aj / 0.3)) : 0;
          if (banner > 0) { g.at(500, 230 * banner - 40, 0, 1, 1, () => { g.line([-300, -30, -300, 30], C.ol, 5); g.line([300, -30, 300, 30], C.ol, 5); g.rr(-320, 0, 640, 110, 16, '#ffffff', 7); textU(g, ms, 'おめでとう', 0, 56, { size: 76, f: C.red, o: 0, font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); }); }
          for (const sl of s.my.sl || []) { const a = clamp((t - sl.t) / 0.45); g.curve([521, 500, lerp(521, sl.x, 0.5), lerp(500, sl.y, 0.5) - 120 * (1 - a), lerp(521, sl.x, a), lerp(500, sl.y, a) + 30 * Math.sin(a * 9 + sl.x)], sl.c, 8); }
          // コーン（左手で持つ）
          const kick = jig(aj, 0.12, 16, 6);
          g.at(430, 690, 0.45 + kick, 1, 1, () => { g.path('M-70 -210 L70 -210 L18 40 L-18 40 Z', '#ffd23f'); for (let i = 0; i < 3; i++) g.path(`M${-58 + i * 6} ${-150 + i * 70} L${58 - i * 6} ${-190 + i * 70} L${54 - i * 8} ${-160 + i * 70} L${-54 + i * 8} ${-120 + i * 70} Z`, '#ff5a5f', 0); g.path('M-70 -210 L70 -210 L18 40 L-18 40 Z', null); g.ell(0, -210, 70, 20, s.k ? '#ffeaa0' : '#ffffff', 6); });
          g.arm(400, 740, -PI / 2 + 0.55, { hand: 'grip', side: 'L', s: 1, sleeve: v.sleeve });
          A = [413, 726];
          H = [lerp(690, 470, p), lerp(930, 760, p)];
          g.curve([A[0], A[1], lerp(A[0], H[0], 0.5), lerp(A[1], H[1], 0.5) + 20 * p, H[0], H[1] - 30 * sc], C.ol, 5); g.curve([A[0], A[1], lerp(A[0], H[0], 0.5), lerp(A[1], H[1], 0.5) + 20 * p, H[0], H[1] - 30 * sc], '#ffffff', 2);
          g.at(H[0], H[1] - 30 * sc, 0, sc, sc, () => g.circ(0, 0, 14, C.red, 4));
        } else {   // bell
          g.bg('#3b2a20'); g.rect(V.x0 - 20, 60, V.x1 - V.x0 + 40, 900, '#4a3426', 0);
          for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) g.line([x, 260, x, 900], '#3a281c', 8);
          g.rect(V.x0 - 20, 40, V.x1 - V.x0 + 40, 50, '#c0392b', 0); g.line([V.x0 - 20, 90, V.x1 + 20, 90], C.ol, 6);
          g.curve([V.x0 - 20, 128, 500, 150, V.x1 + 20, 128], '#e9d49a', 26); g.curve([V.x0 - 20, 128, 500, 150, V.x1 + 20, 128], C.ol, 4);
          for (const x of [250, 750]) g.path(`M${x - 14} 140 l28 0 l-14 24 l18 0 l-18 28 l18 0 l-14 24 l-14 0 Z`, '#ffffff', 4);
          for (const [i, x] of [[0, 160], [1, 840]]) { const on = s.k > i; g.line([x, 140, x, 220], C.ol, 5); if (on) g.glow(x, 300, 160, '#ffb347', 0.6); g.ell(x, 300, 62, 80, on ? '#ff7a3a' : '#8a3a2a'); for (const yy of [260, 300, 340]) g.line([x - 56, yy, x + 56, yy], on ? '#d8402a' : '#6a2a20', 4); g.rr(x - 30, 214, 60, 18, 4, C.ol, 0); g.rr(x - 30, 370, 60, 18, 4, C.ol, 0); }
          g.band(840, 'bottom', '#6b4a2e', 6);
          g.rr(300, 760, 400, 160, 10, '#8a5a36', 7); for (let i = 0; i < 6; i++) g.rect(320 + i * 62, 776, 34, 50, '#5a3820', 0);
          textU(g, ms, '奉納', 500, 870, { size: 56, f: '#ffe08a', o: 0, font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
          if (s.k >= 2) g.glow(500, 240, 420, '#ffe27a', 0.55 * clamp(aj / 0.2));
          const pullD = (1 - p) * 18, sw = jig(aj, 0.35, 16, 4);
          g.at(500, 170 + pullD, sw, 1, 1, () => { g.line([0, -80, 0, -40], C.ol, 8); g.circ(0, 0, 84, C.gold); g.rect(-84, -6, 168, 12, sh(C.gold, -0.25), 0); g.rr(-50, 30, 100, 16, 8, C.ol, 0); g.circ(0, 0, 84, null); g.hl(-30, -36, 26, 14, -0.5, 0.6); });
          A = [500, 255 + pullD];
          H = [500, lerp(930, 640, p)];
          const ry = (alt ? lerp(930, 640, Math.min(pAlt('L'), pAlt('R'))) : H[1]) + 100;
          const P = ropePts(A[0], A[1], 500 + 30 * Math.sin(t * 2) * p, lerp(A[1], ry, 0.5), 500, ry, 22, 34);
          const L = [], R = []; for (const [x, y, nx, ny] of P) { L.push(x + nx, y + ny); R.unshift(x - nx, y - ny); }
          g.poly(L.concat(R), '#ffffff', 6);
          clipPoly(g, L.concat(R), () => { for (let i = -2; i < 30; i++) { const yy = A[1] + i * 34 + (p * 30) % 34; g.line([400, yy, 600, yy + 90], i % 3 === 0 ? '#c0392b' : i % 3 === 1 ? '#8e44ad' : '#ffffff', 20); } });
          g.poly(L.concat(R), null, 6);
          g.at(500, ry, 0, sc, sc, () => { g.rr(-40, -10, 80, 26, 8, '#c0392b', 5); for (let i = -3; i <= 3; i++) g.line([i * 11, 16, i * 13, 120], '#c0392b', 9); });
        }
        // 手
        if (v.k !== 'popper') {
          if (alt) {   // たぐる：両手が交互に（遠い手から描く）
            const hs = ['L', 'R'].map(side => ({ side, p: pAlt(side) })).sort((a, b) => b.p - a.p);
            for (const h of hs) { const sg = h.side === 'L' ? -1 : 1; g.arm(500 + sg * 4, lerp(930, 640, h.p), -PI / 2 - sg * lerp(0.95, 0.5, h.p), { hand: 'grip', side: h.side, s: lerp(1.1, 0.82, h.p), sleeve: v.sleeve }); }
          } else if (both) {
            if (v.k === 'light' || v.k === 'bell') {
              g.arm(H[0] - 4, H[1] - lerp(150, 120, p), -PI / 2 + lerp(0.95, 0.5, p), { hand: 'grip', side: 'L', s: sc * 0.95, sleeve: v.sleeve });
              g.arm(H[0] + 4, H[1], -PI / 2 - lerp(0.95, 0.5, p), { hand: 'grip', side: 'R', s: sc, sleeve: v.sleeve });
            } else for (const side of ['L', 'R']) { const sg = side === 'L' ? -1 : 1; g.arm(H[0] + sg * 46 * sc, H[1] - 10, -PI / 2 - sg * lerp(0.7, 0.35, p), { hand: 'grip', side, s: sc, sleeve: v.sleeve }); }
          } else g.arm(H[0] + 6, H[1], -PI / 2 - lerp(0.8, 0.4, p), { hand: 'grip', side: 'R', s: sc, sleeve: v.sleeve });
        } else g.arm(H[0] + 6, H[1], -PI / 2 - lerp(1.1, 0.5, p), { hand: 'pinch', side: 'R', s: sc, sleeve: v.sleeve });
      });
    },
    hit(g, s, k, v) {
      const side = s.mode === 'both' ? 'R' : s.lastSide, X = x => g.mx(side, x);
      if (v.k === 'mower') {
        if (k === 1) { g.fx.smoke(X(380), 470, 5, '#6a6f80'); g.fx.pop('プスン', X(250), 280, { size: 100 }); g.fx.shake(6, 0.12); }
        else { g.fx.burst(500, 640, { n: 24, c: ['#4fae3a', '#8edc6a', '#2e7d32'], shape: 'leaf', sp: [300, 800], size: [12, 22], g: 900, spread: 2.4 }); g.fx.smoke(X(380), 470, 8, '#dfe3ea'); g.fx.pop('ブルルン！', 500, 230, { size: 120, c: C.yellow }); g.fx.shake(12, 0.25); }
      } else if (v.k === 'light') {
        if (k === 1) { g.fx.pop('カチッ', X(250), 330, { size: 90, c: '#ffe08a' }); g.fx.shake(4, 0.08); }
        else { g.fx.flash('#ffffff', 0.6, 0.18); g.fx.pop('ニャッ！', X(330), 400, { size: 110, c: C.yellow }); g.fx.lines(X(340), 520, { n: 10, r0: 120, r1: 220, w: 10 }); g.sfx('meow'); }
      } else if (v.k === 'popper') {
        const dir = -PI / 2 + 0.45 * (s.lastSide === 'L' ? -1 : 1);
        g.fx.burst(X(521), 500, { n: k === 2 ? 34 : 26, c: [C.red, C.yellow, C.blue, C.green, C.pink, C.purple], shape: 'conf', sp: [500, 1100], size: [14, 26], g: 700, dir, spread: 1.0, drag: 0.96, life: [0.9, 1.4] });
        s.my.sl = s.my.sl || []; for (let i = 0; i < 4; i++) s.my.sl.push({ t: s.t, x: 200 + i * 120 + s.r() * 60, y: 200 + s.r() * 200, c: [C.red, C.blue, C.yellow, C.green][i] });
        g.fx.pop(k === 1 ? 'パン！' : 'パパーン！', X(k === 1 ? 260 : 310), k === 1 ? 300 : 440, { size: k === 1 ? 100 : 90, c: C.yellow }); g.fx.shake(8, 0.12);
        if (k === 2) g.fx.confetti(40);
      } else {
        g.fx.ring(500, 170, { r0: 90, r1: 320, w: 12, c: '#ffe27a' }); g.fx.pop('ガラン', 250, 330, { size: 100, c: '#ffe08a' });
        if (k === 2) { g.fx.stars(500, 260, 10); g.fx.pop('大吉！', 700, 470, { size: 110, c: C.red }); }
        g.fx.shake(6, 0.12);
      }
    },
  },

  /* ---------------- 6. 弓 ---------------- */
  {
    id: 'pull-bow', acts: ['pull'], modes: ['one'], vars: BOWS,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.ar = []; },
    draw(g, s, v) {
      const V = g.V, p = s.p, t = s.t, aj = s.k ? s.age : 9, kyu = v.k === 'kyudo';
      pulled(s);
      const hold = (s.my.q || 0) > 0.02 || (s.k === 0 && p < 0.97);
      g.mirror(s.side, () => {
        const bump = jig(aj, 8, 22, 8);
        if (kyu) {
          g.bg('#7cc46a'); g.sky('#9fd8ff', '#e6f6ff', 300);
          g.rect(V.x0 - 20, 250, V.x1 - V.x0 + 40, 50, '#6a7184', 0); g.line([V.x0 - 20, 300, V.x1 + 20, 300], C.ol, 5);
          g.rect(V.x0 - 20, 300, V.x1 - V.x0 + 40, 240, '#d9c49a', 0);
          g.band(540, 'bottom', '#7cc46a'); g.line([V.x0 - 20, 540, V.x1 + 20, 540], '#5fa852', 6);
          for (const x of [TG[0] - 330, TG[0] + 330]) { g.circ(x, 410, 62, '#ffffff', 5); g.ring(x, 410, 46, C.black, 12); g.circ(x, 410, 14, C.black, 0); }
          g.at(TG[0], TG[1] + bump, () => { g.circ(0, 0, 130, '#ffffff', 7); g.ring(0, 0, 104, C.black, 24); g.ring(0, 0, 60, C.black, 18); g.circ(0, 0, 24, C.black, 0); });
          g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 110 - V.y0, '#4a3426', 0); for (let y = 40; y > V.y0 - 60; y -= 110) g.rect(V.x0 - 20, y, V.x1 - V.x0 + 40, 18, '#5c4230', 0); g.rect(V.x0 - 20, 90, V.x1 - V.x0 + 40, 22, '#2b2140', 0);
          g.band(830, 'bottom', '#d39457', 6); for (let x = Math.floor(V.x0 / 110) * 110; x < V.x1; x += 110) g.line([x, 830, x - 30, V.y1 + 60], sh('#d39457', -0.2), 4);
        } else {
          g.bg('#ffd6a8'); g.stripes(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 760 - V.y0, 60, '#ffe1ef', '#ffd2e5');
          pennants(g, 120, [C.red, C.yellow, C.blue, C.green]);
          g.rr(170, 210, 520, 380, 20, '#7a4a2a', 7); g.rr(190, 230, 480, 340, 12, '#ffcf7a', 0); g.rr(190, 230, 480, 60, 12, '#ffbf5a', 0);
          g.band(760, 'bottom', '#5c6478', 6); g.rect(V.x0 - 20, 760, V.x1 - V.x0 + 40, 24, '#ffd23f', 0);
          if (s.k >= 2) { const a = E.outBack(clamp(aj / 0.3)); g.at(TG[0], TG[1] + 40 - 30 * a, 0, a, a, () => { g.circ(0, 0, 74, '#c98b52'); g.circ(-54, -60, 26, '#c98b52'); g.circ(54, -60, 26, '#c98b52'); g.circ(-54, -60, 12, '#f2d0a4', 0); g.circ(54, -60, 12, '#f2d0a4', 0); g.ell(0, 20, 32, 24, '#f2d0a4', 0); g.circ(-26, -12, 8, C.ol, 0); g.circ(26, -12, 8, C.ol, 0); g.ell(0, 10, 11, 8, C.ol, 0); g.path('M-12 30 Q0 40 12 30', null, 5); g.rr(-30, 66, 60, 20, 8, C.red, 4); }); }
          BAL.forEach(([bx, by, r, c], i) => {
            if ((i === 1 && s.k >= 1) || (i === 2 && s.k >= 2)) return;
            const bob = Math.sin(t * 3 + i) * 5;
            g.line([bx, by + r + bob, bx + 6, by + r + 40], C.ol, 3);
            g.ell(bx, by + bob, r, r * 1.18, c); g.tri(bx - 8, by + r * 1.18 + bob, bx + 8, by + r * 1.18 + bob, bx, by + r * 1.18 + 12 + bob, c, 4); g.hl(bx - r * 0.3, by - r * 0.4 + bob, r * 0.2, r * 0.32, -0.4, 0.55);
          });
        }
        // 飛んでいく矢・刺さった矢
        for (const a of s.my.ar) {
          const f = clamp((t - a.t) / 0.16);
          if (f >= 1 && !a.stay) continue;
          const x = lerp(GX - 10, a.x, E.outQ(f)), y = lerp(GY - 30, a.y + (f >= 1 ? bump : 0), E.outQ(f)), sc = lerp(1, 0.5, f);
          g.at(x, y, Math.atan2(915 - TG[1], 770 - TG[0]), sc, sc, () => {
            g.line([0, 0, 150, 0], C.ol, 14); g.line([0, 0, 150, 0], kyu ? '#e9d3a4' : C.yellow, 8);
            g.tri(118, 0, 160, -22, 150, 0, '#ffffff', 4); g.tri(118, 0, 160, 22, 150, 0, kyu ? '#2b2140' : C.red, 4);
          });
        }
        // 弓
        const topY = kyu ? -80 : 300, botY = kyu ? 1160 : 950, bc = kyu ? '#5a3a22' : '#ff5a8a';
        const nx = lerp(770, 602, p), ny = lerp(915, 652, p), sc = lerp(1.1, 0.84, p);
        const [sx, sy] = hold ? [nx - 26 * sc, ny - 40 * sc] : [GX + 20, GY];
        g.curve([GX + 16, topY, GX - 4, lerp(topY, GY, 0.5), GX, GY, GX - 4, lerp(GY, botY, 0.5), GX + 16, botY], C.ol, kyu ? 26 : 30);
        g.curve([GX + 16, topY, GX - 4, lerp(topY, GY, 0.5), GX, GY, GX - 4, lerp(GY, botY, 0.5), GX + 16, botY], bc, kyu ? 14 : 18);
        g.line([GX + 18, topY, sx, sy, GX + 18, botY], C.ol, 7); g.line([GX + 18, topY, sx, sy, GX + 18, botY], '#ffffff', 3);
        g.arm(GX - 8, GY + 34, -PI / 2 + 0.5, { hand: 'grip', side: 'L', s: 0.92, sleeve: kyu ? '#f4f4f4' : '#3a86ff' });
        if (hold) {
          const dx = TG[0] - sx, dy = TG[1] - sy, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, L = Math.hypot(GX - sx, GY - sy) + 70, ex = sx + ux * L, ey = sy + uy * L;
          g.line([sx, sy, ex, ey], C.ol, 16); g.line([sx, sy, ex, ey], kyu ? '#e9d3a4' : C.yellow, 9);
          g.tri(ex + ux * 30, ey + uy * 30, ex - uy * 13, ey + ux * 13, ex + uy * 13, ey - ux * 13, kyu ? '#5c6478' : C.red, 4);
          g.at(sx, sy, Math.atan2(uy, ux), 1, 1, () => { g.tri(6, 0, 86, -30, 70, 0, '#ffffff', 4); g.tri(6, 0, 86, 30, 70, 0, kyu ? '#2b2140' : '#ff5a8a', 4); });
        }
        g.arm(nx, ny, -PI / 2 - lerp(1.1, 0.55, p), { hand: 'pinch', side: 'R', s: sc, sleeve: kyu ? '#f4f4f4' : '#3a86ff' });
      });
    },
    hit(g, s, k, v) {
      const kyu = v.k === 'kyudo';
      const [hx, hy] = kyu ? (k === 1 ? [TG[0] - 62, TG[1] + 52] : TG) : k === 1 ? BAL[1] : BAL[2];
      s.my.ar.push({ t: s.t, x: hx, y: hy, stay: kyu });
      const X = g.mx(s.lastSide, hx);
      if (kyu) {
        if (k === 1) { g.fx.pop('タン', g.mx(s.lastSide, 760), 250, { size: 100 }); g.fx.lines(X, hy, { n: 8, r0: 60, r1: 140, w: 8 }); }
        else { g.fx.pop('命中！', g.mx(s.lastSide, 700), 220, { size: 130, c: C.yellow }); g.fx.stars(X, hy, 12); g.fx.ring(X, hy, { r1: 240 }); g.sfx('cheer'); }
      } else {
        g.fx.burst(X, hy, { n: 24, c: k === 1 ? [C.blue, '#ffffff'] : [C.yellow, C.orange, '#ffffff'], shape: 'conf', sp: [300, 700], size: [14, 24], g: 700 });
        g.fx.pop(k === 1 ? 'パーン' : 'あたり！', g.mx(s.lastSide, k === 1 ? 750 : 600), k === 1 ? 250 : 150, { size: k === 1 ? 100 : 120, c: k === 2 ? C.yellow : '#ffffff' });
        if (k === 2) { g.fx.confetti(50); g.sfx('ding'); }
      }
      g.fx.shake(k === 2 ? 9 : 6, 0.12);
    },
  },
];
